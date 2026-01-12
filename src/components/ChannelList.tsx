import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { firestore } from '../firebase';
import { useAdmin } from '../hooks/useAdmin';
import AddChannelForm from './AddChannelForm';
import type { Channel } from '../pages/HomePage'; // Import Channel interface

interface ChannelListProps {
  setActiveTextChannel: (channel: Channel) => void;
  joinVoiceChannel: (channel: Channel) => void;
}

const ChannelList: React.FC<ChannelListProps> = ({ setActiveTextChannel, joinVoiceChannel }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const { isAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    const channelsCollection = collection(firestore, 'channels');
    
    const unsubscribe = onSnapshot(channelsCollection, (snapshot) => {
      const channelsData = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        name: doc.data().name,
        type: doc.data().type || 'text', // default to text if no type
      }));
      setChannels(channelsData);
      
      const textChannels = channelsData.filter(c => c.type === 'text');
      if (textChannels.length > 0) {
        setActiveTextChannel(textChannels[0]);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [setActiveTextChannel]);

  const handleChannelClick = (channel: Channel) => {
    if (channel.type === 'text') {
      setActiveTextChannel(channel);
    } else if (channel.type === 'voice') {
      joinVoiceChannel(channel);
    }
  };

  return (
    <div className="channel-list">
      <h3>Channels</h3>
      {!adminLoading && isAdmin && <AddChannelForm />}
      <ul>
        {channels.map((channel) => (
          <li key={channel.id} onClick={() => handleChannelClick(channel)}>
            {channel.type === 'text' ? '# ' : '🔊 '}
            {channel.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChannelList;


