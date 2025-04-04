import React, { useState, useEffect, useRef, useContext, createContext } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
// Import Heroicons
import { Icon } from "@iconify/react";
import {
  Card,
  CardBody,
  Input,
  Button,
  Avatar,
  Divider,
  ScrollShadow,
  User,
  Tooltip
} from "@heroui/react";
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
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showConversations, setShowConversations] = useState(true);
  const { setHideNavbar } = useContext(NavbarContext);
  const [messageOffset, setMessageOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
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
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
    
    // Alternative method to ensure we're at the bottom
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };

  // Modify scrollToBottom logic to be more reliable
  useEffect(() => {
    // Only auto-scroll when the messages change
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);
  
  // Always scroll to bottom when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      // Use a very short timeout to ensure the DOM has updated
      setTimeout(scrollToBottom, 0);
    }
  }, [selectedConversation]);

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

            // Scroll to bottom immediately without animation
            setTimeout(scrollToBottom, 0);
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
          setLoading(false);
          
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

  // Function to load more messages when scrolling up
  const loadMoreMessages = async () => {
    if (!selectedConversation || !hasMoreMessages || loadingMore) {
      return;
    }
    
    try {
      setLoadingMore(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        console.error('No access token found');
        setLoadingMore(false);
        return;
      }
      
      // Save scroll position and height before loading more messages
      const container = messageContainerRef.current;
      const oldScrollHeight = container?.scrollHeight || 0;
      
      const response = await axios.get(
        `${API_URL}/api/chat/conversations/${selectedConversation.id}/messages`,
        { 
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            limit: 50,
            offset: messageOffset
          }
        }
      );
      
      if (response.data && Array.isArray(response.data)) {
        // Process new messages
        const newMessages = response.data.reduce((acc: Message[], message: Message) => {
          // Check if already processed
          if (processedMessageIds.current.has(message.id)) {
            return acc;
          }
          
          // Add to processed set
          processedMessageIds.current.add(message.id);
          
          acc.push(message);
          return acc;
        }, []);
        
        // Update hasMoreMessages flag
        setHasMoreMessages(response.data.length >= 50);
        
        if (newMessages.length > 0) {
          // Add new messages to the beginning of the array (older messages)
          setMessages(prevMessages => [...newMessages.reverse(), ...prevMessages]);
          setMessageOffset(messageOffset + 50);
          
          // Restore scroll position after new messages are added
          setTimeout(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              const heightDifference = newScrollHeight - oldScrollHeight;
              container.scrollTop = heightDifference;
            }
          }, 50);
        } else {
          // No new messages
          setHasMoreMessages(false);
        }
      } else {
        console.error('Invalid response format for older messages:', response.data);
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      
      // Handle specific errors
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          console.log('Rate limited, try again later');
        } else if (error.response?.status === 401) {
          console.error('Authentication error');
        }
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle scroll event to detect when user reaches top of messages
  const handleMessagesScroll = () => {
    const container = messageContainerRef.current;
    if (container && container.scrollTop <= 20 && hasMoreMessages && !loadingMore) {
      loadMoreMessages();
    }
  };

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

  // Helper to check if element accepts input
  const acceptsInput = (elem: HTMLElement | null) => {
    if (!elem) return false;
    
    const tag = elem.tagName;
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || 
           elem.isContentEditable || (elem.tabIndex !== undefined && elem.tabIndex >= 0);
  };
  
  // Set up the keyboard event listener for mobile
  useEffect(() => {
    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const dontDiscardKeyboard = target.classList.contains('do-not-hide-keyboard');
      
      if (dontDiscardKeyboard) {
        // Prevent default behavior but allow the click to proceed
        e.preventDefault();
        // We'll let the normal click handler process the action
      } else if (!acceptsInput(target)) {
        // If clicking outside of input elements, hide keyboard
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };
    
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

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
      
      // Clear the input field but keep focus
      setNewMessage('');
      
      // Ensure input field maintains focus after sending
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }, 0);
      
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

  // Focus the input field when the component mounts or conversation changes
  useEffect(() => {
    if (messageInputRef.current && selectedConversation) {
      messageInputRef.current.focus();
    }
  }, [selectedConversation]);

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

  const handleBackToList = () => {
    setShowConversations(true);
  };
  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (isMobile) {
      setShowConversations(false);
    }
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
    <div className="flex h-[calc(100vh-64px)] gap-4 p-4 bg-content1">
      {/* Conversations List */}
      <Card 
        className={`${
          isMobile 
            ? showConversations ? "w-full" : "hidden" 
            : "w-[380px]"
        } p-0 h-full`}
      >
        <CardBody className="p-0 h-full">
          <div className="p-4 border-b border-divider">
            <Input
              placeholder="Search conversations..."
              startContent={<Icon icon="lucide:search" className="text-default-400" />}
              size="sm"
              radius="lg"
            />
          </div>
          
          <ScrollShadow className="h-[calc(100%-65px)]">
            <div className="p-2 space-y-1">
              {conversations.map((conversation) => (
                <Button
                  key={conversation.id}
                  className="w-full justify-start p-2 h-auto"
                  color={selectedConversation?.id === conversation.id ? "primary" : "default"}
                  variant={selectedConversation?.id === conversation.id ? "flat" : "light"}
                  onPress={() => handleConversationSelect(conversation)}
                >
                  <User
                    name={`${conversation.other_user.first_name} ${conversation.other_user.last_name}`}
                    description={conversation.last_message?.content || "No messages yet"}
                    avatarProps={{
                      src: conversation.other_user.profile_picture,
                      name: `${conversation.other_user.first_name} ${conversation.other_user.last_name}`,
                      size: "sm"
                    }}
                  />
                </Button>
              ))}
            </div>
          </ScrollShadow>
        </CardBody>
      </Card>

      {/* Chat Area */}
      <Card 
        className={`${
          isMobile 
            ? showConversations ? "hidden" : "w-full" 
            : "flex-1"
        } p-0 h-full`}
      >
        <CardBody className="p-0 h-full flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-divider flex items-center gap-2">
                {isMobile && (
                  <Button
                    isIconOnly
                    variant="light"
                    onPress={handleBackToList}
                    className="mr-2"
                  >
                    <Icon icon="lucide:chevron-left" width={24} />
                  </Button>
                )}
                <User
                  name={`${selectedConversation.other_user.first_name} ${selectedConversation.other_user.last_name}`}
                  description="Active now"
                  avatarProps={{
                    src: selectedConversation.other_user.profile_picture,
                    name: `${selectedConversation.other_user.first_name} ${selectedConversation.other_user.last_name}`
                  }}
                />
              </div>

              {/* Messages Area */}
              <ScrollShadow 
                className="flex-1 p-4" 
                ref={messageContainerRef}
                onScroll={handleMessagesScroll}
              >
                <div className="space-y-4">
                  {loadingMore && (
                    <div className="flex justify-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  )}
                  <div ref={messagesStartRef} />
                  {messages.map((message) => {
                    const isMyMessage = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-xl ${
                            isMyMessage
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-default-100 rounded-bl-sm"
                          }`}
                        >
                          <p>{message.content}</p>
                          <span className={`text-tiny ${isMyMessage ? "text-primary-foreground/70" : "text-default-400"}`}>
                            {format(new Date(message.created_at), "h:mm a")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollShadow>

              {/* Message Input */}
              <div className="p-4 border-t border-divider">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    ref={messageInputRef}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    size="lg"
                    radius="lg"
                    autoComplete="off"
                    startContent={
                      <Tooltip content="Add attachment">
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          className="text-default-400"
                        >
                          <Icon icon="lucide:paperclip" width={20} />
                        </Button>
                      </Tooltip>
                    }
                  />
                  <Button
                    type="submit"
                    color="primary"
                    size="lg"
                    isIconOnly
                    radius="lg"
                    onPress={() => {
                      // Submit the form programmatically
                      handleSendMessage({
                        preventDefault: () => {}
                      } as React.FormEvent);
                      
                      // Re-focus the input after submit
                      setTimeout(() => {
                        if (messageInputRef.current) {
                          messageInputRef.current.focus();
                        }
                      }, 0);
                    }}
                  >
                    <Icon icon="lucide:send" width={20} />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Icon
                  icon="lucide:message-square"
                  className="w-12 h-12 mx-auto text-default-400"
                />
                <p className="text-default-500">
                  Select a conversation to start chatting
                </p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default Chat; 