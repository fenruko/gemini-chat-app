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

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

const AudioStream: React.FC<{ stream: MediaStream, isMuted: boolean, speakerId: string | null }> = ({ stream, isMuted, speakerId }) => {
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

const VoiceChannelUI: React.FC<{
  channel: Channel;
  isMuted: boolean;
  toggleMute: () => void;
  isDeafened: boolean;
  toggleDeafen: () => void;
  leaveVoiceChannel: () => void;
  onMicChange: (id: string) => void;
  onSpeakerChange: (id: string) => void;
}> = ({ channel, isMuted, toggleMute, isDeafened, toggleDeafen, leaveVoiceChannel, onMicChange, onSpeakerChange }) => {
  return (
    <div className="voice-ui">
      <div className='voice-info'>
        <h3>Voice Connected</h3>
        <p>{channel.name}</p>
      </div>
      <DeviceSettings onMicChange={onMicChange} onSpeakerChange={onSpeakerChange} />
      <div className="voice-controls">
        <button onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>{isMuted ? '🎤' : '🤫'}</button>
        <button onClick={toggleDeafen} title={isDeafened ? 'Undeafen' : 'Deafen'}>{isDeafened ? '🎧' : '🔇'}</button>
        <button onClick={leaveVoiceChannel} className="leave-btn" title="Leave Channel">❌</button>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const [activeTextChannel, setActiveTextChannel] = useState<Channel | null>(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<Channel | null>(null);
  const [isDeafened, setIsDeafened] = useState(false);
  const [micId, setMicId] = useState<string | null>(null);
  const [speakerId, setSpeakerId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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
        {localStream && <AudioStream stream={localStream} isMuted={true} speakerId={speakerId} />}
        {remoteStreams.map(({ stream, user }) => (
          <AudioStream key={user.uid} stream={stream} isMuted={isDeafened} speakerId={speakerId} />
        ))}
      </div>
      {activeVoiceChannel && (
        <div className="voice-users">
          <h3>In Voice Channel</h3>
          <ul>
            {remoteStreams.map(({ user }) => (
              <li key={user.uid}>
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
