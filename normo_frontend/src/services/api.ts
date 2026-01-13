import axios from 'axios';
import { ApiRequest, ApiResponse, ChatRequest, ChatResponse, Conversation, ConversationListItem } from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const chatApi = {
  // New conversation-based API
  sendMessage: async (
    message: string, 
    conversationId?: string, 
    userState?: string,
    userId?: string
  ): Promise<ChatResponse> => {
    const request: ChatRequest = {
      messages: [{
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }],
      conversation_id: conversationId,
      user_id: userId,
      stream: false,
      user_state: userState
    };

    const response = await api.post<ChatResponse>('/chat', request);
    return response.data;
  },

  createConversation: async (userId?: string): Promise<{ conversation_id: string }> => {
    const response = await api.post('/conversations', {}, {
      params: { user_id: userId }
    });
    return response.data;
  },

  getConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await api.get(`/conversations/${conversationId}`);
    return response.data;
  },

  listConversations: async (userId?: string): Promise<ConversationListItem[]> => {
    const response = await api.get('/conversations', {
      params: { user_id: userId }
    });
    return response.data;
  },

  // Legacy API for backward compatibility
  sendMessageLegacy: async (query: string): Promise<ApiResponse> => {
    const request: ApiRequest = {
      user_query: query,
      next_action: 'planner',
      steps: [],
      meta_data: {},
      pdf_names: [],
      summary: '',
      memory: [],
      source_citations: [],
    };

    const response = await api.post<ApiResponse>('/chat/legacy', request);
    return response.data;
  },

  checkHealth: async (): Promise<{ status: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;
