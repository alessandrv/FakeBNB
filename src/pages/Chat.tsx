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
  sendMessage
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
          
          // Join the conversation room via socket
          joinConversation(parseInt(conversationId));
          
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
        joinConversation(parseInt(conversationId));
      }
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected in Chat component');
      if (user && isComponentMounted) {
        setChats(prev => prev.map(chat => ({
          ...chat,
          participants: chat.participants.map(p => 
            p.id === user.id ? { ...p, isOnline: false } : p
          )
        })));
      }
    };

    // Listen for new messages
    const handleNewMessage = (message: any) => {
      if (!isComponentMounted) return;
      
      console.log('Received new message in Chat component:', message);
      
      // Skip processing if this is your own message - you'll handle it in handleSendMessage or handleMessageSent
      if (message.sender_id === user?.id) {
        console.log('Skipping own message in handleNewMessage');
        return;
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

    // Add all event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('message:received', handleNewMessage);
    socket.on('message:sent', handleMessageSent);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('conversation:read', handleConversationRead);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);
    
    // Cleanup function
    return () => {
      isComponentMounted = false;
      console.log('Cleaning up socket event listeners in Chat component');
      
      // Set current user as offline when component unmounts
      if (user) {
        setChats(prev => prev.map(chat => ({
          ...chat,
          participants: chat.participants.map(p => 
            p.id === user.id ? { ...p, isOnline: false } : p
          )
        })));
      }

      // Remove all event listeners
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('message:received', handleNewMessage);
      socket.off('message:sent', handleMessageSent);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('conversation:read', handleConversationRead);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);

      // Leave the conversation if we were in one
      if (conversationId) {
        leaveConversation(parseInt(conversationId));
      }
    };
  }, [conversationId, user?.id]);
  
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