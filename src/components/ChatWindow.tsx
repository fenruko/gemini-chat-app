import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import type { Channel } from '../pages/HomePage';

interface ChatWindowProps {
  activeChannel: Channel;
}

interface Message {
  id: string;
  text: string;
  timestamp: number;
  author: {
    uid: string;
    name: string;
  };
}

const ChatWindow: React.FC<ChatWindowProps> = ({ activeChannel }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!activeChannel) return;

    const messagesRef = ref(database, `messages/${activeChannel.id}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const loadedMessages: Message[] = data
        ? Object.entries(data).map(([key, value]) => ({
            id: key,
            ...(value as Omit<Message, 'id'>),
          }))
        : [];
      setMessages(loadedMessages);
    });

    return () => unsubscribe();
  }, [activeChannel]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messagesRef = ref(database, `messages/${activeChannel.id}`);
    await push(messagesRef, {
      text: newMessage,
      timestamp: serverTimestamp(),
      author: {
        uid: user.uid,
        name: user.email, // Using email as name for simplicity
      },
    });
    setNewMessage('');
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3># {activeChannel.name}</h3>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message" title={new Date(msg.timestamp).toLocaleString()}>
            <span className="message-author">{msg.author.name}: </span>
            <span className="message-text">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Message #${activeChannel.name}`}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ChatWindow;
