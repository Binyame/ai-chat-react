export interface Citation {
    id: number;
    fileName: string;
    page: string | number;
    text: string;
    relevance?: string;
  }

  export interface Message {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
    provider?: string;
    citations?: Citation[];
  }
  
  export interface ApiResponse {
    success: boolean;
    data?: string;
    error?: string;
  }
  
  export type ApiProviderType = 'rag' | 'openai' | 'gemini';