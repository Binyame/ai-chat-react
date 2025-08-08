export interface Message {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
    provider?: string;
  }
  
  export interface ApiResponse {
    success: boolean;
    data?: string;
    error?: string;
  }
  
  export type ApiProviderType = 'openai' | 'huggingface' | 'mock';