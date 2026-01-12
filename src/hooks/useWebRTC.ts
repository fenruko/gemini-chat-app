import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, off, set, onChildAdded, onChildRemoved, remove, push } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from './useAuth';
import type { Channel } from '../pages/HomePage';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

export function useWebRTC(voiceChannel: Channel | null, micId: string | null) {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, {stream: MediaStream, user: any}>>(new Map());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  }, [localStream]);

  // 1. Get User Media
  useEffect(() => {
    const getMedia = async () => {
      if (voiceChannel && user) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: micId ? { deviceId: { exact: micId } } : true,
            video: false,
          });
          setLocalStream(stream);
        } catch (error) {
          console.error('Error accessing media devices.', error);
        }
      }
    };

    getMedia();

    // Cleanup function
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      setRemoteStreams(new Map());
      if (voiceChannel && user) {
        const currentUserRef = ref(database, `rooms/${voiceChannel.id}/users/${user.uid}`);
        remove(currentUserRef);
      }
    };
  }, [voiceChannel, user, micId]);


  // 2. Signaling Logic
  useEffect(() => {
    if (!localStream || !voiceChannel || !user) return;

    const usersRef = ref(database, `rooms/${voiceChannel.id}/users`);
    const currentUserRef = ref(database, `rooms/${voiceChannel.id}/users/${user.uid}`);
    set(currentUserRef, { uid: user.uid, email: user.email });

    const listeners: Array<() => void> = [];

    const onNewUser = onChildAdded(usersRef, async (snapshot) => {
      const remoteUser = snapshot.val();
      if (remoteUser.uid === user.uid || peerConnections.current.has(remoteUser.uid)) return;
      
      const pc = new RTCPeerConnection(servers);
      peerConnections.current.set(remoteUser.uid, pc);
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      
      pc.ontrack = (event) => setRemoteStreams(prev => new Map(prev).set(remoteUser.uid, {stream: event.streams[0], user: remoteUser}));
      
      const candidatesRef = ref(database, `rooms/${voiceChannel.id}/candidates/${user.uid}/${remoteUser.uid}`);
      pc.onicecandidate = e => e.candidate && push(candidatesRef, e.candidate.toJSON());
      
      const remoteCandidatesRef = ref(database, `rooms/${voiceChannel.id}/candidates/${remoteUser.uid}/${user.uid}`);
      const iceListener = onChildAdded(remoteCandidatesRef, s => pc.addIceCandidate(new RTCIceCandidate(s.val())));
      listeners.push(() => off(remoteCandidatesRef, 'child_added', iceListener));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await set(ref(database, `rooms/${voiceChannel.id}/offers/${remoteUser.uid}/${user.uid}`), { sdp: offer.sdp, type: offer.type });
    });

    const offersRef = ref(database, `rooms/${voiceChannel.id}/offers/${user.uid}`);
    const offerListener = onChildAdded(offersRef, async (snapshot) => {
        const remoteUserId = snapshot.key;
        if (!remoteUserId || peerConnections.current.has(remoteUserId)) return;
        
        const pc = new RTCPeerConnection(servers);
        peerConnections.current.set(remoteUserId, pc);
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        
        // We don't have the full remoteUser object here, so we'll have to get it.
        const remoteUserRef = ref(database, `rooms/${voiceChannel.id}/users/${remoteUserId}`);
        const remoteUserSnapshot = await get(remoteUserRef);
        const remoteUser = remoteUserSnapshot.val();

        pc.ontrack = (event) => setRemoteStreams(prev => new Map(prev).set(remoteUserId, {stream: event.streams[0], user: remoteUser}));
        
        const candidatesRef = ref(database, `rooms/${voiceChannel.id}/candidates/${user.uid}/${remoteUserId}`);
        pc.onicecandidate = e => e.candidate && push(candidatesRef, e.candidate.toJSON());
        
        const remoteCandidatesRef = ref(database, `rooms/${voiceChannel.id}/candidates/${remoteUserId}/${user.uid}`);
        const iceListener = onChildAdded(remoteCandidatesRef, s => pc.addIceCandidate(new RTCIceCandidate(s.val())));
        listeners.push(() => off(remoteCandidatesRef, 'child_added', iceListener));
        
        await pc.setRemoteDescription(snapshot.val());
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await set(ref(database, `rooms/${voiceChannel.id}/answers/${remoteUserId}/${user.uid}`), { sdp: answer.sdp, type: answer.type });
        
        remove(snapshot.ref);
    });
    
    const answersRef = ref(database, `rooms/${voiceChannel.id}/answers/${user.uid}`);
    const answerListener = onChildAdded(answersRef, async (snapshot) => {
        const remoteUserId = snapshot.key;
        if (!remoteUserId) return;
        const pc = peerConnections.current.get(remoteUserId);
        if (pc && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(snapshot.val());
        }
        remove(snapshot.ref);
    });

    const onUserLeft = onChildRemoved(usersRef, (snapshot) => {
        const remoteUserId = snapshot.key;
        if(!remoteUserId) return;
        peerConnections.current.get(remoteUserId)?.close();
        peerConnections.current.delete(remoteUserId);
        setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(remoteUserId);
            return newStreams;
        });
    });

    return () => {
        off(usersRef, 'child_added', onNewUser);
        off(usersRef, 'child_removed', onUserLeft);
        off(offersRef, 'child_added', offerListener);
        off(answersRef, 'child_added', answerListener);
        listeners.forEach(cleanupFunc => cleanupFunc());
        remove(currentUserRef);
    };
    
  }, [localStream, user, voiceChannel]);

  return { localStream, remoteStreams: Array.from(remoteStreams.values()), isMuted, toggleMute };
}
