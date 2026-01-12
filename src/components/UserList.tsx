import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';

interface OnlineUser {
  id: string;
  name: string; // Assuming email is used as name for now
}

const UserList: React.FC = () => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const statusRef = ref(database, 'status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const statuses = snapshot.val();
      const users: OnlineUser[] = [];
      for (const uid in statuses) {
        if (statuses[uid].isOnline) {
          // In a real app, you'd fetch the user's profile from Firestore
          // For now, we don't have user profiles with names, so we can't show them.
          // We can show the UID as a placeholder.
          users.push({ id: uid, name: `User ${uid.substring(0, 6)}...` });
        }
      }
      setOnlineUsers(users);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="user-list">
      <h3>Online Users</h3>
      <ul>
        {onlineUsers.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
