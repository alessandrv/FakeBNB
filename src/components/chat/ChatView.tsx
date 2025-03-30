import React, { useState, useRef, useEffect } from "react";
import { Avatar, Button, Textarea } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Chat, Message, User } from "../../types/chat";
import { ChatMessages } from "./ChatMessages";
import { startTyping, stopTyping } from "../../services/socketService";

interface ChatViewProps {
  chat: Chat;
  messages: Message[];
  currentUser: User;
  onBack: () => void;
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  typingUsers?: Record<number, string>;
}

export const ChatView: React.FC<ChatViewProps> = ({
  chat,
  messages,
  currentUser,
  onBack,
  onSendMessage,
  isLoading,
  typingUsers = {}
}) => {
  const [newMessage, setNewMessage] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const contentRef = useRef<HTMLDivElement>(null);
  const otherUser = chat.participants.find((p: User) => p.id !== currentUser.id) || chat.participants[0];

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

  const isTyping = Object.keys(typingUsers).length > 0;
  const typingText = isTyping 
    ? Object.values(typingUsers).join(", ") + (Object.keys(typingUsers).length > 1 ? " are " : " is ") + "typing..." 
    : "";

  return (
    <div className="flex flex-col h-screen bg-white w-full">
      {/* Header */}
      <div className="flex-none flex items-center gap-3 p-4 border-b border-default-200 bg-white">
        <Button
          isIconOnly
          variant="light"
          onClick={onBack}
          className="text-default-500"
        >
          <Icon icon="lucide:arrow-left" width={24} />
        </Button>
        <Avatar src={otherUser.avatar} className="w-10 h-10" />
        <div className="flex-1">
          <h2 className="font-semibold">
            {otherUser.firstName} {otherUser.lastName}
          </h2>
          <div className="flex items-center gap-2">
            <p className="text-sm text-default-500">
              {otherUser.isOnline ? "Online" : "Offline"}
            </p>
            {isTyping && (
              <p className="text-sm text-default-500 italic">
                {typingText}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div ref={contentRef}>
          <ChatMessages 
            messages={messages} 
            currentUser={currentUser} 
            otherUser={otherUser} 
            isLoading={isLoading} 
          />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-none border-t border-default-200 bg-white p-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            minRows={1}
            maxRows={4}
            className="flex-1"
          />
          <Button
            isIconOnly
            color="primary"
            size="lg"
            onClick={handleSend}
            isDisabled={!newMessage.trim()}
          >
            <Icon icon="lucide:send" width={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}; 