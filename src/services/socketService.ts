import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export const initializeSocket = (token: string) => {
  // Clean up existing socket if it exists
  if (socket) {
    socket.disconnect();
  }
  
  // Initialize new socket connection with auth
  socket = io(API_URL, {
    auth: { token },
    query: { token },
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });
  
  socket.on('connect', () => {
    console.log('Socket connected');
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Helper to send a message
export const sendMessage = (conversationId: number, content: string, attachmentUrl?: string) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  
  socket.emit('message:send', {
    conversationId,
    content,
    attachmentUrl
  });
};

// Helper to mark a conversation as read
export const markConversationAsRead = (conversationId: number) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  
  socket.emit('conversation:read', conversationId);
};

// Helper to indicate typing status
export const startTyping = (conversationId: number) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  
  socket.emit('typing:start', conversationId);
};

export const stopTyping = (conversationId: number) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  
  socket.emit('typing:stop', conversationId);
};

// Helper to join a conversation
export const joinConversation = (conversationId: number) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  
  socket.emit('conversation:join', conversationId);
};

// Helper to leave a conversation
export const leaveConversation = (conversationId: number) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  
  socket.emit('conversation:leave', conversationId);
}; 