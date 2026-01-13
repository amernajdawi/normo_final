export interface ImageInfo {
  filename: string;
  description?: string;
  type?: 'image' | 'table';
  pdf_name?: string;
  page?: number;
}

export interface SourceCitation {
  pdf_name: string;
  page: number;
  paragraph: number;
  chunk_id: string;
  file_path: string;
  relevant_content: string;
  calculations?: string[];
  area_measurements?: string[];
  images?: ImageInfo[];
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  citations?: SourceCitation[];
  metadata?: Record<string, any>;
  images?: ImageInfo[];
}

// New conversation-related types
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agent_steps?: string[];
  pdf_names?: string[];
  source_citations?: SourceCitation[];
  meta_data?: Record<string, any>;
}

export interface Conversation {
  conversation_id: string;
  user_id?: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
  context: Record<string, any>;
}

export interface ConversationListItem {
  conversation_id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  first_message: string;
}

export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
  user_id?: string;
  conversation_id?: string;
  stream?: boolean;
  user_state?: string;
}

export interface ChatResponse {
  message: {
    role: 'assistant';
    content: string;
    timestamp: string;
    meta_data?: Record<string, any>;
  };
  conversation_id?: string;
  source_citations?: SourceCitation[];
}

// Legacy types for backward compatibility
export interface ApiRequest {
  user_query: string;
  next_action: string;
  steps: string[];
  meta_data: Record<string, string>;
  pdf_names: string[];
  summary: string;
  memory: any[];
  source_citations: SourceCitation[];
}

export interface ApiResponse {
  user_query: string;
  next_action: string;
  steps: string[];
  meta_data: Record<string, string>;
  pdf_names: string[];
  summary: string;
  memory: any[];
  source_citations: SourceCitation[];
}
