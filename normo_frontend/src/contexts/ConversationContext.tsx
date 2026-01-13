import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { ConversationListItem, ChatMessage } from '../types/api';
import { chatApi } from '../services/api';

interface ConversationState {
  currentConversationId: string | null;
  conversations: ConversationListItem[];
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

type ConversationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CREATE_CONVERSATION'; payload: string }
  | { type: 'SET_CONVERSATION'; payload: string | null }
  | { type: 'LOAD_CONVERSATIONS'; payload: ConversationListItem[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'LOAD_MESSAGES'; payload: ChatMessage[] };

const initialState: ConversationState = {
  currentConversationId: null,
  conversations: [],
  messages: [],
  isLoading: false,
  error: null,
};

function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CREATE_CONVERSATION':
      return { ...state, currentConversationId: action.payload };
    case 'SET_CONVERSATION':
      return { ...state, currentConversationId: action.payload };
    case 'LOAD_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    case 'LOAD_MESSAGES':
      return { ...state, messages: action.payload };
    default:
      return state;
  }
}

interface ConversationContextType {
  state: ConversationState;
  createNewConversation: () => Promise<void>;
  switchToConversation: (conversationId: string) => Promise<void>;
  sendMessage: (message: string, userState?: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  clearCurrentConversation: () => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};

interface ConversationProviderProps {
  children: ReactNode;
}

export const ConversationProvider: React.FC<ConversationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  // Load conversations on mount and restore current conversation
  useEffect(() => {
    loadConversations();
    
    // Restore current conversation from localStorage
    const savedConversationId = localStorage.getItem('currentConversationId');
    if (savedConversationId) {
      switchToConversation(savedConversationId);
    }
  }, []);

  // Save current conversation ID to localStorage
  useEffect(() => {
    if (state.currentConversationId) {
      localStorage.setItem('currentConversationId', state.currentConversationId);
    } else {
      localStorage.removeItem('currentConversationId');
    }
  }, [state.currentConversationId]);

  const createNewConversation = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await chatApi.createConversation();
      dispatch({ type: 'CREATE_CONVERSATION', payload: response.conversation_id });
      dispatch({ type: 'CLEAR_MESSAGES' });
      
      // Reload conversations to include the new one
      await loadConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create new conversation' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const switchToConversation = async (conversationId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const conversation = await chatApi.getConversation(conversationId);
      dispatch({ type: 'SET_CONVERSATION', payload: conversationId });
      
      // Convert conversation messages to ChatMessage format
      const messages: ChatMessage[] = (conversation.messages || []).map((msg, index) => ({
        id: `${conversationId}-${index}`,
        content: msg.content || '',
        role: msg.role || 'user',
        timestamp: new Date(msg.timestamp || new Date()),
        citations: msg.source_citations || [],
        metadata: msg.meta_data || {},
      }));
      
      dispatch({ type: 'LOAD_MESSAGES', payload: messages });
    } catch (error) {
      console.error('Error switching to conversation:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load conversation' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const sendMessage = async (message: string, userState?: string) => {
    if (!message.trim()) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        content: message.trim(),
        role: 'user',
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      const response = await chatApi.sendMessage(
        message.trim(),
        state.currentConversationId || undefined,
        userState
      );

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        content: response.message.content,
        role: 'assistant',
        timestamp: new Date(response.message.timestamp),
        citations: response.source_citations,
        metadata: response.message.meta_data || {},
      };
      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });

      // Update current conversation ID if this was a new conversation
      if (response.conversation_id && !state.currentConversationId) {
        dispatch({ type: 'SET_CONVERSATION', payload: response.conversation_id });
        await loadConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
      
      // Remove the user message if the API call failed
      dispatch({ type: 'LOAD_MESSAGES', payload: state.messages.slice(0, -1) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadConversations = async () => {
    try {
      const conversations = await chatApi.listConversations();
      dispatch({ type: 'LOAD_CONVERSATIONS', payload: Array.isArray(conversations) ? conversations : [] });
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Ensure conversations is always an array even on error
      dispatch({ type: 'LOAD_CONVERSATIONS', payload: [] });
    }
  };

  const clearCurrentConversation = () => {
    dispatch({ type: 'SET_CONVERSATION', payload: null });
    dispatch({ type: 'CLEAR_MESSAGES' });
  };

  const value: ConversationContextType = {
    state,
    createNewConversation,
    switchToConversation,
    sendMessage,
    loadConversations,
    clearCurrentConversation,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};
