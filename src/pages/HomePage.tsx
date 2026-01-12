import React, { useState, useCallback, useRef, useEffect } from 'react';
import ChannelList from '../components/ChannelList';
import ChatWindow from '../components/ChatWindow';
import UserList from '../components/UserList';
import LogoutButton from '../components/LogoutButton';
import UserSettings from '../components/UserSettings';
import { useWebRTC } from '../hooks/useWebRTC';
import DeviceSettings from '../components/DeviceSettings';
import './HomePage.css';

// ... (interface Channel)

const AudioStream: React.FC<{ stream: MediaStream, isMuted: boolean, speakerId: string | null, user: any }> = ({ stream, isMuted, speakerId, user }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.srcObject = stream;
      audio.muted = isMuted;
      // Set output device
      if (speakerId && (audio as any).setSinkId) {
        (audio as any).setSinkId(speakerId);
      }
      // Attempt to play audio
      audio.play().catch(error => console.error("Audio play failed:", error));
    }
  }, [stream, isMuted, speakerId]);
  return <audio ref={audioRef} autoPlay playsInline />;
};

// ... (VoiceChannelUI component)

const HomePage: React.FC = () => {
  const [activeTextChannel, setActiveTextChannel] = useState<Channel | null>(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<Channel | null>(null);
  const [isDeafened, setIsDeafened] = useState(false);
  const [micId, setMicId] = useState<string | null>(null);
  const [speakerId, setSpeakerId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);

  const { localStream, remoteStreams, isMuted, toggleMute } = useWebRTC(activeVoiceChannel, micId);

  const leaveVoice = () => setActiveVoiceChannel(null);
  const toggleDeafen = useCallback(() => setIsDeafened(d => !d), []);

  return (
    <div className="home-page">
      <ChannelList
        setActiveTextChannel={setActiveTextChannel}
        joinVoiceChannel={setActiveVoiceChannel}
      />
      <div className="chat-area">
        {showSettings ? <UserSettings /> : activeTextChannel ? <ChatWindow activeChannel={activeTextChannel} /> : <div className="select-channel-prompt"><h2>Select a text channel</h2></div>}
        <div className="bottom-area">
          {activeVoiceChannel && (
            <VoiceChannelUI
              channel={activeVoiceChannel}
              isMuted={isMuted}
              toggleMute={toggleMute}
              isDeafened={isDeafened}
              toggleDeafen={toggleDeafen}
              leaveVoiceChannel={leaveVoice}
              onMicChange={setMicId}
              onSpeakerChange={setSpeakerId}
            />
          )}
          <button onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? 'Close Settings' : 'Settings'}
          </button>
          <LogoutButton />
        </div>
      </div>
      <UserList />
      <div className="remote-audio-container">
        {localStream && <AudioStream stream={localStream} isMuted={true} speakerId={speakerId} user={{email: 'local'}}/>}
        {remoteStreams.map(({ stream, user }) => (
          <AudioStream key={user.uid} stream={stream} isMuted={isDeafened} speakerId={speakerId} user={user} />
        ))}
      </div>
      {activeVoiceChannel && (
        <div className="voice-users">
          <h3>In Voice Channel</h3>
          <ul>
            {remoteStreams.map(({ user }) => (
              <li key={user.uid} className={speaking === user.uid ? 'speaking' : ''}>
                {user.email}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HomePage;
