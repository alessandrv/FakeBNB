import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '@heroui/react';
import * as chatService from '../services/chatService';
import { 
  getSocket, 
  joinConversation, 
  leaveConversation,
  markConversationAsRead,
  startTyping,
  stopTyping,
  sendMessage,
  isSocketConnected,
  forceSocketReconnection
} from '../services/socketService';
import { Message, User, Chat as ChatType } from '../types/chat';
import { mapConversation, mapMessage } from '../types/chat';
import { ChatList } from '../components/chat/ChatList';
import { ChatView } from '../components/chat/ChatView';

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  
  const [chats, setChats] = useState<ChatType[]>([]);
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [isPrimaryDevice, setIsPrimaryDevice] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pendingMessages = useRef<Set<number>>(new Set()); // Track pending message IDs
  const processedMessageIds = useRef<Set<number>>(new Set()); // Track all processed message IDs
  const joinAttempts = useRef<number>(0); // Track conversation join attempts
  const socketCheckInterval = useRef<number | null>(null); // Interval for socket connection checks
  const hasJoinedCurrentConversation = useRef<boolean>(false); // Track if current conversation is joined
  
  // Add a message tracking ref to avoid duplicates across different event sources
  const processedMessages = React.useRef<Set<string>>(new Set());
  
  // Effect for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
      setViewportHeight(window.innerHeight);
      
      // Apply the viewport height to the chat container
      if (chatContainerRef.current) {
        chatContainerRef.current.style.height = `${window.innerHeight}px`;
      }
    };
    
    // Initial setup
    handleResize();
    
    // Handle browser events that might change the viewport
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Special handling for mobile chrome address bar
    if (navigator.userAgent.includes('Android')) {
      window.addEventListener('scroll', handleResize);
      document.addEventListener('visibilitychange', handleResize);
      
      // Force a resize when focusing on inputs (may trigger keyboard and address bar changes)
      const inputs = document.querySelectorAll('input, textarea');
      inputs.forEach(input => {
        input.addEventListener('focus', () => setTimeout(handleResize, 300));
        input.addEventListener('blur', () => setTimeout(handleResize, 300));
      });
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      
      if (navigator.userAgent.includes('Android')) {
        window.removeEventListener('scroll', handleResize);
        document.removeEventListener('visibilitychange', handleResize);
      }
    };
  }, []);
  
  // Current user in our frontend format
  const currentUser: User = user ? {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    avatar: user.profilePic,
    isOnline: true // Current user is always online when logged in
  } : {
    id: 0,
    firstName: 'Guest',
    lastName: 'User',
    isOnline: false
  };
  
  // Function to ensure user is joined to the active conversation
  const ensureJoinedToConversation = async () => {
    if (conversationId) {
      console.log(`Ensuring user is joined to conversation ${conversationId}`);
      
      // First check if socket is connected
      if (isSocketConnected()) {
        try {
          console.log('Socket connected, joining conversation directly');
          joinConversation(parseInt(conversationId));
          hasJoinedCurrentConversation.current = true;
          
          // Mark as read when joining
          markConversationAsRead(parseInt(conversationId));
          chatService.markConversationAsRead(parseInt(conversationId)).catch(console.error);
          
          console.log(`Successfully joined conversation ${conversationId}`);
        } catch (error) {
          console.error('Error joining conversation:', error);
          await reconnectAndJoin();
        }
      } else {
        console.warn('Socket not connected, attempting reconnection');
        await reconnectAndJoin();
      }
    }
  };
  
  // Helper function to reconnect socket and join conversation
  const reconnectAndJoin = async () => {
    if (!conversationId) return;
    
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('No access token available for reconnection');
      return;
    }
    
    try {
      console.log('Attempting to reconnect socket and join conversation');
      // Use the Promise-based reconnection
      const reconnected = await forceSocketReconnection(token);
      
      if (reconnected) {
        console.log('Socket reconnected, now joining conversation');
        // Wait a moment for the socket to fully establish
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to join the conversation
        if (isSocketConnected()) {
          console.log(`Joining conversation ${conversationId} after reconnection`);
          joinConversation(parseInt(conversationId));
          hasJoinedCurrentConversation.current = true;
          
          // Mark as read
          markConversationAsRead(parseInt(conversationId));
          chatService.markConversationAsRead(parseInt(conversationId)).catch(console.error);
          
          console.log(`Successfully joined conversation ${conversationId} after reconnection`);
        } else {
          console.error('Socket still not connected after reconnection attempt');
        }
      } else {
        console.error('Failed to reconnect socket');
      }
    } catch (error) {
      console.error('Error during reconnection process:', error);
    }
  };
  
  // Set up socket monitoring to ensure connection
  useEffect(() => {
    // Set up an interval to check socket connection and conversation join status
    if (conversationId) {
      // Clear any existing interval
      if (socketCheckInterval.current) {
        clearInterval(socketCheckInterval.current);
      }
      
      // Create a new check interval - check more frequently (every 2 seconds)
      socketCheckInterval.current = window.setInterval(() => {
        const socket = getSocket();
        
        // If socket is not connected or not initialized
        if (!socket || !socket.connected) {
          console.log('Socket disconnected or not initialized, attempting reconnection...');
          const token = localStorage.getItem('accessToken');
          if (token) {
            // Try to force reconnection
            forceSocketReconnection(token)
              .then(reconnected => {
                if (reconnected) {
                  console.log('Socket reconnected successfully');
                  // Wait a short time for the socket to fully establish
                  setTimeout(() => {
                    ensureJoinedToConversation().catch(err => {
                      console.error('Error joining after reconnection:', err);
                    });
                  }, 500);
                } else {
                  console.error('Socket reconnection failed');
                  // Try alternative approach
                  window.dispatchEvent(new Event('focus'));
                }
              })
              .catch(err => {
                console.error('Error during socket reconnection:', err);
              });
          }
        } else if (!hasJoinedCurrentConversation.current) {
          // Socket is connected but we haven't joined the conversation
          console.log('Socket connected but not joined to conversation, joining...');
          ensureJoinedToConversation().catch(err => {
            console.error('Error ensuring joined to conversation:', err);
          });
        }
      }, 2000) as unknown as number; // Check every 2 seconds
    }
    
    return () => {
      if (socketCheckInterval.current) {
        clearInterval(socketCheckInterval.current);
        socketCheckInterval.current = null;
      }
    };
  }, [conversationId]);
  
  // Effect to fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await chatService.getConversations();
        // Map to our frontend format
        const mappedChats = data.map(mapConversation);
        setChats(mappedChats);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setError('Failed to load conversations');
        setLoading(false);
      }
    };
    
    fetchConversations();
  }, []);
  
  // Effect to handle conversation change and toggle mobile navbar visibility
  useEffect(() => {
    let isComponentMounted = true;
    
    // Reset join status on conversation change
    hasJoinedCurrentConversation.current = false;
    joinAttempts.current = 0;
    
    // Reset processed messages tracker on conversation change
    processedMessages.current.clear();
    
    // Clear previous conversation
    if (activeChat) {
      leaveConversation(activeChat.id);
    }
    
    // Reset messages when conversation changes
    setMessages([]);
    
    // Toggle mobile navbar visibility based on whether we're in a conversation
    if (!isDesktop) {
      // Set CSS variable to hide mobile navbar when viewing a conversation
      document.documentElement.style.setProperty('--hide-navbar-mobile', conversationId ? 'none' : 'grid');
    }
    
    if (conversationId) {
      const fetchConversationAndMessages = async () => {
        try {
          setLoading(true);
          
          // Fetch conversation details
          const conversation = await chatService.getConversation(parseInt(conversationId));
          const mappedChat = mapConversation(conversation);
          if (isComponentMounted) {
            setActiveChat(mappedChat);
          }
          
          // Fetch messages
          const messagesData = await chatService.getMessages(parseInt(conversationId));
          const mappedMessages = messagesData.map(mapMessage).reverse(); // API returns newest first, reverse for display
          if (isComponentMounted) {
            setMessages(mappedMessages);
          }
          
          // Join the conversation room via socket with retry logic
          if (isSocketConnected()) {
            joinConversation(parseInt(conversationId));
            hasJoinedCurrentConversation.current = true;
            console.log(`Successfully joined conversation ${conversationId}`);
          } else {
            console.log('Socket not connected, attempting reconnection');
            
            try {
              // Use our Promise-based reconnection logic
              const token = localStorage.getItem('accessToken');
              if (token) {
                console.log('Attempting to reconnect socket before joining conversation');
                
                // Use progressive retry with Promise
                const attemptReconnection = async () => {
                  const reconnected = await forceSocketReconnection(token);
                  
                  if (reconnected) {
                    console.log('Socket reconnected successfully, joining conversation');
                    // Short delay for socket to be fully ready
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Now join the conversation
                    if (isSocketConnected()) {
                      joinConversation(parseInt(conversationId));
                      hasJoinedCurrentConversation.current = true;
                      console.log(`Successfully joined conversation ${conversationId} after reconnection`);
                      
                      // Mark as read
                      markConversationAsRead(parseInt(conversationId));
                    } else {
                      console.error('Socket still not connected after successful reconnection');
                      throw new Error('Socket connection unstable');
                    }
                  } else {
                    // If first reconnection attempt failed, try alternative approach
                    console.log('Initial reconnection failed, trying alternative approach');
                    
                    // Trigger focus event to use the AuthContext reconnection logic as well
                    window.dispatchEvent(new Event('focus'));
                    
                    // Wait and try one more time
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Last attempt with a new token fetch
                    const freshToken = localStorage.getItem('accessToken');
                    if (freshToken) {
                      const secondAttempt = await forceSocketReconnection(freshToken);
                      
                      if (secondAttempt && isSocketConnected()) {
                        console.log('Second reconnection attempt succeeded, joining conversation');
                        joinConversation(parseInt(conversationId));
                        hasJoinedCurrentConversation.current = true;
                      } else {
                        console.error('All reconnection attempts failed');
                        if (isComponentMounted) {
                          setError('Could not connect to chat. Please refresh the page.');
                        }
                      }
                    }
                  }
                };
                
                // Execute the reconnection process
                attemptReconnection().catch(err => {
                  console.error('Error during reconnection process:', err);
                  if (isComponentMounted) {
                    setError('Connection issue. Please try refreshing the page.');
                  }
                });
              } else {
                console.error('No access token available for reconnection');
                if (isComponentMounted) {
                  setError('Authentication issue. Please try logging in again.');
                }
              }
            } catch (error) {
              console.error('Exception during reconnection process:', error);
              if (isComponentMounted) {
                setError('Connection issue. Please try refreshing the page.');
              }
            }
          }
          
          // Mark conversation as read
          markConversationAsRead(parseInt(conversationId));
          await chatService.markConversationAsRead(parseInt(conversationId));
          
          // Update unread count in conversations list
          if (isComponentMounted) {
            setChats(prevChats => 
              prevChats.map(c => 
                c.id === parseInt(conversationId) ? { ...c, unreadCount: 0 } : c
              )
            );
          }
          
          if (isComponentMounted) {
            setLoading(false);
          }
          
          // Force scroll to bottom after loading messages
          const scrollToBottom = () => {
            const messagesContainer = document.querySelector('.ChatMessages');
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          };
          
          // Attempt multiple scrolls with increasing delays
          scrollToBottom();
          setTimeout(scrollToBottom, 100);
          setTimeout(scrollToBottom, 300);
        } catch (error) {
          console.error('Error fetching conversation and messages:', error);
          if (isComponentMounted) {
            setError('Failed to load conversation');
            setLoading(false);
          }
        }
      };
      
      fetchConversationAndMessages();
    } else {
      setLoading(false);
    }
    
    return () => {
      isComponentMounted = false;
      // Cleanup: leave room when unmounting or changing conversations
      if (conversationId) {
        leaveConversation(parseInt(conversationId));
        hasJoinedCurrentConversation.current = false;
      }
      
      // Restore mobile navbar visibility
      if (!isDesktop) {
        document.documentElement.style.setProperty('--hide-navbar-mobile', 'grid');
      }
    };
  }, [conversationId, isDesktop]);
  
  // Effect to handle socket connection and online status
  useEffect(() => {
    const socket = getSocket();
    
    if (!socket) {
      console.error('Socket not initialized');
      if (conversationId) {
        setTimeout(() => {
          if (!isSocketConnected() && conversationId) {
            console.log('Socket not initialized, attempting to reconnect via health check');
            window.dispatchEvent(new Event('focus'));
          }
        }, 1000);
      }
    }

    let isComponentMounted = true;

    // Set current user as online when component mounts
    if (user && isComponentMounted) {
      console.log('Setting current user as online:', user.id);
      setChats(prev => prev.map(chat => ({
        ...chat,
        participants: chat.participants.map(p => 
          p.id === user.id ? { ...p, isOnline: true } : p
        )
      })));
    }
    
    // Listen for new messages
    const handleNewMessage = (message: any) => {
      if (!isComponentMounted) return;
      
      console.log('Received message:', message);
      
      // Create a unique key for this message
      const messageKey = `${message.id || ''}:${message.conversation_id || ''}:${message.content || message.text || ''}`;
      
      // Skip if already processed this exact message
      if (processedMessages.current.has(messageKey)) {
        console.log('Skipping duplicate message (already processed):', messageKey);
        return;
      }
      
      // Mark as processed
      processedMessages.current.add(messageKey);
      
      // Map the message to our frontend format
      const mappedMessage = mapMessage(message);
      
      // Update messages if it's for the current conversation
      if (message.conversation_id === parseInt(conversationId || '0')) {
        setMessages(prev => {
          // Check if this message is a server confirmation of a message we added optimistically
          const existingMessageIndex = prev.findIndex(m => 
            // Check if content matches
            m.content === message.content &&
            // And sender is the same
            m.senderId === message.sender_id &&
            // And the message is from the current user (we only add optimistic messages for current user)
            m.senderId === user?.id &&
            // And it's a temporary ID (larger than typical DB IDs) or it has the isLocal flag
            ((typeof m.id === 'number' && m.id > 1000000000) || m.isLocal === true)
          );
          
          if (existingMessageIndex !== -1) {
            console.log('Found matching local message, replacing with server version:', 
              {local: prev[existingMessageIndex], server: mappedMessage});
              
            // Create a new array with the local message replaced by the server one
            const updatedMessages = [...prev];
            updatedMessages[existingMessageIndex] = {
              ...mappedMessage,
              // Preserve any UI-specific properties we need
              // This ensures we don't lose any client-side state when replacing
            };
            
            return updatedMessages;
          }
          
          // Check if the message already exists with the same ID
          const hasSameId = prev.some(m => m.id === message.id);
          if (hasSameId) {
            console.log('Message with ID already exists, skipping:', message.id);
            return prev;
          }

          // If neither a confirmation nor duplicate, add as new message
          console.log('Adding new message to conversation:', mappedMessage);
          return [...prev, mappedMessage];
        });
        
        // If the message is from someone else, mark as read
        if (message.sender_id !== user?.id) {
          markConversationAsRead(message.conversation_id);
          chatService.markConversationAsRead(message.conversation_id).catch(console.error);
        }
        
        // Clear typing indicator for sender
        setTypingUsers(prev => {
          const updated = { ...prev };
          delete updated[message.sender_id];
          return updated;
        });

        // Scroll to bottom after adding new message
        const scrollToBottom = () => {
          const messagesContainer = document.querySelector('.ChatMessages');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        };
        
        // Multiple scroll attempts to ensure it works
        scrollToBottom();
        setTimeout(scrollToBottom, 50);
        setTimeout(scrollToBottom, 200);
      }
      
      // Update conversation list
      setChats(prev => {
        const updatedChats = prev.map(c => {
          if (c.id === message.conversation_id) {
            // If active conversation, mark as read
            const newUnreadCount = parseInt(conversationId || '0') === c.id 
              ? 0 
              : c.unreadCount + (message.sender_id !== user?.id ? 1 : 0);
            
            return {
              ...c,
              lastMessage: {
                content: message.content,
                timestamp: message.created_at
              },
              lastMessageAt: message.created_at,
              unreadCount: newUnreadCount
            };
          }
          return c;
        });

        // Sort by last message date, newest first
        return updatedChats.sort((a, b) => 
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
      });
    };

    // Listen for message delivery confirmation
    const handleMessageDelivered = (data: { message_id: number, conversation_id: number }) => {
      console.log('Message delivered:', data);
      if (data.conversation_id === parseInt(conversationId || '0')) {
        setMessages(prev => prev.map(m => 
          m.id === data.message_id ? { ...m, isRead: true } : m
        ));
      }
    };

    // Listen for typing indicators
    const handleTypingStart = (data: { userId: number, conversationId: number }) => {
      console.log('Received typing start:', data);
      if (data.userId === user?.id) return; // Ignore own typing
      
      if (data.conversationId === parseInt(conversationId || '0')) {
        // Find user name from participants
        const conversation = chats.find(c => c.id === data.conversationId);
        if (conversation) {
          const typingUser = conversation.participants.find(p => p.id === data.userId);
          if (typingUser) {
            setTypingUsers(prev => ({
              ...prev,
              [data.userId]: `${typingUser.firstName} ${typingUser.lastName}`
            }));
          }
        }
      }
    };
    
    const handleTypingStop = (data: { userId: number, conversationId: number }) => {
      console.log('Received typing stop:', data);
      if (data.conversationId === parseInt(conversationId || '0')) {
        setTypingUsers(prev => {
          const updated = { ...prev };
          delete updated[data.userId];
          return updated;
        });
      }
    };
    
    // Listen for read receipts
    const handleConversationRead = (data: { userId: number, conversationId: number }) => {
      console.log('Received conversation read:', data);
      if (data.conversationId === parseInt(conversationId || '0')) {
        setMessages(prev => prev.map(m => 
          m.senderId === user?.id ? { ...m, isRead: true } : m
        ));
      }
    };

    // Separate handler for user status updates
    const handleUserStatus = (data: { status: 'online' | 'offline', userId: number, timestamp: string }) => {
      console.log('Received user status:', data);
      if (isComponentMounted) {
        // Update the status for the user in all conversations
        setChats(prev => prev.map(chat => ({
          ...chat,
          participants: chat.participants.map(p => 
            p.id === data.userId ? { 
              ...p, 
              isOnline: data.status === 'online'
            } : p
          )
        })));

        // If this is the current user, also update their status
        if (data.userId === user?.id) {
          console.log('Updating current user status:', data.status);
          setChats(prev => prev.map(chat => ({
            ...chat,
            participants: chat.participants.map(p => 
              p.id === user.id ? { 
                ...p, 
                isOnline: data.status === 'online'
              } : p
            )
          })));
        }
      }
    };

    // Connection status handlers
    const handleConnect = () => {
      console.log('Socket connected successfully in Chat component');
      if (user && isComponentMounted) {
        console.log('Setting current user as online on connect:', user.id);
        setChats(prev => prev.map(chat => ({
          ...chat,
          participants: chat.participants.map(p => 
            p.id === user.id ? { ...p, isOnline: true } : p
          )
        })));
      }
      // Rejoin conversation if we were in one
      if (conversationId && isComponentMounted) {
        console.log(`Rejoining conversation ${conversationId} after socket connect event`);
        hasJoinedCurrentConversation.current = false;
        setTimeout(() => {
          try {
            joinConversation(parseInt(conversationId));
            hasJoinedCurrentConversation.current = true;
            markConversationAsRead(parseInt(conversationId));
            chatService.markConversationAsRead(parseInt(conversationId)).catch(console.error);
          } catch (error) {
            console.error('Error joining conversation after socket connect:', error);
          }
        }, 300);
      }
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected in Chat component');
      hasJoinedCurrentConversation.current = false;
      if (user && isComponentMounted) {
        console.log('Setting current user as offline on disconnect:', user.id);
        setChats(prev => prev.map(chat => ({
          ...chat,
          participants: chat.participants.map(p => 
            p.id === user.id ? { ...p, isOnline: false } : p
          )
        })));
      }
    };

    // Custom socket:connected event listener
    const handleSocketConnected = () => {
      console.log('Received socket:connected event');
      handleConnect();
    };

    // Custom socket:reconnected event listener
    const handleSocketReconnected = () => {
      console.log('Received socket:reconnected event');
      handleConnect();
    };
    
    // Add custom event listeners for messages
    const handleCustomMessageReceived = (event: CustomEvent) => {
      handleNewMessage(event.detail);
    };
    
    const handleCustomMessageBroadcast = (event: CustomEvent) => {
      handleNewMessage(event.detail);
    };
    
    const handleCustomMessageSent = (event: CustomEvent) => {
      handleNewMessage(event.detail);
    };
    
    const handleCustomMessageDelivered = (event: CustomEvent) => {
      handleMessageDelivered(event.detail);
    };
    
    // Add event listeners for our custom events
    window.addEventListener('socket:connected', handleSocketConnected);
    window.addEventListener('socket:reconnected', handleSocketReconnected);
    window.addEventListener('message:received', handleCustomMessageReceived as EventListener);
    window.addEventListener('message:broadcast', handleCustomMessageBroadcast as EventListener);
    window.addEventListener('message:sent', handleCustomMessageSent as EventListener);
    window.addEventListener('message:delivered', handleCustomMessageDelivered as EventListener);

    // Add all event listeners
    if (socket) {
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('message:received', handleNewMessage);
      socket.on('message:broadcast', handleNewMessage);
      socket.on('message:sent', handleNewMessage);
      socket.on('message:delivered', handleMessageDelivered);
      socket.on('typing:start', handleTypingStart);
      socket.on('typing:stop', handleTypingStop);
      socket.on('conversation:read', handleConversationRead);
      socket.on('user:status', handleUserStatus);
    }

    // If socket is connected but we're not joined to the conversation yet, join now
    if (socket && socket.connected && conversationId && !hasJoinedCurrentConversation.current) {
      console.log(`Socket already connected, joining conversation ${conversationId}`);
      joinConversation(parseInt(conversationId));
      hasJoinedCurrentConversation.current = true;
    }

    return () => {
      isComponentMounted = false;
      
      // Remove all event listeners
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('message:received', handleNewMessage);
        socket.off('message:broadcast', handleNewMessage);
        socket.off('message:sent', handleNewMessage);
        socket.off('message:delivered', handleMessageDelivered);
        socket.off('typing:start', handleTypingStart);
        socket.off('typing:stop', handleTypingStop);
        socket.off('conversation:read', handleConversationRead);
        socket.off('user:status', handleUserStatus);
      }

      // Remove custom event listeners
      window.removeEventListener('message:received', handleCustomMessageReceived as EventListener);
      window.removeEventListener('message:broadcast', handleCustomMessageBroadcast as EventListener);
      window.removeEventListener('message:sent', handleCustomMessageSent as EventListener);
      window.removeEventListener('message:delivered', handleCustomMessageDelivered as EventListener);
      window.removeEventListener('socket:connected', handleSocketConnected);
      window.removeEventListener('socket:reconnected', handleSocketReconnected);

      // Leave the conversation if we were in one
      if (conversationId) {
        leaveConversation(parseInt(conversationId));
        hasJoinedCurrentConversation.current = false;
      }
    };
  }, [user, conversationId]);
  
  // Add a visibilitychange event handler to catch when user returns to the page
  useEffect(() => {
    // Function to handle when the user comes back to the page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, checking socket connection');
        
        // If we have an active conversation but socket is not joined
        if (conversationId && !hasJoinedCurrentConversation.current) {
          console.log('Rejoining conversation after page became visible');
          ensureJoinedToConversation().catch(err => {
            console.error('Error rejoining conversation on visibility change:', err);
          });
        }
      }
    };
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Check connection status on mount
    if (document.visibilityState === 'visible' && conversationId) {
      setTimeout(() => {
        ensureJoinedToConversation().catch(err => {
          console.error('Error joining conversation on initial visibility check:', err);
        });
      }, 500);
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [conversationId]);

  // Add a handler for window focus events
  useEffect(() => {
    // Function to handle when the window regains focus
    const handleWindowFocus = () => {
      console.log('Window focused, checking socket connection');
      
      // If we have an active conversation but socket is not joined
      if (conversationId && !hasJoinedCurrentConversation.current) {
        console.log('Rejoining conversation after window focus');
        ensureJoinedToConversation().catch(err => {
          console.error('Error rejoining conversation on window focus:', err);
        });
      }
    };
    
    // Add focus listener
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [conversationId]);
  
  // Create new chat with user ID 2
  const createNewChat = async () => {
    try {
      setCreatingChat(true);
      const userId = 2;
      const conversation = await chatService.getOrCreateDirectConversation(userId);
      
      // Add to conversations list if it's not already there
      setChats(prev => {
        const exists = prev.some(c => c.id === conversation.id);
        if (!exists) {
          return [mapConversation(conversation), ...prev];
        }
        return prev;
      });
      
      // Use replace instead of push to prevent adding to history
      navigate(`/chat/${conversation.id}`, { replace: true });
      setCreatingChat(false);
    } catch (error) {
      console.error('Error creating new conversation:', error);
      setError('Failed to create conversation');
      setCreatingChat(false);
    }
  };
  
  // Add effect to handle device status
  useEffect(() => {
    const handleDeviceStatus = (event: CustomEvent) => {
      setIsPrimaryDevice(event.detail.isPrimary);
      if (!event.detail.isPrimary) {
        setError('This device is not authorized to send messages. Only the primary device can send messages.');
      } else {
        setError(null);
      }
    };

    const handleMessageError = (event: CustomEvent) => {
      setError(event.detail.error);
    };

    window.addEventListener('deviceStatus', handleDeviceStatus as EventListener);
    window.addEventListener('messageError', handleMessageError as EventListener);

    return () => {
      window.removeEventListener('deviceStatus', handleDeviceStatus as EventListener);
      window.removeEventListener('messageError', handleMessageError as EventListener);
    };
  }, []);
  
  // Update handleSendMessage to check device status
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !conversationId || !user) return;
    
    if (!isPrimaryDevice) {
      setError('This device is not authorized to send messages. Only the primary device can send messages.');
      return;
    }
    
    console.log('Sending message:', content);
    
    try {
      setSendingMessage(true);
      setError(null); // Clear any previous errors
      
      // Create a temporary message with a timestamp-based ID and isLocal flag
      const tempId = Date.now(); // Using timestamp as ID to ensure it's different from server IDs
      const tempMessage: Message = {
        id: tempId,
        conversationId: parseInt(conversationId),
        senderId: user.id,
        content: content.trim(),
        timestamp: new Date(),
        isRead: false,
        isLocal: true // Add this flag to mark as a local message
      };
      
      console.log('Adding optimistic local message:', tempMessage);
      
      // Generate tracking key for this message
      const messageKey = `${tempId}:${conversationId}:${content.trim()}`;
      processedMessages.current.add(messageKey);
      
      // Optimistically add to UI
      setMessages(prev => [...prev, tempMessage]);
      
      // Reset input and stop typing indicator
      setMessageText('');
      stopTyping(parseInt(conversationId));
      
      // Scroll to bottom after adding new message
      const scrollToBottom = () => {
        const messagesContainer = document.querySelector('.ChatMessages');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      };
      
      // Multiple scroll attempts to ensure it works
      scrollToBottom();
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 200);
      
      // Send message to server
      sendMessage(parseInt(conversationId), content.trim());
      
      // Update conversation list optimistically
      setChats(prev => {
        const updatedChats = prev.map(c => {
          if (c.id === parseInt(conversationId)) {
            return {
              ...c,
              lastMessage: {
                content: content.trim(),
                timestamp: new Date().toISOString()
              },
              lastMessageAt: new Date().toISOString(),
              unreadCount: 0
            };
          }
          return c;
        });
        
        // Sort by last message date, newest first
        return updatedChats.sort((a, b) => 
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
      });
      
      setSendingMessage(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setSendingMessage(false);
      setError('Failed to send message');
    }
  };
  
  // Handler for when user starts typing
  const handleStartTyping = () => {
    if (!conversationId) return;
    startTyping(parseInt(conversationId));
  };
  
  // Handler for when user stops typing
  const handleStopTyping = () => {
    if (!conversationId) return;
    stopTyping(parseInt(conversationId));
  };
  
  // Clean up the header visibility setting when unmounting
  useEffect(() => {
    // On component mount, force a layout update
    const timeoutId = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);
  
  // If no user is logged in, we should redirect to login
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
        <p className="ml-2">Redirecting to login...</p>
      </div>
    );
  }
  
  return (
    <div 
      ref={chatContainerRef}
      className="flex bg-default-50 w-full h-screen max-h-screen overflow-hidden relative"
    >
      {/* Mobile layout: show either chat list or chat view */}
      <div className={`w-full md:w-80 flex-shrink-0 bg-white h-full fixed md:relative left-0 top-0 z-10 md:border-r border-default-200 ${
        conversationId && !isDesktop ? 'hidden' : 'block'
      }`}>
        <ChatList 
          chats={chats}
          activeChat={conversationId ? parseInt(conversationId) : undefined}
          onChatSelect={(chatId) => navigate(`/chat/${chatId}`, { replace: true })}
          onNewChat={createNewChat}
          isLoading={loading && !conversationId}
        />
      </div>

      {/* Chat view */}
      <div className={`flex-1 h-full relative ${
        !conversationId && !isDesktop ? 'hidden' : 'block'
      }`}>
        {!conversationId ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-default-300 mb-4">
              <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="text-xl font-semibold mb-2">Your Messages</h3>
            <p className="text-default-500 max-w-md mb-4">
              Select a conversation to view your messages or start a new one.
            </p>
            <button 
              onClick={createNewChat}
              className="bg-primary text-white px-4 py-2 rounded-md"
              disabled={creatingChat}
            >
              {creatingChat ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Creating chat...
                </>
              ) : (
                "Start a new conversation"
              )}
            </button>
          </div>
        ) : activeChat ? (
          <>
            {!isPrimaryDevice && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm">
                      This device is not authorized to send messages. Only the primary device can send messages.
                    </p>
                    <button
                      onClick={() => window.dispatchEvent(new Event('focus'))}
                      className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900"
                    >
                      Set as primary device
                    </button>
                  </div>
                </div>
              </div>
            )}
            <ChatView 
              chat={activeChat}
              messages={messages}
              currentUser={currentUser}
              onBack={() => navigate('/chat')}
              onSendMessage={handleSendMessage}
              isLoading={loading}
              typingUsers={typingUsers}
              isPrimaryDevice={isPrimaryDevice}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        )}
      </div>
    </div>
  );
};