import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, update } from 'firebase/database';
import { getToken, onMessage } from 'firebase/messaging';
import { database, messaging, firebaseConfig } from '../firebase';
import MessageBubble from './MessageBubble';
import InputBox from './InputBox';
import '../styles/ChatRoom.css';

/**
 * ChatRoom Component
 * Main chat interface with real-time message sync
 * Handles message sending, receiving, and display
 */
const ChatRoom = ({ username, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const messagesEndRef = useRef(null);
  const messagesRef = ref(database, 'messages');

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle User Permission Request
  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        await registerServiceWorkerAndGetToken();
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  // Register SW and Get Token
  const registerServiceWorkerAndGetToken = async () => {
    try {
      let registration;
      if ('serviceWorker' in navigator) {
        const urlParams = new URLSearchParams(firebaseConfig).toString();
        // Register SW with config to avoid hardcoding keys in public/sw.js
        registration = await navigator.serviceWorker.register(
          `/firebase-messaging-sw.js?${urlParams}`
        );
      }

      // Get Registration Token
      const token = await getToken(messaging, { 
        serviceWorkerRegistration: registration 
      });

      if (token) {
        // Save token to database for this user
        update(ref(database, `users/${username}/fcmToken`), {
          token,
          lastUpdated: Date.now()
        });
      }
    } catch (error) {
      console.error('FCM Token registration failed:', error);
    }
  };

  // Initial Check on Mount
  useEffect(() => {
    if (Notification.permission === 'granted') {
      registerServiceWorkerAndGetToken();
    }
  }, [username]);

  // Handle Foreground Messages (FCM)
  useEffect(() => {
    const unsubscribeFCM = onMessage(messaging, (payload) => {
      console.log('Foreground FCM Message received:', payload);
      // Show foreground notification manually if needed
      // Note: If the tab is focused, you might not want to annoy the user.
      // But the requirement says "Notification must work when: Browser tab is open".
      if (document.visibilityState === 'visible') {
         // Optionally suppress if user is currently typing or looking at chat?
         // For now, we show it as requested.
         new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: payload.notification.icon,
            tag: payload.notification.tag
         });
      }
    });

    return () => {
      if (unsubscribeFCM) unsubscribeFCM();
    };
  }, []);

  // Subscribe to real-time messages from Firebase (Data Sync Only)
  useEffect(() => {
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesArray = Object.entries(data).map(([id, message]) => ({
          id,
          ...message
        }));
        messagesArray.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(messagesArray);

        // Mark unread messages as seen
        const updates = {};
        messagesArray.forEach((message) => {
          if (message.username !== username && message.seen === false) {
            updates[`${message.id}/seen`] = true;
          }
        });
        if (Object.keys(updates).length > 0) {
          update(messagesRef, updates).catch(err => console.error('Failed to update seen status:', err));
        }
      } else {
        setMessages([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [username]);

  // Send message to Firebase
  const handleSendMessage = async (text) => {
    try {
      await push(messagesRef, {
        text,
        username,
        timestamp: Date.now(),
        seen: false
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="chat-room">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-content">
          <h2>💬 Real-Time Chat</h2>
          <div className="user-info">
             {/* Notification Permission Button */}
            {notificationPermission === 'default' && (
              <button 
                onClick={requestNotificationPermission} 
                className="notification-button"
                title="Enable Notifications"
              >
                🔔 Enable Notifications
              </button>
            )}
            <span className="current-user">{username}</span>
            <button onClick={onLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages yet. Start the conversation! 👋</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.username === username}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <InputBox onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatRoom;
