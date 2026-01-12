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
  ],
};

export function useWebRTC(voiceChannel: Channel | null) {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const roomRef = useRef(voiceChannel ? ref(database, `rooms/${voiceChannel.id}`) : null);

  const voiceChannelRef = useRef(voiceChannel);
  useEffect(() => {
    voiceChannelRef.current = voiceChannel;
  }, [voiceChannel]);

  const cleanup = useCallback(() => {
    if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
    }
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
    setLocalStream(null);

    const lastChannel = voiceChannelRef.current;
    if(roomRef.current && user && lastChannel) {
        remove(ref(database, `rooms/${lastChannel.id}/users/${user.uid}`));
    }
  }, [user, localStream]);


  // 1. Get User Media
  useEffect(() => {
    if (voiceChannel && user) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          setLocalStream(stream);
        })
        .catch(error => console.error('Error accessing media devices.', error));
    } else {
        cleanup();
    }
    return cleanup;
  }, [voiceChannel, user, cleanup]);


  // 2. Signaling Logic
  useEffect(() => {
    if (!localStream || !voiceChannel || !user) return;

    roomRef.current = ref(database, `rooms/${voiceChannel.id}`);
    const usersRef = ref(database, `rooms/${voiceChannel.id}/users`);
    const currentUserRef = ref(database, `rooms/${voiceChannel.id}/users/${user.uid}`);
    set(currentUserRef, { uid: user.uid, email: user.email });

    // Listen for new users
    const onNewUser = onChildAdded(usersRef, async (snapshot) => {
      const remoteUser = snapshot.val();
      if (remoteUser.uid === user.uid) return;

      console.log(`New user joined: ${remoteUser.uid}`);
      const pc = new RTCPeerConnection(servers);
      peerConnections.current.set(remoteUser.uid, pc);

      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      pc.ontrack = (event) => {
        setRemoteStreams(prev => new Map(prev).set(remoteUser.uid, event.streams[0]));
      };

      // ICE Candidates
      const candidatesRef = ref(database, `rooms/${voiceChannel.id}/candidates/${user.uid}/${remoteUser.uid}`);
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          push(candidatesRef, event.candidate.toJSON());
        }
      };
      const remoteCandidatesRef = ref(database, `rooms/${voiceChannel.id}/candidates/${remoteUser.uid}/${user.uid}`);
      onChildAdded(remoteCandidatesRef, (candidateSnapshot) => {
        const candidate = new RTCIceCandidate(candidateSnapshot.val());
        pc.addIceCandidate(candidate);
      });

      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const offerRef = ref(database, `rooms/${voiceChannel.id}/offers/${remoteUser.uid}/${user.uid}`);
      set(offerRef, { sdp: offer.sdp, type: offer.type });
    });

    // Listen for offers
    const offersRef = ref(database, `rooms/${voiceChannel.id}/offers/${user.uid}`);
    onChildAdded(offersRef, async (snapshot) => {
        const remoteUserId = snapshot.key;
        if(!remoteUserId) return;

        console.log(`Received offer from: ${remoteUserId}`);
        const pc = new RTCPeerConnection(servers);
        peerConnections.current.set(remoteUserId, pc);

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        pc.ontrack = (event) => {
            setRemoteStreams(prev => new Map(prev).set(remoteUserId, event.streams[0]));
        };

        const candidatesRef = ref(database, `rooms/${voiceChannel.id}/candidates/${user.uid}/${remoteUserId}`);
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                push(candidatesRef, event.candidate.toJSON());
            }
        };
        const remoteCandidatesRef = ref(database, `rooms/${voiceChannel.id}/candidates/${remoteUserId}/${user.uid}`);
        onChildAdded(remoteCandidatesRef, (candidateSnapshot) => {
            const candidate = new RTCIceCandidate(candidateSnapshot.val());
            pc.addIceCandidate(candidate);
        });

        await pc.setRemoteDescription(snapshot.val());
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const answerRef = ref(database, `rooms/${voiceChannel.id}/answers/${remoteUserId}/${user.uid}`);
        set(answerRef, { sdp: answer.sdp, type: answer.type });
    });
    
    // Listen for answers
    const answersRef = ref(database, `rooms/${voiceChannel.id}/answers/${user.uid}`);
    onChildAdded(answersRef, async (snapshot) => {
        const remoteUserId = snapshot.key;
        if(!remoteUserId) return;

        console.log(`Received answer from: ${remoteUserId}`);
        const pc = peerConnections.current.get(remoteUserId);
        if (pc && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(snapshot.val());
        }
    });

    // Listen for users leaving
    const onUserLeft = onChildRemoved(usersRef, (snapshot) => {
        const remoteUserId = snapshot.key;
        if(!remoteUserId) return;

        console.log(`User left: ${remoteUserId}`);
        peerConnections.current.get(remoteUserId)?.close();
        peerConnections.current.delete(remoteUserId);
        setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(remoteUserId);
            return newStreams;
        });
    });


    return () => {
        // Detach all listeners
        off(usersRef, 'child_added', onNewUser);
        off(usersRef, 'child_removed', onUserLeft);
        off(offersRef, 'child_added');
        off(answersRef, 'child_added');
        // And remove self from room
        remove(currentUserRef);
    };

  }, [localStream, voiceChannel, user]);

  return { localStream, remoteStreams: Array.from(remoteStreams.values()) };
}
