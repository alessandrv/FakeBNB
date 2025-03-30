import React, { useEffect, useRef } from "react";
import { Avatar } from "@heroui/react";
import type { Message, User } from "../../types/chat";

interface ChatMessagesProps {
  messages: Message[];
  currentUser: User;
  otherUser: User;
  isLoading?: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  currentUser,
  otherUser,
  isLoading
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change (more immediate scroll)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      
      // Add a second scroll after a short delay to ensure we get to the bottom
      // This helps with dynamic content rendering
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
    }
  }, [messages]);
  
  // Handle resizes and ensure proper scrolling
  useEffect(() => {
    const handleScrollToBottom = () => {
      if (messagesEndRef.current) {
        // Immediate scroll
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        
        // Follow-up scroll to ensure we're at the bottom after layout stabilizes
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }, 200);
      }
    };
    
    // Listen for relevant events that might cause layout shifts
    window.addEventListener('resize', handleScrollToBottom);
    window.addEventListener('orientationchange', handleScrollToBottom);
    
    // Initial scroll - use multiple attempts to ensure it works
    handleScrollToBottom();
    
    // Additional scroll attempts with increasing delays to ensure it works
    // even if initial content rendering takes time
    const scrollAttempts = [50, 300, 600];
    const scrollTimeouts = scrollAttempts.map(delay => 
      setTimeout(handleScrollToBottom, delay)
    );
    
    return () => {
      window.removeEventListener('resize', handleScrollToBottom);
      window.removeEventListener('orientationchange', handleScrollToBottom);
      scrollTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const isLastMessageFromSender = (index: number) => {
    return (
      index === messages.length - 1 ||
      messages[index + 1].senderId !== messages[index].senderId
    );
  };
  
  const isFirstMessageFromSender = (index: number) => {
    return (
      index === 0 ||
      messages[index - 1].senderId !== messages[index].senderId
    );
  };
  
  const formatTime = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="flex flex-col justify-end min-h-full p-4 w-full ChatMessages"
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-center text-default-500">
          <p>No messages yet</p>
          <p className="text-sm mt-2">Start the conversation by sending a message below</p>
        </div>
      ) : (
        <>
          {messages.map((message, index) => {
            const isCurrentUser = message.senderId === currentUser.id;
            const showAvatar = isLastMessageFromSender(index);
            const isFirst = isFirstMessageFromSender(index);
            const isLast = isLastMessageFromSender(index);
            
            // Determine bubble styles based on position in the sequence
            let bubbleStyle = "";
            if (isCurrentUser) {
              bubbleStyle = "bg-primary text-white";
              if (isFirst && isLast) {
                bubbleStyle += " rounded-2xl rounded-br-none";
              } else if (isFirst) {
                bubbleStyle += " rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-md";
              } else if (isLast) {
                bubbleStyle += " rounded-tl-md rounded-tr-2xl rounded-bl-2xl rounded-br-none";
              } else {
                bubbleStyle += " rounded-tl-md rounded-tr-2xl rounded-bl-2xl rounded-br-md";
              }
            } else {
              bubbleStyle = "bg-default-100";
              if (isFirst && isLast) {
                bubbleStyle += " rounded-2xl rounded-bl-none";
              } else if (isFirst) {
                bubbleStyle += " rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-md";
              } else if (isLast) {
                bubbleStyle += " rounded-tr-md rounded-tl-2xl rounded-br-2xl rounded-bl-none";
              } else {
                bubbleStyle += " rounded-tr-md rounded-tl-2xl rounded-br-2xl rounded-bl-md";
              }
            }

            return (
              <div
                key={message.id}
                className={`flex items-end ${
                  isCurrentUser ? "flex-row-reverse" : "flex-row"
                } ${!isFirst ? "mt-1" : "mt-4"}`}
              >
                <div className={`w-8 h-8 flex-shrink-0 ${isCurrentUser ? "ml-2" : "mr-2"}`}>
                  {showAvatar && (
                    <Avatar
                      size="sm"
                      src={isCurrentUser ? currentUser.avatar : otherUser.avatar}
                      name={isCurrentUser ? currentUser.firstName : otherUser.firstName}
                    />
                  )}
                </div>
                
                <div className="flex flex-col max-w-[70%]">
                  {isFirst && !isCurrentUser && (
                    <span className="text-xs text-default-500 mb-1 ml-1">
                      {otherUser.firstName}
                    </span>
                  )}
                  
                  <div className={`px-4 py-2 ${bubbleStyle}`}>
                    {message.content}
                  </div>
                  
                  {isLast && (
                    <div className={`text-xs text-default-500 mt-1 ${isCurrentUser ? "text-right mr-1" : "ml-1"}`}>
                      {formatTime(message.timestamp)}
                      {isCurrentUser && message.isRead && (
                        <span className="ml-1 text-primary">✓✓</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} className="h-0" />
        </>
      )}
    </div>
  );
}; 