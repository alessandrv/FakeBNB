// Types for chat features
// Interfaces are designed to work with both the provided sample components
// and the existing backend implementation

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  avatar?: string;
  isOnline?: boolean;
}

export interface Message {
  id: number;
  content: string;
  senderId: number;
  timestamp: Date;
  isRead: boolean;
  conversationId: number;
  isLocal?: boolean; // Optional flag to identify locally added messages before server confirmation
}

export interface Chat {
  id: number;
  participants: User[];
  lastMessage?: {
    content: string;
    timestamp: string;
  };
  lastMessageAt: string;
  unreadCount: number;
  isGroup: boolean;
}

// Mapping functions to convert between backend and frontend models

// Convert backend User to frontend User
export const mapUser = (backendUser: any): User => ({
  id: backendUser.id,
  firstName: backendUser.first_name,
  lastName: backendUser.last_name,
  avatar: backendUser.profile_picture,
  isOnline: false // Default value, to be updated with socket status
});

// Convert backend Message to frontend Message
export const mapMessage = (backendMessage: any): Message => ({
  id: backendMessage.id,
  content: backendMessage.content,
  senderId: backendMessage.sender_id,
  conversationId: backendMessage.conversation_id,
  timestamp: new Date(backendMessage.created_at),
  isRead: backendMessage.is_read,
  isLocal: backendMessage.isLocal // Preserve isLocal flag if present
});

// Convert backend Conversation to frontend Chat
export const mapConversation = (backendConversation: any): Chat => ({
  id: backendConversation.id,
  participants: backendConversation.participants.map(mapUser),
  lastMessage: backendConversation.last_message ? {
    content: backendConversation.last_message,
    timestamp: backendConversation.last_message_at
  } : undefined,
  lastMessageAt: backendConversation.last_message_at,
  unreadCount: backendConversation.unread_count,
  isGroup: backendConversation.is_group
}); 