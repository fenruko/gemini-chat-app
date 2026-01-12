import React, { useState, useCallback, useRef, useEffect } from 'react';
import ChannelList from '../components/ChannelList';
import ChatWindow from '../components/ChatWindow';
import UserList from '../components/UserList';
import LogoutButton from '../components/LogoutButton';
import { useWebRTC } from '../hooks/useWebRTC';
import './HomePage.css';

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

const AudioStream: React.FC<{ stream: MediaStream, isMuted: boolean }> = ({ stream, isMuted }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      audioRef.current.muted = isMuted;
    }
  }, [stream, isMuted]);
  return <audio ref={audioRef} autoPlay playsInline />;
};

const VoiceChannelUI: React.FC<{
  channel: Channel;
  isMuted: boolean;
  toggleMute: () => void;
  isDeafened: boolean;
  toggleDeafen: () => void;
  leaveVoiceChannel: () => void;
}> = ({ channel, isMuted, toggleMute, isDeafened, toggleDeafen, leaveVoiceChannel }) => {
  return (
    <div className="voice-ui">
      <h3>Voice Connected</h3>
      <p>{channel.name}</p>
      <div className="voice-controls">
        <button onClick={toggleMute}>{isMuted ? '🎤 Unmute' : '🎤 Mute'}</button>
        <button onClick={toggleDeafen}>{isDeafened ? '🎧 Un-deafen' : '🎧 Deafen'}</button>
        <button onClick={leaveVoiceChannel} className="leave-btn">Leave</button>
      </div>
    </div>
  );
};


const HomePage: React.FC = () => {
  const [activeTextChannel, setActiveTextChannel] = useState<Channel | null>(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<Channel | null>(null);
  const [isDeafened, setIsDeafened] = useState(false);

  const { localStream, remoteStreams, isMuted, toggleMute } = useWebRTC(activeVoiceChannel);

  const leaveVoice = () => {
    setActiveVoiceChannel(null);
  };
  
  const toggleDeafen = useCallback(() => {
    setIsDeafened(d => !d);
  }, []);

  return (
    <div className="home-page">
      <ChannelList 
        setActiveTextChannel={setActiveTextChannel} 
        joinVoiceChannel={setActiveVoiceChannel} 
      />
      <div className="chat-area">
        {activeTextChannel ? (
          <ChatWindow activeChannel={activeTextChannel} />
        ) : (
          <div className="select-channel-prompt">
            <h2>Select a text channel</h2>
          </div>
        )}
        <div className="bottom-area">
          {activeVoiceChannel && (
            <VoiceChannelUI 
              channel={activeVoiceChannel}
              isMuted={isMuted}
              toggleMute={toggleMute}
              isDeafened={isDeafened}
              toggleDeafen={toggleDeafen}
              leaveVoiceChannel={leaveVoice}
            />
          )}
          <LogoutButton />
        </div>
      </div>
      <UserList />
      <div className="remote-audio-container">
        {localStream && <AudioStream stream={localStream} isMuted={true} />}
        {remoteStreams.map((stream) => (
          <AudioStream key={stream.id} stream={stream} isMuted={isDeafened} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;
