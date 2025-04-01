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
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pendingMessages = useRef<Set<number>>(new Set()); // Track pending message IDs
  const processedMessageIds = useRef<Set<number>>(new Set()); // Track all processed message IDs
  const joinAttempts = useRef<number>(0); // Track conversation join attempts
  const socketCheckInterval = useRef<number | null>(null); // Interval for socket connection checks
  const hasJoinedCurrentConversation = useRef<boolean>(false); // Track if current conversation is joined
  
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
      
      // Create a new check interval - check more frequently (every 3 seconds)
      socketCheckInterval.current = window.setInterval(() => {
        // If socket is connected but user hasn't joined the conversation yet
        if (isSocketConnected() && !hasJoinedCurrentConversation.current && conversationId) {
          console.log('Socket connected but not joined to conversation, rejoining...');
          ensureJoinedToConversation().catch(err => {
            console.error('Error ensuring joined to conversation:', err);
          });
        } else if (!isSocketConnected() && !hasJoinedCurrentConversation.current && conversationId) {
          // Socket is disconnected and we're not in the conversation
          console.log('Socket disconnected, attempting reconnection...');
          const token = localStorage.getItem('accessToken');
          if (token) {
            // Try to force reconnection (with async handling)
            forceSocketReconnection(token)
              .then(reconnected => {
                if (reconnected) {
                  // Wait a short time for the socket to fully establish connection
                  setTimeout(() => {
                    ensureJoinedToConversation().catch(err => {
                      console.error('Error joining after reconnection:', err);
                    });
                  }, 500);
                } else {
                  console.error('Socket reconnection failed in monitoring interval');
                }
              })
              .catch(err => {
                console.error('Error during socket reconnection in interval:', err);
              });
          }
        }
      }, 3000) as unknown as number;
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
    document.documentElement.style.setProperty('--hide-header-mobile', 'None');
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
      // If we should be in a conversation but socket isn't available, try to reconnect after a short delay
      if (conversationId) {
        setTimeout(() => {
          // Trigger a reconnect through the health check in AuthContext
          if (!isSocketConnected() && conversationId) {
            console.log('Socket not initialized, attempting to reconnect via health check');
            // This will indirectly cause a socket reconnection
            window.dispatchEvent(new Event('focus'));
          }
        }, 1000);
      }
      return;
    }

    let isComponentMounted = true;

    // Set current user as online when component mounts
    if (user && isComponentMounted) {
      setChats(prev => prev.map(chat => ({
        ...chat,
        participants: chat.participants.map(p => 
          p.id === user.id ? { ...p, isOnline: true } : p
        )
      })));
    }
    
    // Add connection status listeners
    const handleConnect = () => {
      console.log('Socket connected successfully in Chat component');
      if (user && isComponentMounted) {
        setChats(prev => prev.map(chat => ({
          ...chat,
          participants: chat.participants.map(p => 
            p.id === user.id ? { ...p, isOnline: true } : p
          )
        })));
      }
      // Rejoin conversation if we were in one
      if (conversationId && isComponentMounted) {
        console.log(`Rejoining conversation ${conversationId} after socket reconnect`);
        
        // Clear existing try-join status
        hasJoinedCurrentConversation.current = false;
        
        // Small delay to ensure socket is fully established
        setTimeout(() => {
          try {
            console.log('Attempting to join conversation after socket connect event');
            joinConversation(parseInt(conversationId));
            hasJoinedCurrentConversation.current = true;
            console.log(`Successfully joined conversation ${conversationId} after socket connect`);
            
            // Also mark as read
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
        setChats(prev => prev.map(chat => ({
          ...chat,
          participants: chat.participants.map(p => 
            p.id === user.id ? { ...p, isOnline: false } : p
          )
        })));
      }
    };

    const handleReconnectAttempt = (attemptNumber: number) => {
      console.log(`Socket reconnect attempt ${attemptNumber}`);
    };

    const handleReconnect = () => {
      console.log('Socket reconnected');
      // Rejoin current conversation if we're in one
      if (conversationId && isComponentMounted) {
        console.log(`Rejoining conversation ${conversationId} after socket reconnect`);
        setTimeout(() => {
          joinConversation(parseInt(conversationId));
          hasJoinedCurrentConversation.current = true;
        }, 500);
      }
    };

    // Define message handlers within this effect
    const handleNewMessageLocal = (message: any) => {
      if (!isComponentMounted) return;
      
      console.log('Received new message in Chat component:', message);
      
      // Skip processing if this is your own message - you'll handle it in handleSendMessage or handleMessageSent
      if (message.sender_id === user?.id) {
        console.log('Skipping own message in handleNewMessage');
        return;
      }
      
      // If we receive a message for the conversation we're viewing but haven't joined yet, join now
      if (message.conversation_id === parseInt(conversationId || '0') && !hasJoinedCurrentConversation.current) {
        console.log('Received message for current conversation but not joined, joining now');
        ensureJoinedToConversation();
      }
      
      // Map the message to our frontend format
      const mappedMessage = mapMessage(message);
      
      // Check if we've already processed this message ID
      if (processedMessageIds.current.has(mappedMessage.id)) {
        console.log('Skipping already processed message:', mappedMessage.id);
        return;
      }
      
      // Mark as processed
      processedMessageIds.current.add(mappedMessage.id);
      
      // Update messages if it's for the current conversation
      if (message.conversation_id === parseInt(conversationId || '0')) {
        setMessages(prev => {
          // Extra check if message already exists
          const exists = prev.some(m => m.id === mappedMessage.id);
          if (!exists) {
            console.log('Adding new message to conversation:', mappedMessage);
            return [...prev, mappedMessage];
          }
          return prev;
        });
        
        // If the message is from someone else, mark as read
        markConversationAsRead(message.conversation_id);
        chatService.markConversationAsRead(message.conversation_id).catch(console.error);
        
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
              : c.unreadCount + 1; // Always increment for others' messages
            
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

    // Listen for message sent confirmation
    const handleMessageSent = (message: any) => {
      console.log('Message sent confirmation:', message);
      if (!isComponentMounted) return;
      
      // Check if we've already processed this message ID
      if (processedMessageIds.current.has(message.id)) {
        console.log('Skipping already processed message in handleMessageSent:', message.id);
        return;
      }
      
      // Mark as processed
      processedMessageIds.current.add(message.id);
      
      // Update messages if it's for the current conversation
      if (message.conversation_id === parseInt(conversationId || '0')) {
        setMessages(prev => {
          const mappedMessage = mapMessage(message);
          const exists = prev.some(m => m.id === mappedMessage.id);
          if (!exists) {
            return [...prev, mappedMessage];
          }
          return prev;
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
    };

    // Listen for user online/offline status
    const handleUserOnline = (userId: number) => {
      console.log('User came online:', userId);
      setChats(prev => prev.map(chat => ({
        ...chat,
        participants: chat.participants.map(p => 
          p.id === userId ? { ...p, isOnline: true } : p
        )
      })));
    };

    const handleUserOffline = (userId: number) => {
      console.log('User went offline:', userId);
      setChats(prev => prev.map(chat => ({
        ...chat,
        participants: chat.participants.map(p => 
          p.id === userId ? { ...p, isOnline: false } : p
        )
      })));
    };

    // Subscribe to all events
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect', handleReconnect);
    socket.on('message:received', handleNewMessageLocal);
    socket.on('message:sent', handleMessageSent);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('conversation:read', handleConversationRead);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    // If socket is connected but we're not joined to the conversation yet, join now
    if (socket.connected && conversationId && !hasJoinedCurrentConversation.current) {
      console.log(`Socket already connected, joining conversation ${conversationId}`);
      joinConversation(parseInt(conversationId));
      hasJoinedCurrentConversation.current = true;
    }
    
    // Cleanup function
    return () => {
      isComponentMounted = false;
      console.log('Cleaning up socket event listeners in Chat component');
      
      // Remove all event listeners to avoid duplicates
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect', handleReconnect);
      socket.off('message:received', handleNewMessageLocal);
      socket.off('message:sent', handleMessageSent);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('conversation:read', handleConversationRead);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);

      // Leave the conversation if we were in one
      if (conversationId) {
        leaveConversation(parseInt(conversationId));
        hasJoinedCurrentConversation.current = false;
      }
    };
  }, [conversationId, user?.id]);
  
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
  
  // Send message handler for the ChatView component
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !conversationId || !user) return;
    
    try {
      setSendingMessage(true);
      
      // Generate a temporary ID for immediate UI feedback
      const tempId = Date.now();
      
      // Create a temporary message for UI display
      const tempMessage: Message = {
        id: tempId,
        conversationId: parseInt(conversationId),
        senderId: user.id,
        content: content.trim(),
        timestamp: new Date(),
        isRead: false
      };
      
      // Add to UI immediately for instant feedback
      setMessages(prev => [...prev, tempMessage]);
      
      // Track this message ID as processed to avoid duplication 
      processedMessageIds.current.add(tempId);
      
      // Send message via socket only - server will handle persistence
      sendMessage(parseInt(conversationId), content.trim());
      
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
      
      setSendingMessage(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setSendingMessage(false);
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
    // Hide the main app header on Chat page
    document.documentElement.style.setProperty('--hide-header-mobile', 'None');
    
    // On component mount, force a layout update for mobile
    const timeoutId = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      // Restore header visibility when leaving the chat page
      document.documentElement.style.setProperty('--hide-header-mobile', 'block');
      // Also ensure navbar visibility is restored
      document.documentElement.style.setProperty('--hide-navbar-mobile', 'grid');
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
      className="flex bg-default-50 w-full h-screen max-h-screen overflow-hidden"
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
      <div className={`flex-1 h-full ${
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
          <ChatView 
            chat={activeChat}
            messages={messages}
            currentUser={currentUser}
            onBack={() => navigate('/chat')}
            onSendMessage={handleSendMessage}
            isLoading={loading}
            typingUsers={typingUsers}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        )}
      </div>
    </div>
  );
};