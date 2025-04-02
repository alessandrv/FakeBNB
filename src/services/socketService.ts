import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let pingInterval: number | null = null;
let reconnectTimer: number | null = null;

// Auto-initialize socket on page load if token exists
const initializeOnLoad = () => {
  const token = localStorage.getItem('accessToken');
  if (token && !socket) {
    console.log('[SOCKET] Auto-initializing socket on page load');
    initializeSocket(token);
  }
};

// Check if socket is already initialized and connected
export const isSocketConnected = (): boolean => {
  // For debugging purposes, let's log why a socket might not be connected
  if (!socket) {
    console.log('[SOCKET] Connection check: Socket is null');
    // Try auto initialization if token exists
    initializeOnLoad();
    return false;
  }
  
  if (!socket.connected) {
    console.log('[SOCKET] Connection check: Socket exists but is not connected');
    console.log('[SOCKET] Socket state:', {
      id: socket.id,
      connected: socket.connected,
      disconnected: socket.disconnected,
      hasListeners: socket.hasListeners('connect')
    });
    
    // Try to reconnect if disconnected
    const token = localStorage.getItem('accessToken');
    if (token) {
      console.log('[SOCKET] Attempting to reconnect disconnected socket');
      socket.connect();
    }
    
    return false;
  }
  
  console.log('[SOCKET] Connection check: Socket is connected with ID', socket.id);
  return true;
};

export const initializeSocket = (token: string) => {
  // Always clean up existing socket when initializing with a new token
  if (socket) {
    console.log('Cleaning up existing socket connection before initializing new one');
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
    forceNew: true,
    multiplex: false,
    rememberUpgrade: true
  });

  // Add connection event handlers
  socket.on('connect', () => {
    console.log('Socket connected successfully');
    reconnectAttempts = 0;
    
    // Update status immediately on connect
    if (socket?.connected) {
      const auth = socket.auth as { userId?: number };
      if (auth?.userId) {
        console.log('Emitting online status for user:', auth.userId);
        socket.emit('user:status', {
          status: 'online',
          userId: auth.userId,
          timestamp: new Date().toISOString(),
          force_update: true,
          broadcast: true,
          device_type: 'desktop'
        });
      }
    }

    // Set up ping interval
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = window.setInterval(() => {
      if (socket?.connected) {
        try {
          socket.emit('ping', {}, (response: any) => {
            if (response?.error) {
              console.warn('Ping error:', response.error);
              if (socket && !socket.connected) {
                console.log('Ping failed, attempting reconnection...');
                socket.connect();
              }
            } else {
              // If ping successful, ensure online status is maintained
              const auth = socket?.auth as { userId?: number };
              if (auth?.userId && socket?.connected) {
                socket.emit('user:status', {
                  status: 'online',
                  userId: auth.userId,
                  timestamp: new Date().toISOString(),
                  broadcast: true,
                  device_type: 'desktop'
                });
              }
            }
          });
        } catch (error) {
          console.warn('Error sending ping:', error);
        }
      }
    }, 15000) as unknown as number;
    
    // Broadcast a global event that other components can listen to
    window.dispatchEvent(new CustomEvent('socket:connected'));
  });

  // Add message event handlers
  socket.on('message:received', (message: any) => {
    console.log('Received message:', message);
    // Dispatch a custom event that the Chat component can listen to
    window.dispatchEvent(new CustomEvent('message:received', { detail: message }));
  });

  socket.on('message:broadcast', (message: any) => {
    console.log('Received broadcast message:', message);
    // Dispatch a custom event that the Chat component can listen to
    window.dispatchEvent(new CustomEvent('message:broadcast', { detail: message }));
  });

  socket.on('message:sent', (message: any) => {
    console.log('Message sent:', message);
    // Dispatch a custom event that the Chat component can listen to
    window.dispatchEvent(new CustomEvent('message:sent', { detail: message }));
  });

  socket.on('message:delivered', (data: any) => {
    console.log('Message delivered:', data);
    // Dispatch a custom event that the Chat component can listen to
    window.dispatchEvent(new CustomEvent('message:delivered', { detail: data }));
  });

  // Add visibility change handler
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && socket?.connected) {
      console.log('Page became visible, ensuring socket connection');
      const auth = socket.auth as { userId?: number };
      if (auth?.userId) {
        socket.emit('user:status', {
          status: 'online',
          userId: auth.userId,
          timestamp: new Date().toISOString(),
          force_update: true,
          broadcast: true,
          device_type: 'desktop'
        });
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Add beforeunload handler
  const handleBeforeUnload = () => {
    if (socket?.connected) {
      const auth = socket.auth as { userId?: number };
      if (auth?.userId) {
        socket.emit('user:status', {
          status: 'offline',
          userId: auth.userId,
          timestamp: new Date().toISOString(),
          broadcast: true,
          device_type: 'desktop'
        });
      }
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  // Clean up event listeners when socket is disconnected
  socket.on('disconnect', () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`Socket reconnected after ${attemptNumber} attempts`);
    reconnectAttempts = 0;
    
    // Update status immediately on reconnect
    if (socket?.connected) {
      const auth = socket.auth as { userId?: number };
      if (auth?.userId) {
        console.log('Emitting online status on reconnect for user:', auth.userId);
        // Force online status update on reconnect
        socket.emit('user:status', {
          status: 'online',
          userId: auth.userId,
          timestamp: new Date().toISOString(),
          force_update: true,
          broadcast: true,
          device_type: 'desktop'
        });
      }
    }
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`Socket reconnection attempt ${attemptNumber}`);
    // If we've tried too many times, try to force a new connection
    if (attemptNumber >= MAX_RECONNECT_ATTEMPTS) {
      console.log('Max reconnection attempts reached, forcing new connection');
      if (socket) {
        socket.disconnect();
        socket.connect();
      }
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    
    // Try to use polling if websocket fails
    if (socket && !socket.connected) {
      console.log('Switching to polling transport after websocket failure');
      socket.io.opts.transports = ['polling', 'websocket'];
      socket.connect(); // Force reconnection with new transport
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    // Log but don't disconnect - let Socket.IO handle reconnection
  });

  // Add enhanced reconnection handler
  socket.on('reconnect_failed', () => {
    console.error('Socket reconnection failed after max attempts');
    
    // Set up delayed retry with exponential backoff
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    
    const delay = Math.min(30000, Math.pow(2, reconnectAttempts) * 1000);
    console.log(`Scheduling manual reconnection attempt in ${delay}ms`);
    
    reconnectTimer = window.setTimeout(() => {
      reconnectAttempts++;
      const token = localStorage.getItem('accessToken');
      if (token) {
        console.log(`Manual reconnection attempt ${reconnectAttempts}`);
        // Recreate the socket with fresh token
        forceSocketReconnection(token);
      }
    }, delay) as unknown as number;
  });

  return socket;
};

// Update the cleanup function to handle global room
const cleanupSocketConnection = () => {
  if (!socket) return;
  
  try {
    // Clear all timers first
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // Remove all listeners
    socket.removeAllListeners();
    
    // Emit offline status before disconnecting
    const auth = socket.auth as { userId?: number };
    if (auth?.userId) {
      console.log('Emitting offline status before cleanup for user:', auth.userId);
      socket.emit('user:status', {
        status: 'offline',
        userId: auth.userId,
        timestamp: new Date().toISOString(),
        broadcast: true,
        device_type: 'desktop'
      });
    }
    
    // Leave global room before disconnecting
    socket.emit('leave:global');
    
    // Disconnect the socket
    socket.disconnect();
  } catch (error) {
    console.error('Error cleaning up socket:', error);
  }
  
  socket = null;
};

export const getSocket = (): Socket | null => {
  if (!socket) {
    console.log('[SOCKET] getSocket: Socket is null');
    return null;
  }
  
  if (!socket.connected) {
    console.log('[SOCKET] getSocket: Socket exists but is not connected');
    return socket;
  }
  
  console.log('[SOCKET] getSocket: Returning active socket with ID', socket.id);
  return socket;
};

// Update the disconnect function to be more thorough
export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting socket and cleaning up');
    
    // Clear all timers
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    // Emit offline status before disconnecting
    const auth = socket.auth as { userId?: number };
    if (auth?.userId) {
      console.log('Emitting offline status before disconnect for user:', auth.userId);
      socket.emit('user:status', {
        status: 'offline',
        userId: auth.userId,
        timestamp: new Date().toISOString(),
        broadcast: true,
        device_type: 'desktop'
      });
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
    // Send message and wait for server response
    socket.emit('message:send', {
      conversationId,
      content,
      attachmentUrl,
      timestamp: new Date().toISOString(),
      force_delivery: true
    }, (response: any) => {
      if (response?.error) {
        console.error('Error sending message:', response.error);
      } else {
        console.log('Message sent successfully:', response);
        
        // Don't emit message:broadcast again since the server already broadcasts to all clients
        // This was causing duplicate messages
        
        // Just emit message:delivered event to track delivery
        socket?.emit('message:delivered', {
          message_id: response.id,
          conversation_id: conversationId,
          delivered_at: new Date().toISOString(),
          force_delivery: true
        });
      }
    });
  } catch (error) {
    console.error('Exception while sending message:', error);
  }
};

// Separate function to handle online/offline status
export const updateUserStatus = (status: 'online' | 'offline') => {
  if (!socket?.connected) {
    console.error('Socket not connected, cannot update status');
    return;
  }
  
  try {
    const auth = socket.auth as { userId?: number };
    if (auth?.userId) {
      console.log(`Updating user status to ${status} for user:`, auth.userId);
      socket.emit('user:status', { 
        status,
        userId: auth.userId,
        timestamp: new Date().toISOString(),
        force_update: status === 'online',
        broadcast: true,
        device_type: 'desktop'
      });
    }
  } catch (error) {
    console.error('Exception while updating user status:', error);
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
    
    // Join the global room for all users
    socket.emit('join:global', (response: any) => {
      if (response?.error) {
        console.error('Error joining global room:', response.error);
      } else {
        console.log('Successfully joined global room');
        if (socket) {
          const auth = socket.auth as { userId?: number };
          // Emit user status when joining global room
          if (auth?.userId) {
            console.log('Emitting online status when joining global room for user:', auth.userId);
            socket.emit('user:status', { 
              status: 'online',
              userId: auth.userId,
              timestamp: new Date().toISOString(),
              force_update: true,
              broadcast: true,
              device_type: 'desktop'
            });
          }
        }
      }
    });
  } catch (error) {
    console.error('Exception while joining global room:', error);
  }
};

export const leaveConversation = (conversationId: number) => {
  if (!socket?.connected) {
    console.error('Socket not connected');
    return;
  }
  
  console.log('Leaving global room');
  socket.emit('leave:global', (response: any) => {
    if (response?.error) {
      console.error('Error leaving global room:', response.error);
    } else {
      console.log('Successfully left global room');
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

// Add a function to force socket reconnection
export const forceSocketReconnection = (token: string | null): Promise<boolean> => {
  if (!token) {
    console.error('Cannot reconnect socket: No token provided');
    return Promise.resolve(false);
  }
  
  console.log('Forcing socket reconnection with new token');
  
  return new Promise((resolve) => {
    // Clean up existing socket if it exists
    if (socket) {
      cleanupSocketConnection();
    }
    
    // Track whether we've resolved the promise
    let hasResolved = false;
    
    // Attempt to create a new socket connection
    try {
      initializeSocket(token);
      
      // If socket is already connected, resolve immediately
      if (socket?.connected) {
        console.log('Socket successfully reconnected immediately');
        resolve(true);
        hasResolved = true;
        return;
      }
      
      // If not immediately connected, set up listeners
      if (socket) {
        // Handle successful connection
        const handleConnect = () => {
          if (!hasResolved) {
            console.log('Socket successfully reconnected after waiting');
            resolve(true);
            hasResolved = true;
            
            // Clean up listeners
            if (socket) {
              socket.off('connect', handleConnect);
              socket.off('connect_error', handleConnectError);
            }
            
            // Broadcast a global reconnection event that components can listen to
            window.dispatchEvent(new CustomEvent('socket:reconnected'));
          }
        };
        
        // Handle connection error
        const handleConnectError = (error: any) => {
          console.error('Socket reconnection error:', error);
          
          // Don't resolve yet, wait for the timeout or a successful connection
        };
        
        // Set up the event listeners
        socket.on('connect', handleConnect);
        socket.on('connect_error', handleConnectError);
        
        // Set a timeout to resolve the promise after 5 seconds if not resolved yet
        setTimeout(() => {
          if (!hasResolved) {
            console.log('Socket reconnection timed out, but still attempting in background');
            resolve(socket?.connected || false);
            hasResolved = true;
            
            // Clean up listeners
            if (socket) {
              socket.off('connect', handleConnect);
              socket.off('connect_error', handleConnectError);
            }
          }
        }, 5000);
      } else {
        // No socket was created
        console.error('Failed to create socket instance');
        resolve(false);
        hasResolved = true;
      }
    } catch (error) {
      console.error('Error forcing socket reconnection:', error);
      resolve(false);
      hasResolved = true;
    }
  });
};

// Add event listeners for page visibility and focus
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const token = localStorage.getItem('accessToken');
    if (token && (!socket || !socket.connected)) {
      console.log('[SOCKET] Page became visible, ensuring socket connection');
      forceSocketReconnection(token);
    }
  }
});

window.addEventListener('focus', () => {
  const token = localStorage.getItem('accessToken');
  if (token && (!socket || !socket.connected)) {
    console.log('[SOCKET] Window focused, ensuring socket connection');
    forceSocketReconnection(token);
  }
});

// Automatically attempt to reconnect on page load
window.addEventListener('load', () => {
  initializeOnLoad();
});

// Now that all functions are defined, run the initialization
// Run the initialization when the module is loaded
setTimeout(() => {
  initializeOnLoad();
}, 0); 