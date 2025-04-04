import { io, Socket } from 'socket.io-client';

// Define API URL with a fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Socket singleton instance
let socket: Socket | null = null;
let initialized = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

// Add message tracking for debugging
const receivedMessages = new Set<number>();

// Function to initialize the socket connection
export const initializeSocket = (token: string): Socket => {
  // Reset connection attempts if we're explicitly initializing
  connectionAttempts = 0;
  
  // If already initialized and connected, just return the socket
  if (initialized && socket && socket.connected) {
    console.log('[SOCKET] Already initialized and connected, reusing socket');
    return socket;
  }

  // If the socket exists but is disconnected, reconnect it
  if (socket) {
    console.log('[SOCKET] Reconnecting existing socket');
    socket.connect();
    return socket;
  }

  // Create a new socket connection
  console.log('[SOCKET] Creating new socket connection');
  try {
    socket = io(API_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    // Set up event listeners
    socket.on('connect', () => {
      console.log('[SOCKET] Connected with ID:', socket?.id);
      console.log('[SOCKET] Transport:', socket?.io.engine.transport.name);
      connectionAttempts = 0; // Reset attempts on successful connection
    });

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      
      // If the server closed the connection, try to reconnect manually
      if (reason === 'io server disconnect') {
        console.log('[SOCKET] Server disconnected us, attempting to reconnect...');
        setTimeout(() => {
          if (socket) socket.connect();
        }, 1000);
      }
    });

    socket.on('error', (error) => {
      console.error('[SOCKET] Error:', error);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[SOCKET] Reconnected after', attemptNumber, 'attempts');
      connectionAttempts = 0; // Reset attempts on successful reconnection
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[SOCKET] Reconnection attempt:', attemptNumber);
      connectionAttempts++;
      
      // If we've tried too many times, reset the socket
      if (connectionAttempts > MAX_CONNECTION_ATTEMPTS) {
        console.log('[SOCKET] Too many reconnection attempts, creating a new socket');
        if (socket) {
          socket.disconnect();
          socket = null;
          initialized = false;
        }
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error.message);
      connectionAttempts++;
      
      // If we get an auth error, we should handle it specially
      if (error.message.includes('Authentication error')) {
        console.error('[SOCKET] Authentication error, token may be invalid');
        // This should trigger a token refresh
      }
    });

    // Add debugging for new_message events
    socket.on('new_message', (message: any) => {
      // Add VERY visible console logging
      console.log('🚨🚨🚨 [SOCKET] NEW MESSAGE RECEIVED 🚨🚨🚨', message);
      console.log('%c NEW MESSAGE EVENT!', 'background: #ff0000; color: #ffffff; font-size: 20px', message);
      
      // Always emit a raw message to a global event bus
      try {
        // Ensure conversation_id is a number
        if (message && message.conversation_id) {
          message.conversation_id = Number(message.conversation_id);
        }
        
        // Store in window for debugging
        (window as any).lastReceivedMessage = message;
        (window as any).allReceivedMessages = [...((window as any).allReceivedMessages || []), message];
        
        // Create and dispatch a DOM event for components to listen to
        const messageEvent = new CustomEvent('socket:new_message', { detail: message });
        window.dispatchEvent(messageEvent);
        console.log('🌐 Dispatched global socket:new_message event', message);
        
        // Create a DOM event specifically for this conversation
        if (message.conversation_id) {
          const conversationEvent = new CustomEvent(`socket:conversation:${message.conversation_id}`, {
            detail: message
          });
          window.dispatchEvent(conversationEvent);
          console.log(`🎯 Dispatched conversation-specific event for conversation ${message.conversation_id}`);
        }
      } catch (error) {
        console.error('❌ Error dispatching custom events:', error);
      }
      
      if (!message || !message.id) {
        console.error('❌ [SOCKET] Invalid message received, missing ID');
        return;
      }
      
      if (receivedMessages.has(message.id)) {
        console.log(`⚠️ [SOCKET] Message #${message.id} already received before`);
      } else {
        console.log(`✅ [SOCKET] New message #${message.id} for conversation ${message.conversation_id}`);
        receivedMessages.add(message.id);
      }
    });

    // Add debugging for room check results
    socket.on('room_check_result', (data: any) => {
      console.log(`🔍 [SOCKET] Room check result:`, data);
      if (data.isInRoom) {
        console.log(`✅ [SOCKET] User ${data.userId} is in room conversation:${data.conversationId}`);
      } else {
        console.error(`❌ [SOCKET] User ${data.userId} is NOT in room conversation:${data.conversationId}`);
      }
    });

    initialized = true;
    return socket;
  } catch (error) {
    console.error('[SOCKET] Error creating socket:', error);
    throw error;
  }
};

// Function to get the socket instance
export const getSocket = (): Socket | null => {
  if (!socket || !socket.connected) {
    console.warn('[SOCKET] Socket not initialized or connected');
  }
  return socket;
};

// Function to check if socket is connected
export const isSocketConnected = (): boolean => {
  return socket !== null && socket.connected;
};

// Function to join a conversation room
export const joinConversation = (conversationId: number): boolean => {
  if (!socket || !socket.connected) {
    console.warn('[SOCKET] Cannot join conversation - socket not connected');
    return false;
  }

  console.log(`[SOCKET] Joining conversation room: ${conversationId}`);
  socket.emit('join_conversation', conversationId);
  
  // Set up a one-time listener for join confirmation
  socket.once('joined_conversation', (data: any) => {
    if (data.conversationId === conversationId) {
      console.log(`✅ [SOCKET] Successfully joined conversation ${conversationId}`);
    }
  });
  
  return true;
};

// Function to leave a conversation room
export const leaveConversation = (conversationId: number): boolean => {
  if (!socket || !socket.connected) {
    console.warn('[SOCKET] Cannot leave conversation - socket not connected');
    return false;
  }

  console.log(`[SOCKET] Leaving conversation room: ${conversationId}`);
  socket.emit('leave_conversation', conversationId);
  return true;
};

// Function to disconnect the socket
export const disconnectSocket = (): void => {
  if (socket) {
    console.log('[SOCKET] Disconnecting socket');
    socket.disconnect();
  }
};

// Function to force reconnect
export const forceReconnect = (token: string): Socket | null => {
  console.log('[SOCKET] Force reconnecting socket');
  
  if (socket) {
    // Remove all listeners to prevent memory leaks
    socket.offAny();
    socket.disconnect();
    socket = null;
    initialized = false;
  }
  
  // Attempt to create a new connection
  try {
    return initializeSocket(token);
  } catch (error) {
    console.error('[SOCKET] Force reconnect failed:', error);
    return null;
  }
};

// Function to send a message via socket
export const sendMessage = (conversationId: number, content: string): boolean => {
  if (!socket || !socket.connected) {
    console.warn('[SOCKET] Cannot send message - socket not connected, attempting to reconnect');
    
    // Try to reconnect the socket if it exists but is disconnected
    if (socket) {
      console.log('[SOCKET] Attempting to reconnect existing socket');
      socket.connect();
      
      // Give it a brief moment to connect
      setTimeout(() => {
        // Check if reconnection was successful
        if (socket && socket.connected) {
          console.log('[SOCKET] Reconnection successful, sending message');
          socket.emit('message:send', { conversationId, content });
          return true;
        } else {
          console.warn('[SOCKET] Reconnection failed, message not sent');
          return false;
        }
      }, 300);
      
      // Return false for now, the message will be sent in the timeout if reconnection succeeds
      return false;
    }
    
    return false;
  }

  console.log(`[SOCKET] Sending message to conversation: ${conversationId}`);
  socket.emit('message:send', { conversationId, content });
  return true;
};

// Add a function to check if we're in a specific room
export const isInRoom = (conversationId: number): boolean => {
  if (!socket) return false;
  
  // We can't directly check socket.rooms from the client
  // So we'll rely on emitting a test event to check
  socket.emit('check_room', { conversationId });
  return true;
};

// Export the socket instance and functions
export default {
  initializeSocket,
  getSocket,
  isSocketConnected,
  joinConversation,
  leaveConversation,
  disconnectSocket,
  forceReconnect,
  sendMessage,
  isInRoom
}; 