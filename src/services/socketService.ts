import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let pingInterval: number | null = null;
let reconnectTimer: number | null = null;

// Check if socket is already initialized and connected
export const isSocketConnected = (): boolean => {
  return !!socket?.connected;
};

export const initializeSocket = (token: string) => {
  // If socket is already connected with the same token, don't reinitialize
  // This prevents unnecessary reconnections that could cause UI issues
  if (socket?.connected) {
    console.log('Socket already connected, skipping initialization');
    return socket;
  }
  
  // Clean up existing socket if it exists but isn't connected
  if (socket) {
    console.log('Cleaning up existing socket connection');
    cleanupSocketConnection();
  }

  // Reset reconnect attempts
  reconnectAttempts = 0;

  // Clear any existing timers
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  console.log('Initializing new socket connection');
  
  // Initialize new socket connection with auth
  socket = io(API_URL, {
    auth: { token },
    query: { token },
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    timeout: 20000,
    transports: ['websocket', 'polling'],
    forceNew: false // Changed to false to allow reusing connections
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully');
    reconnectAttempts = 0;
    
    if (socket?.connected) {
      socket.emit('user:status', { status: 'online' });
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`Socket reconnected after ${attemptNumber} attempts`);
    reconnectAttempts = 0;
    
    if (socket?.connected) {
      socket.emit('user:status', { status: 'online' });
    }
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`Socket reconnection attempt ${attemptNumber}`);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    
    // Handle various disconnect reasons
    if (reason === 'io server disconnect' || reason === 'transport close') {
      console.log('Server initiated disconnect, attempting to reconnect...');
      
      // Use Socket.IO's built-in reconnection first
      if (socket && !socket.connected) {
        // Only try to manually reconnect if Socket.IO's auto reconnect fails
        if (reconnectTimer) clearTimeout(reconnectTimer);
        
        reconnectTimer = window.setTimeout(() => {
          if (socket && !socket.connected) {
            console.log('Attempting manual reconnection...');
            socket.connect();
          }
        }, 2000) as unknown as number;
      }
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    
    // Try to use polling if websocket fails
    if (socket && !socket.connected) {
      console.log('Switching to polling transport after websocket failure');
      socket.io.opts.transports = ['polling', 'websocket'];
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    // Log but don't disconnect - let Socket.IO handle reconnection
  });

  // Add a ping/pong mechanism to keep connection alive
  pingInterval = window.setInterval(() => {
    if (socket?.connected) {
      try {
        socket.emit('ping', {}, (response: any) => {
          if (response?.error) {
            console.warn('Ping error:', response.error);
          }
        });
      } catch (error) {
        console.warn('Error sending ping:', error);
      }
    }
  }, 25000) as unknown as number;

  return socket;
};

// Helper function to clean up socket connection
const cleanupSocketConnection = () => {
  if (!socket) return;
  
  try {
    // Remove all listeners to prevent memory leaks
    socket.removeAllListeners();
    socket.disconnect();
  } catch (error) {
    console.error('Error cleaning up socket:', error);
  }
  
  socket = null;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting socket and cleaning up');
    
    // Clear ping interval
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    
    // Clear reconnect timer
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    cleanupSocketConnection();
    reconnectAttempts = 0;
  }
};

// Helper to send a message with improved error handling
export const sendMessage = (conversationId: number, content: string, attachmentUrl?: string) => {
  if (!socket) {
    console.error('Socket is null, cannot send message');
    return;
  }
  
  if (!socket.connected) {
    console.error('Socket not connected, cannot send message');
    return;
  }
  
  console.log('Sending message via socket:', { conversationId, content });
  
  try {
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
  } catch (error) {
    console.error('Exception while sending message:', error);
  }
};

// Rest of the code remains largely the same, but with improved error handling
export const joinConversation = (conversationId: number) => {
  if (!socket?.connected) {
    console.error('Socket not connected, cannot join conversation');
    return;
  }
  
  try {
    console.log('Joining conversation:', conversationId);
    socket.emit('conversation:join', conversationId, (response: any) => {
      if (response?.error) {
        console.error('Error joining conversation:', response.error);
      } else {
        console.log('Successfully joined conversation:', response);
        if (socket) {
          const auth = socket.auth as { userId?: number };
          socket.emit('user:joined', { 
            conversationId, 
            userId: auth?.userId
          });
        }
      }
    });
  } catch (error) {
    console.error('Exception while joining conversation:', error);
  }
};

export const leaveConversation = (conversationId: number) => {
  if (!socket?.connected) {
    console.error('Socket not connected');
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

export const markConversationAsRead = (conversationId: number) => {
  if (!socket?.connected) {
    console.error('Socket not connected');
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

export const startTyping = (conversationId: number) => {
  if (!socket?.connected) {
    console.error('Socket not connected');
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
  if (!socket?.connected) {
    console.error('Socket not connected');
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