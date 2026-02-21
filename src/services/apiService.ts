import { Message, ApiResponse } from '../types';

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// OpenAI API Service (via backend proxy)
export const sendMessageToOpenAI = async (messages: Message[]): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/openai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || `API error: ${response.status}` 
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to backend'
    };
  }
};

// Hugging Face API Service (via backend proxy)
export const sendMessageToHuggingFace = async (prompt: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/huggingface/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: prompt,
        model: 'microsoft/DialoGPT-medium'
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || `API error: ${response.status}` 
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to backend'
    };
  }
};

// Gemini API Service (via backend proxy)
export const sendMessageToGemini = async (message: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gemini/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        model: 'gemini-1.5-flash'
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || `API error: ${response.status}` 
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to backend'
    };
  }
};

// Health check for backend connectivity
export const checkBackendHealth = async (): Promise<ApiResponse> => {
  try {
    const baseUrl = API_BASE_URL ? API_BASE_URL.replace('/api', '') : 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();

    return {
      success: response.ok,
      data: response.ok ? 'Backend is running' : 'Backend is down',
      error: response.ok ? undefined : data.error
    };
  } catch (error) {
    return {
      success: false,
      error: 'Cannot connect to backend server'
    };
  }
};