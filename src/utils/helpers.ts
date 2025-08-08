import { Message } from '../types';

// Generate unique message ID
export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Create a message with timestamp and ID
export const createMessage = (
  role: 'user' | 'assistant', 
  content: string, 
  provider?: string
): Message => {
  return {
    id: generateMessageId(),
    role,
    content,
    timestamp: new Date().toISOString(),
    provider
  };
};

// Format timestamp for display
export const formatMessageTime = (timestamp?: string): string => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

// Format conversation history for Hugging Face
export const formatConversationForHuggingFace = (messages: Message[]): string => {
  return messages
    .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
    .join('\n');
};

// Check if we can make a new request based on time passed
export const canMakeRequest = (lastRequestTime: number, minInterval: number): boolean => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  return timeSinceLastRequest >= minInterval;
};

// Calculate time remaining until next allowed request
export const getTimeRemaining = (lastRequestTime: number, minInterval: number): number => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  return Math.max(0, minInterval - timeSinceLastRequest);
};

// Debug helper to log API responses
export const logApiResponse = (provider: string, response: unknown): void => {
  console.group(`API Response (${provider})`);
  console.log(response);
  console.groupEnd();
};