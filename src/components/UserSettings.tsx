import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '../firebase';
import { useAuth } from '../hooks/useAuth';

const UserSettings: React.FC = () => {
  const { user } = useAuth();
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setNewUsername(userData.username);
          if (userData.usernameLastChanged) {
            const now = Timestamp.now();
            const diff = now.seconds - userData.usernameLastChanged.seconds;
            const cooldownSeconds = 24 * 60 * 60;
            if (diff < cooldownSeconds) {
              setCooldown(cooldownSeconds - diff);
            }
          }
        }
      }
    };
    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!user) {
      setError('You must be logged in to change your username.');
      return;
    }

    if (cooldown > 0) {
      setError(`You can change your username again in ${Math.floor(cooldown / 3600)} hours, ${Math.floor((cooldown % 3600) / 60)} minutes.`);
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        username: newUsername,
        usernameLastChanged: Timestamp.now(),
      });
      setMessage('Username changed successfully.');
      setCooldown(24 * 60 * 60);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatCooldown = () => {
    if (cooldown <= 0) return 'You can change your username now.';
    const hours = Math.floor(cooldown / 3600);
    const minutes = Math.floor((cooldown % 3600) / 60);
    const seconds = cooldown % 60;
    return `You can change your username again in ${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="user-settings-container">
      <h3>User Settings</h3>
      <form onSubmit={handleUsernameChange}>
        <input
          type="text"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          placeholder="New Username"
        />
        <button type="submit" disabled={cooldown > 0}>Change Username</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}
      <p>{formatCooldown()}</p>
    </div>
  );
};

export default UserSettings;
