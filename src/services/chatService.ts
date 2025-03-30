import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export interface User {
  id: number;
  first_name: string;
  last_name: string;
  profile_picture?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  updated_at?: string;
  is_read: boolean;
  attachment_url?: string;
  sender: User;
}

export interface Conversation {
  id: number;
  title?: string;
  is_group: boolean;
  created_at: string;
  updated_at?: string;
  last_message_at: string;
  unread_count: number;
  last_message?: string;
  participants: User[];
}

// API Calls
export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const response = await axios.get(`${API_URL}/api/chat/conversations`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    return response.data.conversations;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

export const getConversation = async (id: number): Promise<Conversation> => {
  try {
    const response = await axios.get(`${API_URL}/api/chat/conversations/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    return response.data.conversation;
  } catch (error) {
    console.error(`Error fetching conversation ${id}:`, error);
    throw error;
  }
};

export const getMessages = async (
  conversationId: number,
  limit = 20,
  offset = 0
): Promise<Message[]> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/chat/conversations/${conversationId}/messages`,
      {
        params: { limit, offset },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      }
    );
    return response.data.messages;
  } catch (error) {
    console.error(`Error fetching messages for conversation ${conversationId}:`, error);
    throw error;
  }
};

export const sendMessage = async (
  conversationId: number,
  content: string,
  attachmentUrl?: string
): Promise<Message> => {
  try {
    const response = await axios.post(
      `${API_URL}/api/chat/messages`,
      {
        conversationId,
        content,
        attachmentUrl
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      }
    );
    return response.data.message;
  } catch (error) {
    console.error(`Error sending message to conversation ${conversationId}:`, error);
    throw error;
  }
};

export const markConversationAsRead = async (conversationId: number): Promise<void> => {
  try {
    await axios.post(
      `${API_URL}/api/chat/conversations/${conversationId}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      }
    );
  } catch (error) {
    console.error(`Error marking conversation ${conversationId} as read:`, error);
    throw error;
  }
};

export const createConversation = async (
  title: string | null,
  isGroup: boolean,
  userIds: number[]
): Promise<Conversation> => {
  try {
    const response = await axios.post(
      `${API_URL}/api/chat/conversations`,
      {
        title,
        isGroup,
        userIds
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      }
    );
    return response.data.conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

export const getOrCreateDirectConversation = async (userId: number): Promise<Conversation> => {
  try {
    const response = await axios.get(`${API_URL}/api/chat/direct/${userId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    return response.data.conversation;
  } catch (error) {
    console.error(`Error getting direct conversation with user ${userId}:`, error);
    throw error;
  }
}; 