import React, { useState, useEffect, useRef, ChangeEvent, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Card, CardBody, Button, Input, Avatar, Divider,
  Badge as BadgeUI, Spinner, Textarea
} from '@heroui/react';
import { Icon } from '@iconify/react';
import * as chatService from '../services/chatService';
import { 
  getSocket, 
  joinConversation, 
  leaveConversation,
  markConversationAsRead,
  startTyping,
  stopTyping
} from '../services/socketService';
import { Conversation, Message, User } from '../services/chatService';

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Effect to fetch conversations
  useEffect(() => {
    document.documentElement.style.setProperty('--hide-header-mobile', 'None');
    const fetchConversations = async () => {
      try {
        const data = await chatService.getConversations();
        setConversations(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setError('Failed to load conversations');
        setLoading(false);
      }
    };
    
    fetchConversations();
  }, []);
  
  // Effect to handle conversation change
  useEffect(() => {
    // Clear previous conversation
    if (activeConversation) {
      leaveConversation(activeConversation.id);
    }
    
    // Reset messages when conversation changes
    setMessages([]);
    
    if (conversationId) {
      const fetchConversationAndMessages = async () => {
        try {
          setLoading(true);
          
          // Fetch conversation details
          const conversation = await chatService.getConversation(parseInt(conversationId));
          setActiveConversation(conversation);
          
          // Fetch messages
          const messages = await chatService.getMessages(parseInt(conversationId));
          setMessages(messages.reverse()); // API returns newest first, reverse for display
          
          // Join the conversation room via socket
          joinConversation(parseInt(conversationId));
          
          // Mark conversation as read
          markConversationAsRead(parseInt(conversationId));
          await chatService.markConversationAsRead(parseInt(conversationId));
          
          // Update unread count in conversations list
          setConversations(prevConversations => 
            prevConversations.map(c => 
              c.id === parseInt(conversationId) ? { ...c, unread_count: 0 } : c
            )
          );
          
          setLoading(false);
        } catch (error) {
          console.error('Error fetching conversation and messages:', error);
          setError('Failed to load conversation');
          setLoading(false);
        }
      };
      
      fetchConversationAndMessages();
    }
    
    return () => {
      // Cleanup: leave room when unmounting or changing conversations
      if (conversationId) {
        leaveConversation(parseInt(conversationId));
      }
    };
  }, [conversationId]);
  
  // Socket event listeners
  useEffect(() => {
    const socket = getSocket();
    
    if (!socket) return;
    
    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      if (message.conversation_id === parseInt(conversationId || '0')) {
        setMessages(prev => [...prev, message]);
        
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
      }
      
      // Update conversation list (last message, unread count)
      setConversations(prev => 
        prev.map(c => {
          if (c.id === message.conversation_id) {
            // If active conversation, mark as read
            const newUnreadCount = parseInt(conversationId || '0') === c.id 
              ? 0 
              : c.unread_count + (message.sender_id !== user?.id ? 1 : 0);
            
            return {
              ...c,
              last_message: message.content,
              last_message_at: message.created_at,
              unread_count: newUnreadCount
            };
          }
          return c;
        }).sort((a, b) => 
          // Sort by last message date, newest first
          new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        )
      );
    };
    
    // Listen for typing indicators
    const handleTypingStart = (data: { userId: number, conversationId: number }) => {
      if (data.userId === user?.id) return; // Ignore own typing
      
      if (data.conversationId === parseInt(conversationId || '0')) {
        // Find user name from participants
        const typingUser = activeConversation?.participants.find(p => p.id === data.userId);
        if (typingUser) {
          setTypingUsers(prev => ({
            ...prev,
            [data.userId]: `${typingUser.first_name} ${typingUser.last_name}`
          }));
        }
      }
    };
    
    const handleTypingStop = (data: { userId: number, conversationId: number }) => {
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
      // Update UI to show message has been read
      console.log(`User ${data.userId} read conversation ${data.conversationId}`);
    };
    
    socket.on('message:received', handleNewMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('conversation:read', handleConversationRead);
    
    return () => {
      socket.off('message:received', handleNewMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('conversation:read', handleConversationRead);
    };
  }, [conversationId, activeConversation, user?.id]);
  
  // Helper function to determine if a message is the last in a sequence from the same sender
  const isLastConsecutiveMessage = (index: number, messages: Message[]): boolean => {
    return index === messages.length - 1 || 
      messages[index + 1].sender_id !== messages[index].sender_id;
  };
  
  // Improved auto-scroll to bottom when messages change or conversation changes
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      // Use a small timeout to ensure DOM has updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, conversationId]);
  
  // Always scroll to bottom when a conversation is first loaded or when new messages arrive
  useLayoutEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView();
    }
  }, [messages, conversationId]);
  
  // When messages are loaded, scroll to bottom immediately
  useEffect(() => {
    if (!loading && messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  }, [loading, messages.length]);
  
  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Create new chat with user ID 2
  const createNewChat = async () => {
    try {
      setCreatingChat(true);
      // Use ID 2 for the new chat - this would typically come from user selection
      const userId = 2;
      const conversation = await chatService.getOrCreateDirectConversation(userId);
      
      // Add to conversations list if it's not already there
      setConversations(prev => {
        const exists = prev.some(c => c.id === conversation.id);
        if (!exists) {
          return [conversation, ...prev];
        }
        return prev;
      });
      
      // Navigate to the new conversation
      navigate(`/chat/${conversation.id}`);
      setCreatingChat(false);
    } catch (error) {
      console.error('Error creating new conversation:', error);
      setError('Failed to create conversation');
      setCreatingChat(false);
    }
  };
  
  // Handle message typing
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    
    if (!conversationId) return;
    
    // Send typing indicator
    if (e.target.value.length > 0) {
      startTyping(parseInt(conversationId));
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(parseInt(conversationId));
      }, 3000);
    } else {
      // If message is empty, stop typing
      stopTyping(parseInt(conversationId));
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };
  
  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId || !user) return;
    
    try {
      setSendingMessage(true);
      
      // Temporary optimistic message
      const optimisticMessage: Message = {
        id: -1, // Temporary ID
        conversation_id: parseInt(conversationId),
        sender_id: user.id,
        content: messageText,
        created_at: new Date().toISOString(),
        is_read: false,
        sender: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          profile_picture: user.profilePic
        }
      };
      
      // Add to UI immediately (optimistic update)
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Reset input
      setMessageText('');
      
      // Stop typing indicator
      stopTyping(parseInt(conversationId));
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Send via API (the Socket handler will broadcast to all users)
      await chatService.sendMessage(parseInt(conversationId), messageText);
      
      setSendingMessage(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setSendingMessage(false);
      // Could show an error toast here
    }
  };
  
  // Get participant names for conversation title
  const getConversationTitle = (conversation: Conversation): string => {
    if (conversation.title) return conversation.title;
    
    // For direct conversations, show the other person's name
    if (!conversation.is_group) {
      const otherParticipant = conversation.participants.find(p => p.id !== user?.id);
      if (otherParticipant) {
        return `${otherParticipant.first_name} ${otherParticipant.last_name}`;
      }
    }
    
    // Fallback
    return `Conversation #${conversation.id}`;
  };
  
  // Handle conversation click
  const handleConversationClick = (conversationId: number) => {
    // Force push to new page to ensure proper state update
    window.location.href = `/chat/${conversationId}`;
  };
  
  // Format date for display
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Today - show time only
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Within a week - show day and time
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + 
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Older - show date
    return date.toLocaleDateString();
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
    };
  }, []);
  
  return (
    <div className="chat-container bg-default-100">
      <div className="flex flex-1 h-full overflow-hidden">
        {/* Conversations sidebar - full width on mobile when no conversation is selected */}
        <div className={`w-full md:w-80 flex-shrink-0 border-r border-default-200 bg-white chat-conversation-list ${
          conversationId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Fixed header for conversations list */}
          <div className="chat-header p-4 border-b border-default-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Messages</h2>
            <Button 
              isIconOnly
              size="sm"
              variant="flat"
              aria-label="New conversation"
              onClick={createNewChat}
              isLoading={creatingChat}
            >
              <Icon icon="lucide:plus" />
            </Button>
          </div>
          
          {/* Scrollable conversations list */}
          <div className="flex-1 overflow-y-auto">
            {loading && !conversationId ? (
              <div className="flex justify-center items-center h-full">
                <Spinner size="lg" />
              </div>
            ) : error ? (
              <div className="p-4 text-center text-danger">
                <p>{error}</p>
                <Button 
                  size="sm" 
                  color="primary" 
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-default-500">
                <p>No conversations yet</p>
                <Button
                  size="sm"
                  color="primary"
                  className="mt-2"
                  onClick={createNewChat}
                  isLoading={creatingChat}
                >
                  Start a chat with User #2
                </Button>
              </div>
            ) : (
              conversations.map(conversation => (
                <div 
                  key={conversation.id}
                  className={`p-3 border-b border-default-200 cursor-pointer hover:bg-default-100 transition-colors ${
                    parseInt(conversationId || '0') === conversation.id ? 'bg-primary-100' : ''
                  }`}
                  onClick={() => handleConversationClick(conversation.id)}
                >
                  <div className="flex items-center">
                    {conversation.is_group ? (
                      <Avatar
                        size="md"
                        icon={<Icon icon="lucide:users" />}
                        className="bg-primary-200 text-primary"
                      />
                    ) : (
                      <Avatar
                        size="md"
                        src={conversation.participants.find(p => p.id !== user?.id)?.profile_picture}
                        name={getConversationTitle(conversation).substring(0, 2)}
                      />
                    )}
                    
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex justify-between">
                        <h3 className="font-medium text-default-900 truncate">
                          {getConversationTitle(conversation)}
                        </h3>
                        <span className="text-xs text-default-500">
                          {formatMessageDate(conversation.last_message_at)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-sm text-default-500 truncate mr-2">
                          {conversation.last_message || 'No messages yet'}
                        </p>
                        
                        {conversation.unread_count > 0 && (
                          <BadgeUI color="primary">
                            {conversation.unread_count}
                          </BadgeUI>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Mobile floating action button to create new chat */}
          <div className="md:hidden fixed bottom-20 right-4 z-20">
            <Button
              color="primary"
              isIconOnly
              size="lg"
              className="rounded-full shadow-lg"
              onClick={createNewChat}
              isLoading={creatingChat}
            >
              <Icon icon="lucide:plus" width={24} height={24} />
            </Button>
          </div>
        </div>
        
        {/* Chat/messages area - full width on mobile when conversation is selected */}
        <div className={`w-full flex-1 flex flex-col h-full relative ${
          conversationId ? 'flex' : 'hidden md:flex'
        }`}>
          {!conversationId ? (
            <div className="flex-1 flex justify-center items-center">
              <div className="text-center p-4">
                <Icon icon="lucide:message-circle" className="text-6xl text-default-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Your Messages</h3>
                <p className="text-default-500 max-w-md">
                  Select a conversation to view your messages or start a new one.
                </p>
                <Button
                  color="primary"
                  className="mt-4"
                  onClick={createNewChat}
                  isLoading={creatingChat}
                >
                  Start a chat with User #2
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Fixed conversation header */}
              <div className="chat-header p-3 border-b border-default-200 flex items-center">
                <Button 
                  className="mr-2" 
                  isIconOnly 
                  variant="flat" 
                  size="sm"
                  onClick={() => navigate('/chat')}
                >
                  <Icon icon="lucide:arrow-left" />
                </Button>
                
                {activeConversation && (
                  <>
                    {activeConversation.is_group ? (
                      <Avatar
                        size="sm"
                        icon={<Icon icon="lucide:users" />}
                        className="bg-primary-200 text-primary"
                      />
                    ) : (
                      <Avatar
                        size="sm"
                        src={activeConversation.participants.find(p => p.id !== user?.id)?.profile_picture}
                        name={getConversationTitle(activeConversation).substring(0, 2)}
                      />
                    )}
                    
                    <div className="ml-3 flex-1 truncate">
                      <h3 className="font-medium truncate">
                        {getConversationTitle(activeConversation)}
                      </h3>
                      
                      {Object.keys(typingUsers).length > 0 && (
                        <p className="text-xs text-default-500 truncate">
                          {Object.values(typingUsers).join(', ')} typing...
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {/* Scrollable messages area with padding for input field */}
              <div className="chat-messages">
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <Spinner size="lg" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex justify-center items-center h-full text-center">
                    <div>
                      <Icon icon="lucide:message-circle" className="text-4xl text-default-300 mx-auto mb-2" />
                      <p className="text-default-500">No messages yet</p>
                      <p className="text-sm text-default-400">Send a message to start the conversation</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => {
                      const isFromCurrentUser = message.sender_id === user?.id;
                      const isLast = isLastConsecutiveMessage(index, messages);
                      const isFirst = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                      
                      return (
                        <div 
                          key={message.id} 
                          className={`message-group ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {/* Show avatar for other user's last message in a sequence */}
                          {!isFromCurrentUser && isLast && (
                            <Avatar
                              size="sm"
                              src={message.sender.profile_picture}
                              name={`${message.sender.first_name} ${message.sender.last_name}`.substring(0, 2)}
                              className="message-avatar mr-2"
                            />
                          )}
                          
                          {/* Show avatar placeholder for consistent spacing for all but the last message in a sequence */}
                          {!isFromCurrentUser && !isLast && (
                            <div className="message-avatar-placeholder"></div>
                          )}
                          
                          <div className={`${isFromCurrentUser ? 'mr-2' : 'ml-2'} max-w-[70%]`}>
                            {/* Show sender name only for first message in sequence from other users */}
                            {!isFromCurrentUser && isFirst && (
                              <p className="text-xs text-default-500 mb-1 ml-1">
                                {message.sender.first_name} {message.sender.last_name}
                              </p>
                            )}
                            
                            <div className={`message-bubble ${
                              isFromCurrentUser 
                                ? 'bg-primary' 
                                : 'bg-white'
                            }`}>
                              <p>{message.content}</p>
                            </div>
                            
                            <div className="message-timestamp">
                              {formatMessageDate(message.created_at)}
                            </div>
                          </div>
                          
                          {/* Show avatar only for current user's last message in a sequence */}
                          {isFromCurrentUser && isLast && (
                            <Avatar
                              size="sm"
                              src={user?.profilePic}
                              name={`${user?.first_name} ${user?.last_name}`.substring(0, 2)}
                              className="message-avatar ml-2"
                            />
                          )}
                          
                          {/* Show avatar placeholder for consistent spacing for all but the last message in a sequence */}
                          {isFromCurrentUser && !isLast && (
                            <div className="message-avatar-placeholder"></div>
                          )}
                        </div>
                      );
                    })}
                    
                    <div ref={messagesEndRef} className="h-px"></div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sticky message input - always at bottom above navbar */}
      {conversationId && (
        <div className={`chat-input-container ${isDesktop ? 'desktop' : ''}`}>
          <div className="flex items-end chat-input-wrapper">
            <Textarea
              value={messageText}
              onChange={(e: any) => handleMessageChange(e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message..."
              minRows={1}
              maxRows={3}
              className="flex-1 resize-none"
              disabled={sendingMessage}
              autoFocus
            />
            
            <Button
              color="primary"
              className="ml-2 mb-1"
              isIconOnly
              onClick={handleSendMessage}
              isLoading={sendingMessage}
              disabled={!messageText.trim()}
            >
              <Icon icon="lucide:send" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}; 