import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export const initializeSocket = (token: string) => {
  // Clean up existing socket if it exists
  if (socket) {
    console.log('Cleaning up existing socket connection');
    socket.removeAllListeners();
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
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
    forceNew: true,
    timeout: 10000 // 10 second timeout
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully');
    // Emit online status when socket connects
    socket?.emit('user:status', { status: 'online' });
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    // Emit offline status when socket disconnects
    socket?.emit('user:status', { status: 'offline' });
    if (reason === 'io server disconnect') {
      // Server disconnected, try to reconnect
      if (socket) {
        console.log('Attempting to reconnect after server disconnect');
        socket.connect();
      }
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    // Attempt to reconnect with polling if websocket fails
    if (socket) {
      console.log('Switching to polling transport after websocket failure');
      socket.io.opts.transports = ['polling', 'websocket'];
      socket.connect();
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Add a ping/pong mechanism to keep connection alive
  const pingInterval = setInterval(() => {
    if (socket?.connected) {
      socket.emit('ping');
    }
  }, 30000); // Send ping every 30 seconds

  // Clean up interval on disconnect
  socket.on('disconnect', () => {
    clearInterval(pingInterval);
  });
  
  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting socket and cleaning up');
    socket.removeAllListeners();
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
  
  console.log('Sending message via socket:', { conversationId, content });
  socket.emit('message:send', {
    conversationId,
    content,
    attachmentUrl
  }, (response: any) => {
    if (response?.error) {
      console.error('Error sending message:', response.error);
    } else {
      console.log('Message sent successfully:', response);
    }
  });
};

// Helper to join a conversation
export const joinConversation = (conversationId: number) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  
  console.log('Joining conversation:', conversationId);
  socket.emit('conversation:join', conversationId, (response: any) => {
    if (response?.error) {
      console.error('Error joining conversation:', response.error);
    } else {
      console.log('Successfully joined conversation:', response);
    }
  });
};

// Helper to leave a conversation
export const leaveConversation = (conversationId: number) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  
  console.log('Leaving conversation:', conversationId);
  socket.emit('conversation:leave', conversationId, (response: any) => {
    if (response?.error) {
      console.error('Error leaving conversation:', response.error);
    } else {
      console.log('Successfully left conversation:', response);
    }
  });
};

// Helper to mark a conversation as read
export const markConversationAsRead = (conversationId: number) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  
  console.log('Marking conversation as read:', conversationId);
  socket.emit('conversation:read', conversationId, (response: any) => {
    if (response?.error) {
      console.error('Error marking conversation as read:', response.error);
    } else {
      console.log('Successfully marked conversation as read:', response);
    }
  });
};

// Helper to indicate typing status
export const startTyping = (conversationId: number) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  
  console.log('Starting typing indicator:', conversationId);
  socket.emit('typing:start', conversationId, (response: any) => {
    if (response?.error) {
      console.error('Error starting typing indicator:', response.error);
    } else {
      console.log('Successfully started typing indicator:', response);
    }
  });
};

export const stopTyping = (conversationId: number) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  
  console.log('Stopping typing indicator:', conversationId);
  socket.emit('typing:stop', conversationId, (response: any) => {
    if (response?.error) {
      console.error('Error stopping typing indicator:', response.error);
    } else {
      console.log('Successfully stopped typing indicator:', response);
    }
  });
}; 