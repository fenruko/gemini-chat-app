import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { firestore } from '../firebase';

const AddChannelForm: React.FC = () => {
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!channelName.trim()) {
      setError('Channel name cannot be empty.');
      return;
    }

    try {
      await addDoc(collection(firestore, 'channels'), {
        name: channelName,
        type: channelType,
      });
      setChannelName('');
    } catch (err: any) {
      setError('Failed to create channel.');
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={channelName}
        onChange={(e) => setChannelName(e.target.value)}
        placeholder="New channel name"
      />
      <select value={channelType} onChange={(e) => setChannelType(e.target.value as 'text' | 'voice')}>
        <option value="text">Text</option>
        <option value="voice">Voice</option>
      </select>
      <button type="submit">+ Add</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
};

export default AddChannelForm;
