import React, { useRef, useState } from "react";
import { Avatar, Badge } from "@heroui/react";
import type { Chat } from "../../types/chat";

interface ChatListProps {
  chats: Chat[];
  activeChat?: number;
  onChatSelect: (chatId: number) => void;
  onNewChat?: () => void;
  isLoading?: boolean;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  activeChat,
  onChatSelect,
  onNewChat,
  isLoading = false
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleChatClick = (chatId: number) => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    onChatSelect(chatId);
    
    // Reset navigation state after a short delay
    setTimeout(() => {
      setIsNavigating(false);
    }, 500);
  };

  const handleNewChatClick = () => {
    if (isNavigating || !onNewChat) return;
    
    setIsNavigating(true);
    onNewChat();
    
    // Reset navigation state after a short delay
    setTimeout(() => {
      setIsNavigating(false);
    }, 500);
  };

  const formatDate = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    
    // If today
    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If within a week
    const diffDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getOtherUser = (chat: Chat) => {
    if (!chat.participants || chat.participants.length === 0) {
      return null;
    }
    
    // For simplicity, just get the first participant
    // In a real app, you'd filter out the current user
    return chat.participants[0];
  };

  return (
    <div className="flex flex-col h-full">
      <div className="fixed top-0 left-0 right-0 md:sticky md:top-0 p-4 border-b border-default-200 bg-white shadow-sm z-20 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Messages</h1>
        {onNewChat && (
          <button 
            onClick={handleNewChatClick}
            disabled={isNavigating}
            className={`p-2 rounded-full transition-colors ${
              isNavigating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-default-100'
            }`}
            aria-label="New conversation"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
      
      <div ref={listRef} className="overflow-y-auto pt-[64px] h-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <p className="text-default-500 mb-2">No conversations yet</p>
            {onNewChat && (
              <button 
                onClick={handleNewChatClick}
                disabled={isNavigating}
                className={`text-primary font-medium ${
                  isNavigating ? 'opacity-50 cursor-not-allowed' : 'hover:underline'
                }`}
              >
                Start a new conversation
              </button>
            )}
          </div>
        ) : (
          chats.map((chat) => {
            const otherUser = getOtherUser(chat);
            if (!otherUser) return null;
            
            return (
              <div
                key={chat.id}
                className={`flex items-center p-4 cursor-pointer transition-colors border-b border-default-100 ${
                  isNavigating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-default-100'
                } ${activeChat === chat.id ? "bg-default-100" : ""}`}
                onClick={() => handleChatClick(chat.id)}
              >
                <div className="relative">
                  <Avatar
                    src={otherUser.avatar}
                    name={`${otherUser.firstName} ${otherUser.lastName}`}
                    size="lg"
                    className="flex-shrink-0"
                  />
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    otherUser.isOnline 
                      ? "bg-green-500 animate-pulse" 
                      : "bg-default-300"
                  }`}></div>
                </div>
                <div className="flex-1 min-w-0 ml-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">
                        {otherUser.firstName} {otherUser.lastName}
                      </h3>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          otherUser.isOnline 
                            ? "bg-green-500 animate-pulse" 
                            : "bg-default-300"
                        }`}></div>
                        <span className={`text-xs font-medium ${
                          otherUser.isOnline 
                            ? "text-green-500" 
                            : "text-default-500"
                        }`}>
                          {otherUser.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                    {chat.lastMessage && (
                      <span className="text-xs text-default-500 ml-2 flex-shrink-0">
                        {formatDate(chat.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-default-500 truncate pr-2">
                      {chat.lastMessage?.content || "No messages yet"}
                    </p>
                    {chat.unreadCount > 0 && (
                      <Badge color="primary" className="flex-shrink-0">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}; 