import React, { useState, useRef, useEffect } from "react";
import { Avatar, Button, Card, ScrollShadow, Textarea } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Chat, Message, User } from "../../types/chat";
import { startTyping, stopTyping } from "../../services/socketService";

interface ChatViewProps {
  chat: Chat;
  messages: Message[];
  currentUser: User;
  onBack: () => void;
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  typingUsers?: Record<number, string>;
  isPrimaryDevice: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  chat,
  messages,
  currentUser,
  onBack,
  onSendMessage,
  isLoading,
  typingUsers = {},
  isPrimaryDevice
}) => {
  
  const [newMessage, setNewMessage] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const contentRef = useRef<HTMLDivElement>(null);
  const otherUser = chat.participants.find((p: User) => p.id !== currentUser.id) || chat.participants[0];
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage("");
      
      // Clear typing timeout and stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping(chat.id);
    }
  };

  const handleTyping = (e: any) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Send typing indicator
    if (value.length > 0) {
      startTyping(chat.id);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(chat.id);
      }, 3000);
    } else {
      // If message is empty, stop typing
      stopTyping(chat.id);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };
  
  const handleKeyPress = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Clean up typing indicators when unmounting
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping(chat.id);
    };
  }, [chat.id]);
  
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isConsecutive = (message: Message, index: number) => {
    if (index === 0) return false;
    const prevMessage = messages[index - 1];
    return (
      message.senderId === prevMessage.senderId &&
      message.timestamp.getTime() - prevMessage.timestamp.getTime() < 300000 // 5 minutes
    );
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden fixed md:relative inset-0 md:inset-auto md:h-full">
      {/* Header - fixed on mobile, normal on desktop */}
      <div className="flex-none bg-white border-b border-divider shadow-sm z-20">
        <div className="flex items-center gap-3 p-4">
          <Button
            isIconOnly
            variant="light"
            onPress={onBack}
            className="text-default-500"
          >
            <Icon icon="lucide:arrow-left" width={24} />
          </Button>
          <div className="flex items-center">
            <div className="relative">
              <Avatar
                src={otherUser.avatar}
                name={`${otherUser.firstName} ${otherUser.lastName}`}
                size="lg"
              />
              {otherUser.isOnline && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              )}
            </div>
            <div className="ml-3">
              <h2 className="text-lg font-semibold">
                {otherUser.firstName} {otherUser.lastName}
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    otherUser.isOnline 
                      ? "bg-green-500 animate-pulse" 
                      : "bg-default-300"
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    otherUser.isOnline 
                      ? "text-green-500" 
                      : "text-default-500"
                  }`}>
                    {otherUser.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="flex flex-col gap-2 p-4 w-full">
          {messages.map((message, index) => {
            const isMine = message.senderId === currentUser.id;
            const showAvatar = !isConsecutive(message, index);

            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}
              >
                {!isMine && showAvatar && (
                  <Avatar
                    src={otherUser.avatar}
                    className="w-8 h-8 mt-auto"
                  />
                )}
                {!isMine && !showAvatar && <div className="w-8" />}
                <div
                  className={`flex flex-col ${
                    isMine ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`px-4 py-2 rounded-2xl max-w-[calc(100vw-100px)] md:max-w-md ${
                      isMine
                        ? " bg-gradient-to-tr from-gradient-first to-gradient-second text-primary-foreground"
                        : "bg-content2"
                    }`}
                  >
                    <p className="break-words">{message.content}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-default-500">
                      {formatTime(message.timestamp)}
                    </span>
                    {isMine && message.isRead && (
                      <Icon 
                        icon="lucide:check-check" 
                        className="text-primary w-4 h-4"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input Area - fixed on mobile, normal on desktop */}
      <div className="flex-none border-t border-divider bg-white p-4 z-20">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            minRows={1}
            maxRows={4}
            className="flex-1"
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            isIconOnly
            size="lg"
            className="bg-gradient-to-tr from-gradient-first to-gradient-second text-primary-foreground"
            onPress={handleSend}
            isDisabled={!newMessage.trim()}
          >
            <Icon icon="lucide:send" width={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}; 