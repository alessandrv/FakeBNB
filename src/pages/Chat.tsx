import React, { useState, useEffect, useRef, useContext, createContext } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
// Import Heroicons
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, UserCircleIcon, ArrowLeftIcon, PlusIcon, UserPlusIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid, PaperAirplaneIcon as PaperAirplaneIconSolid, ChatBubbleLeftIcon as ChatBubbleLeftIconSolid } from '@heroicons/react/24/solid';

// Define API URL with a fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Define types
interface User {
  id: number;
  first_name: string;
  last_name: string;
  profile_picture?: string;
}

interface Message {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  sender: User;
  conversation_id: number;
}

interface Conversation {
  id: number;
  title?: string;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  other_user: User;
  last_message?: {
    id: number;
    content: string;
    created_at: string;
    sender_id: number;
  };
}

// Create a context to control navbar visibility
export const NavbarContext = createContext<{
  hideNavbar: boolean;
  setHideNavbar: (hide: boolean) => void;
}>({
  hideNavbar: false,
  setHideNavbar: () => {},
});

// Add a default avatar component
const DefaultAvatar: React.FC<{ firstName: string; lastName: string }> = ({ firstName, lastName }) => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-lg">
      {initials}
    </div>
  );
};

const Chat: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUserId, setOtherUserId] = useState<number | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showConversations, setShowConversations] = useState(true);
  const { setHideNavbar } = useContext(NavbarContext);
  
  // Track processed message IDs to prevent duplicates
  const processedMessageIds = useRef<Set<number>>(new Set());
  
  // Debounce function to prevent rapid processing of the same message
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Check for mobile screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hide navbar when in chat view on mobile
  useEffect(() => {
    if (isMobile && selectedConversation && !showConversations) {
      setHideNavbar(true);
    } else {
      setHideNavbar(false);
    }
    
    // Cleanup function to restore navbar when component unmounts
    return () => {
      setHideNavbar(false);
    };
  }, [isMobile, selectedConversation, showConversations, setHideNavbar]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Modify scrollToBottom logic to be more reliable
  useEffect(() => {
    // Only auto-scroll when the messages change
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        console.log('Connecting to socket with token');
        
        const newSocket = io(API_URL, {
          auth: { token },
          withCredentials: true,
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 20000
        });

        newSocket.on('connect', () => {
          console.log('Socket connected successfully with ID:', newSocket.id);
          console.log('Socket transport:', newSocket.io.engine.transport.name);
          
          // Join all conversation rooms on connection
          if (conversations.length > 0) {
            console.log('Joining all conversation rooms on connection');
            conversations.forEach((conv: Conversation) => {
              console.log(`Joining room: conversation:${conv.id}`);
              newSocket.emit('join_conversation', conv.id);
            });
          }
        });

        // Track when we join a room
        newSocket.on('joined_room', (room: string) => {
          console.log('Joined room:', room);
          setCurrentRoom(room);
          
          // Process any pending messages now that we have room context
          processPendingMessages();
        });

        // Track when we leave a room
        newSocket.on('left_room', (room: string) => {
          console.log('Left room:', room);
          if (currentRoom === room) {
            setCurrentRoom(null);
          }
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          console.log('Current transport:', newSocket.io.engine.transport.name);
        });

        newSocket.on('reconnect_attempt', (attemptNumber) => {
          console.log(`Attempting to reconnect (${attemptNumber})`);
        });

        newSocket.on('reconnect', () => {
          console.log('Socket reconnected successfully');
          // Re-join conversation room if one is selected
          if (selectedConversation) {
            console.log(`Re-joining conversation room: conversation:${selectedConversation.id}`);
            newSocket.emit('join_conversation', selectedConversation.id);
          }
        });

        newSocket.on('reconnect_error', (error) => {
          console.error('Socket reconnection error:', error);
        });

        newSocket.on('reconnect_failed', () => {
          console.error('Socket reconnection failed');
        });

        // Debounced message handler to prevent duplicate processing
        const debouncedHandleNewMessage = debounce((message: any) => {
          console.log('Processing debounced message:', message);
          
          // Check if we've already processed this message
          if (processedMessageIds.current.has(message.id)) {
            console.log('Message already processed, skipping:', message.id);
            return;
          }
          
          // Mark this message as processed
          processedMessageIds.current.add(message.id);
          
          // If message doesn't have conversation_id, try to infer it
          if (!message.conversation_id) {
            console.log('Message missing conversation_id, attempting to infer it');
            
            // If we have a selected conversation, use its ID
            if (selectedConversation) {
              console.log('Using current conversation ID:', selectedConversation.id);
              message.conversation_id = selectedConversation.id;
            } else if (currentRoom && currentRoom.startsWith('conversation:')) {
              // Use the current room to infer the conversation ID
              const inferredId = parseInt(currentRoom.split(':')[1], 10);
              if (!isNaN(inferredId)) {
                console.log('Inferred conversation ID from current room:', inferredId);
                message.conversation_id = inferredId;
              }
            }
            
            // If we still don't have a conversation_id, add to pending queue
            if (!message.conversation_id) {
              console.log('Could not infer conversation_id, adding to pending queue');
              setPendingMessages(prev => [...prev, message]);
              return;
            }
          }
          
          // Process the message
          processMessage(message);
        }, 300); // 300ms debounce

        newSocket.on('new_message', (message: any) => {
          console.log('Received new message event:', message);
          debouncedHandleNewMessage(message);
        });

        newSocket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
        });

        setSocket(newSocket);

        return () => {
          console.log('Cleaning up socket connection');
          if (selectedConversation) {
            newSocket.emit('leave_conversation', selectedConversation.id);
          }
          newSocket.disconnect();
        };
      }
    }
  }, [isAuthenticated, user, conversations]);

  // Handle conversation selection
  useEffect(() => {
    if (socket && selectedConversation) {
      console.log(`Joining conversation room: conversation:${selectedConversation.id}`);
      socket.emit('join_conversation', selectedConversation.id);
      
      // Update current room
      setCurrentRoom(`conversation:${selectedConversation.id}`);
      
      // Process any pending messages now that we have conversation context
      processPendingMessages();
      
      return () => {
        console.log(`Leaving conversation room: conversation:${selectedConversation.id}`);
        socket.emit('leave_conversation', selectedConversation.id);
        
        // Clear current room if it's the one we're leaving
        if (currentRoom === `conversation:${selectedConversation.id}`) {
          setCurrentRoom(null);
        }
      };
    }
  }, [socket, selectedConversation, currentRoom]);

  // Join conversation rooms when conversations change
  useEffect(() => {
    if (socket && conversations.length > 0) {
      console.log('Joining conversation rooms when conversations change');
      conversations.forEach((conv: Conversation) => {
        console.log(`Joining room: conversation:${conv.id}`);
        socket.emit('join_conversation', conv.id);
      });
    }
  }, [socket, conversations]);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (isAuthenticated) {
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) {
            console.error('No access token found');
            setLoading(false);
            return;
          }
          
          const response = await axios.get(`${API_URL}/api/chat/conversations`, {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.data && Array.isArray(response.data)) {
          setConversations(response.data);
          } else {
            console.error('Invalid response format for conversations:', response.data);
            setConversations([]);
          }
          
          setLoading(false);
        } catch (error) {
          console.error('Error fetching conversations:', error);
          setLoading(false);
          
          // Handle rate limiting
          if (axios.isAxiosError(error) && error.response?.status === 429) {
            console.log('Rate limited, retrying after delay...');
            // Retry after a delay
            setTimeout(() => {
              fetchConversations();
            }, 5000); // 5 second delay
          } else if (axios.isAxiosError(error) && error.response?.status === 401) {
            console.error('Authentication error, token may be invalid');
            // You might want to redirect to login or refresh the token here
          } else if (axios.isAxiosError(error) && !error.response) {
            console.error('Network error, server may be unreachable');
          }
        }
      }
    };

    fetchConversations();
  }, [isAuthenticated]);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedConversation && isAuthenticated) {
        // Validate conversation ID
        if (!selectedConversation.id) {
          console.error('Cannot fetch messages: conversation ID is undefined or null');
          return;
        }
        
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) {
            console.error('No access token found');
            return;
          }
          
          const response = await axios.get(
            `${API_URL}/api/chat/conversations/${selectedConversation.id}/messages`,
            { 
              withCredentials: true,
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          
          if (response.data && Array.isArray(response.data)) {
            // Clear the processed message IDs set when fetching new messages
            processedMessageIds.current.clear();
            
            // Reverse the messages to show oldest first (bottom to top)
            // Also deduplicate messages by ID and created_at
            const uniqueMessages = response.data.reduce((acc: Message[], message: Message) => {
              // Add to processed set to prevent duplicates
              processedMessageIds.current.add(message.id);
              
              const exists = acc.some(msg => 
                msg.id === message.id && 
                msg.created_at === message.created_at
              );
              
              if (!exists) {
                acc.push(message);
              }
              
              return acc;
            }, []);
            
            setMessages(uniqueMessages.reverse());

            // Add a small delay to ensure the DOM has updated before scrolling
            setTimeout(() => {
              scrollToBottom();
            }, 100);
          } else {
            console.error('Invalid response format for messages:', response.data);
            setMessages([]);
          }
          
          // On mobile, hide conversations when a chat is selected
          if (isMobile) {
            setShowConversations(false);
          }
        } catch (error) {
          console.error('Error fetching messages:', error);
          
          // Handle rate limiting
          if (axios.isAxiosError(error) && error.response?.status === 429) {
            console.log('Rate limited, retrying after delay...');
            // Retry after a delay
            setTimeout(() => {
              fetchMessages();
            }, 5000); // 5 second delay
          } else if (axios.isAxiosError(error) && error.response?.status === 401) {
            console.error('Authentication error, token may be invalid');
          } else if (axios.isAxiosError(error) && error.response?.status === 500) {
            console.error('Server error when fetching messages');
          } else if (axios.isAxiosError(error) && !error.response) {
            console.error('Network error, server may be unreachable');
          }
        }
      }
    };

    fetchMessages();
  }, [selectedConversation, isAuthenticated, isMobile]);

  // Process a message with conversation_id
  const processMessage = (message: any) => {
    // Ensure the message has the correct format
    const formattedMessage: Message = {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      sender_id: message.sender_id,
      conversation_id: message.conversation_id,
      sender: message.sender || {
        id: message.sender_id,
        first_name: 'User',
        last_name: '',
        profilePic: ''
      }
    };
    
    console.log('Processing formatted message:', formattedMessage);
    console.log('Current conversation:', selectedConversation);
    
    // Only add the message if it's for the current conversation
    if (selectedConversation && formattedMessage.conversation_id === selectedConversation.id) {
      console.log('Adding message to current conversation:', formattedMessage);
      setMessages(prevMessages => {
        // Check if message already exists to prevent duplicates
        // Use both ID and created_at to ensure uniqueness
        const exists = prevMessages.some(msg => 
          msg.id === formattedMessage.id && 
          msg.created_at === formattedMessage.created_at
        );
        
        if (exists) {
          console.log('Message already exists, not adding again');
          return prevMessages;
        }
        
        console.log('Adding new message to state');
        return [...prevMessages, formattedMessage];
      });
      scrollToBottom();
    } else {
      console.log('Message not for current conversation or no conversation selected');
      
      // If this is a new conversation, add it to the list
      if (!conversations.some(conv => conv.id === formattedMessage.conversation_id)) {
        console.log('Adding new conversation to list');
        // Fetch the conversation details
        const fetchConversation = async () => {
          try {
            // Validate that conversation_id is defined and not null
            if (!formattedMessage.conversation_id) {
              console.error('Cannot fetch conversation: conversation_id is undefined or null');
              return;
            }
            
            console.log(`Fetching conversation details for ID: ${formattedMessage.conversation_id}`);
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
              console.error('No access token found');
              return;
            }
            
            const response = await axios.get(
              `${API_URL}/api/chat/conversations/${formattedMessage.conversation_id}`,
              { 
                withCredentials: true,
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );
            
            console.log('Fetched conversation:', response.data);
            
            if (response.data && response.data.id) {
              setConversations(prevConversations => [response.data, ...prevConversations]);
              
              // Join the room for this conversation
              if (socket) {
                console.log(`Joining room for new conversation: conversation:${response.data.id}`);
                socket.emit('join_conversation', response.data.id);
              }
            } else {
              console.error('Invalid conversation data received:', response.data);
            }
          } catch (error) {
            console.error('Error fetching conversation:', error);
            
            // Handle specific error cases
            if (axios.isAxiosError(error)) {
              if (error.response?.status === 404) {
                console.error('Conversation not found');
              } else if (error.response?.status === 401) {
                console.error('Authentication error');
              } else if (error.response?.status === 500) {
                console.error('Server error');
              }
            }
          }
        };
        
        fetchConversation();
      }
    }
    
    // Update the conversation list to show the latest message
    setConversations(prevConversations => {
      return prevConversations.map(conv => {
        if (conv.id === formattedMessage.conversation_id) {
          console.log('Updating conversation in list:', conv.id);
          return {
            ...conv,
            last_message: {
              id: formattedMessage.id,
              content: formattedMessage.content,
              created_at: formattedMessage.created_at,
              sender_id: formattedMessage.sender_id
            },
            last_message_at: formattedMessage.created_at
          };
        }
        return conv;
      });
    });
  };

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || !isAuthenticated) {
      return;
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      
      // Create a temporary message ID for optimistic UI update
      const tempId = Date.now();
      const tempMessage = {
        id: tempId,
        content: newMessage,
        created_at: new Date().toISOString(),
        sender_id: user?.id || 0,
        conversation_id: selectedConversation.id,
        sender: {
          id: user?.id || 0,
          first_name: user?.first_name || '',
          last_name: user?.last_name || '',
          profilePic: user?.profilePic
        }
      };
      
      // Add the temporary message to the UI immediately
      setMessages(prevMessages => {
        // Check if a similar message already exists
        const exists = prevMessages.some(msg => 
          msg.content === newMessage && 
          msg.sender_id === user?.id && 
          msg.conversation_id === selectedConversation.id &&
          // Only consider it a duplicate if it was sent in the last 5 seconds
          Math.abs(new Date().getTime() - new Date(msg.created_at).getTime()) < 5000
        );
        
        if (exists) {
          console.log('Similar message already exists, not adding temporary message');
          return prevMessages;
        }
        
        return [...prevMessages, tempMessage];
      });
      
      setNewMessage('');
      scrollToBottom();
      
      // Update the conversation list with the temporary message
      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (conv.id === selectedConversation.id) {
            return {
              ...conv,
              last_message: {
                id: tempId,
                content: newMessage,
                created_at: new Date().toISOString(),
                sender_id: user?.id || 0
              },
              last_message_at: new Date().toISOString()
            };
          }
          return conv;
        });
      });
      
      // Send the message to the server
      const response = await axios.post(
        `${API_URL}/api/chat/conversations/${selectedConversation.id}/messages`,
        { content: newMessage },
        { 
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Add the real message ID to our processed set
      processedMessageIds.current.add(response.data.id);
      
      // Replace the temporary message with the real one from the server
      setMessages(prevMessages => {
        // Check if the real message already exists
        const exists = prevMessages.some(msg => 
          msg.id === response.data.id && 
          msg.created_at === response.data.created_at
        );
        
        if (exists) {
          console.log('Real message already exists, not replacing temporary message');
          return prevMessages;
        }
        
        // Remove the temporary message and add the real one
        return prevMessages
          .filter(msg => msg.id !== tempId)
          .concat(response.data);
      });
      
      // Update the conversation list with the real message
      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (conv.id === selectedConversation.id) {
            return {
              ...conv,
              last_message: {
                id: response.data.id,
                content: response.data.content,
                created_at: response.data.created_at,
                sender_id: response.data.sender_id
              },
              last_message_at: response.data.created_at
            };
          }
          return conv;
        });
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary message if there was an error
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== Date.now()));
    }
  };

  // Handle starting a new conversation
  const handleStartConversation = async () => {
    if (!otherUserId || !isAuthenticated) {
      return;
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_URL}/api/chat/conversations`,
        { otherUserId },
        { 
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Add the new conversation to the list
      setConversations(prevConversations => [response.data, ...prevConversations]);
      setSelectedConversation(response.data);
      setOtherUserId(null);
      
      // On mobile, hide conversations when a chat is selected
      if (isMobile) {
        setShowConversations(false);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  // Toggle conversations view on mobile
  const toggleConversations = () => {
    setShowConversations(!showConversations);
  };

  // Go back to conversations list on mobile
  const goBackToConversations = () => {
    setShowConversations(true);
  };

  // Process pending messages when we have more context
  const processPendingMessages = () => {
    if (pendingMessages.length === 0) return;
    
    console.log(`Processing ${pendingMessages.length} pending messages`);
    
    // Try to process each pending message
    const remainingMessages = pendingMessages.filter(message => {
      // Try to infer conversation_id again
      if (!message.conversation_id) {
        // If we have a selected conversation, use its ID
        if (selectedConversation) {
          console.log('Using current conversation ID for pending message:', selectedConversation.id);
          message.conversation_id = selectedConversation.id;
        } else if (currentRoom && currentRoom.startsWith('conversation:')) {
          // Use the current room to infer the conversation ID
          const inferredId = parseInt(currentRoom.split(':')[1], 10);
          if (!isNaN(inferredId)) {
            console.log('Inferred conversation ID from current room for pending message:', inferredId);
            message.conversation_id = inferredId;
          }
        }
        
        // If we still don't have a conversation_id, keep it in pending
        if (!message.conversation_id) {
          console.log('Still cannot infer conversation_id for pending message');
          return true; // Keep this message in the pending queue
        }
      }
      
      // Check if we've already processed this message
      if (processedMessageIds.current.has(message.id)) {
        console.log('Message already processed, skipping:', message.id);
        return false; // Remove from pending queue
      }
      
      // Mark this message as processed
      processedMessageIds.current.add(message.id);
      
      // Process the message
      processMessage(message);
      return false; // Remove this message from the pending queue
    });
    
    // Update pending messages with only those that couldn't be processed
    setPendingMessages(remainingMessages);
  };

  // Process pending messages when selected conversation changes
  useEffect(() => {
    processPendingMessages();
  }, [selectedConversation, currentRoom]);

  // Add a new effect to periodically check for pending messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingMessages.length > 0) {
        console.log('Periodic check for pending messages');
        processPendingMessages();
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [pendingMessages.length]);

  // Add a check to prevent reclicking on already selected conversations
  const handleConversationClick = (conversation: Conversation) => {
    // Check if this conversation is already selected
    if (selectedConversation?.id === conversation.id) {
      // If already selected, prevent reclick
      return;
    }

    // Update the conversation list item styling
    <div
      key={conversation.id}
      className={`p-4 mb-2 rounded-lg cursor-pointer transition-all flex items-center space-x-4 ${
        selectedConversation?.id === conversation.id
          ? 'bg-blue-50 border-2 border-blue-200'
          : 'bg-white border border-gray-200 hover:border-blue-200 hover:shadow-md'
      }`}
      onClick={() => setSelectedConversation(conversation)}
    >
      {/* Profile Picture */}
      {conversation.other_user && (
        conversation.other_user.profile_picture ? (
          <img
            src={conversation.other_user.profile_picture}
            alt={`${conversation.other_user.first_name} ${conversation.other_user.last_name}`}
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : (
          <DefaultAvatar 
            firstName={conversation.other_user.first_name}
            lastName={conversation.other_user.last_name}
          />
        )
      )}
    </div>
  };

  if (!isAuthenticated) {
    return <div className="p-4 text-center">Please log in to use the chat.</div>;
  }

  if (loading) {
    return <div className="p-4 text-center">Loading conversations...</div>;
  }

  return (
    <div className="flex h-screen">
      {/* Mobile header when in chat view */}
      {isMobile && selectedConversation && !showConversations && (
        <div className="fixed top-0 left-0 right-0 bg-white p-4 border-b border-gray-200 flex items-center z-50 shadow-md">
          <button 
            onClick={goBackToConversations}
            className="mr-3 text-blue-600 hover:text-blue-700 transition-colors p-2 rounded-full hover:bg-blue-50"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h3 className="font-bold text-lg">
              {selectedConversation.other_user
                ? `${selectedConversation.other_user.first_name} ${selectedConversation.other_user.last_name}`
                : 'Unknown User'}
            </h3>
            <p className="text-xs text-gray-500">Tap to view profile</p>
          </div>
        </div>
      )}

      {/* Conversations sidebar - hidden on mobile when in chat view */}
      <div className={`${isMobile ? (showConversations ? 'w-full' : 'hidden') : 'w-1/3'} border-r border-gray-200 bg-gray-50 overflow-y-auto`}>
        <div className="p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2 text-blue-600" /> 
            Conversations
          </h2>
          
          {/* Start new conversation */}
          <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center mb-2 text-gray-700">
              <UserPlusIcon className="h-5 w-5 mr-2 text-blue-600" />
              <span className="text-sm font-medium">Start New Conversation</span>
            </div>
            <input
              type="number"
              placeholder="Enter user ID to chat with"
              className="w-full p-3 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={otherUserId || ''}
              onChange={(e) => setOtherUserId(e.target.value ? parseInt(e.target.value) : null)}
            />
            <button
              className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
              onClick={handleStartConversation}
              disabled={!otherUserId}
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Start Conversation
            </button>
          </div>
        </div>
        
        {/* Conversations list */}
        <div className="p-4">
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 mb-2 rounded-lg cursor-pointer transition-all flex items-center space-x-4 ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : 'bg-white border border-gray-200 hover:border-blue-200 hover:shadow-md'
                }`}
                onClick={() => {
                  // If this conversation is already selected, deselect it
                  if (selectedConversation?.id === conversation.id) {
                    setSelectedConversation(null);
                  } else {
                    // Otherwise, select this conversation
                    setSelectedConversation(conversation);
                  }
                }}
              >
                {/* Profile Picture */}
                {conversation.other_user && (
                  conversation.other_user.profile_picture ? (
                    <img
                      src={conversation.other_user.profile_picture}
                      alt={`${conversation.other_user.first_name} ${conversation.other_user.last_name}`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : (
                    <DefaultAvatar 
                      firstName={conversation.other_user.first_name}
                      lastName={conversation.other_user.last_name}
                    />
                  )
                )}

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-gray-900 truncate">
                      {conversation.other_user
                        ? `${conversation.other_user.first_name} ${conversation.other_user.last_name}`
                        : 'Unknown User'}
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap ml-2">
                      {conversation.last_message 
                        ? format(new Date(conversation.last_message.created_at), 'MMM d, h:mm a')
                        : format(new Date(conversation.created_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {conversation.last_message?.content || 'No messages yet'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Chat area - full width on mobile when in chat view */}
      <div className={`${isMobile ? (showConversations ? 'hidden' : 'w-full') : 'flex-1'} flex flex-col bg-gray-50`}>
        {selectedConversation ? (
          <>
            {/* Chat header - only visible on desktop */}
            {!isMobile && (
            <div className="p-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
              <h3 className="font-bold text-lg">
                {selectedConversation.other_user
                  ? `${selectedConversation.other_user.first_name} ${selectedConversation.other_user.last_name}`
                  : 'Unknown User'}
              </h3>
            </div>
            )}
            
            {/* Messages */}
            <div 
              className={`flex-1 p-4 ${isMobile ? 'mt-16 mb-20' : ''} space-y-4`}
              style={{ 
                height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 180px)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div>No messages yet. Start the conversation!</div>
                </div>
              ) : (
                <>
                  <div className="py-4"> {/* Spacer at the top to ensure scrollability */}
                    {messages.length > 10 && <div className="text-center text-sm text-gray-500 mb-4">Scroll up for earlier messages</div>}
                  </div>
                  {messages.map((message) => (
                    <div
                      key={`${message.id}-${message.created_at}`}
                      className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] ${
                          message.sender_id === user?.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900'
                        } p-4 rounded-2xl shadow-sm ${
                          message.sender_id === user?.id
                            ? 'rounded-br-sm'
                            : 'rounded-bl-sm'
                        }`}
                      >
                        <div className="break-words">{message.content}</div>
                        <div className={`text-xs mt-1 ${
                          message.sender_id === user?.id
                            ? 'text-blue-100'
                            : 'text-gray-500'
                        }`}>
                          {format(new Date(message.created_at), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} className="pt-1" /> {/* Add some padding to ensure visibility */}
                </>
              )}
            </div>
            
            {/* Message input */}
            <form onSubmit={handleSendMessage} className={`p-4 bg-white border-t border-gray-200 ${isMobile ? 'fixed bottom-0 left-0 right-0 z-50' : ''} shadow-lg`}>
              <div className="flex max-w-4xl mx-auto">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-r-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium flex items-center justify-center"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
            <div className="text-center">
              <ChatBubbleLeftIconSolid className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat; 