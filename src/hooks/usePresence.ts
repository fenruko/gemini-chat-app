import { useEffect } from 'react';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from './useAuth';

export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      return;
    }

    const userStatusDatabaseRef = ref(database, '/status/' + user.uid);

    const isOfflineForDatabase = {
      isOnline: false,
      lastChanged: serverTimestamp(),
    };

    const isOnlineForDatabase = {
      isOnline: true,
      lastChanged: serverTimestamp(),
    };

    const connectedRef = ref(database, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === false) {
        return;
      }

      onDisconnect(userStatusDatabaseRef)
        .set(isOfflineForDatabase)
        .then(() => {
          set(userStatusDatabaseRef, isOnlineForDatabase);
        });
    });

    return () => {
      // Clean up the subscription and set status to offline when the hook unmounts
      if (unsubscribe) unsubscribe();
      set(userStatusDatabaseRef, isOfflineForDatabase);
    };
  }, [user]);
}
