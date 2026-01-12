import React, { useState } from 'react';
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

// Placeholder for the voice UI
const VoiceChannelUI: React.FC<{
  channel: Channel;
  localStream: MediaStream | null;
  remoteStreams: MediaStream[];
  leaveVoiceChannel: () => void;
}> = ({ channel, localStream, remoteStreams, leaveVoiceChannel }) => {
  return (
    <div className="voice-ui">
      <h3>In Voice Channel: {channel.name}</h3>
      <button onClick={leaveVoiceChannel}>Leave Voice</button>
      <div className="voice-streams">
        {localStream && <audio autoPlay muted playsInline srcObject={localStream} />}
        {remoteStreams.map((stream, index) => (
          <audio key={index} autoPlay playsInline srcObject={stream} />
        ))}
      </div>
    </div>
  );
};


const HomePage: React.FC = () => {
  const [activeTextChannel, setActiveTextChannel] = useState<Channel | null>(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<Channel | null>(null);

  const { localStream, remoteStreams } = useWebRTC(activeVoiceChannel);

  const leaveVoice = () => {
    setActiveVoiceChannel(null);
  };

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
        {activeVoiceChannel && (
          <VoiceChannelUI 
            channel={activeVoiceChannel}
            localStream={localStream}
            remoteStreams={remoteStreams}
            leaveVoiceChannel={leaveVoice}
          />
        )}
        <LogoutButton />
      </div>
      <UserList />
    </div>
  );
};

export default HomePage;
