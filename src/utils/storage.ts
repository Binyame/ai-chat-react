import { Message } from '../types';

export interface ChatSession {
  id: string;
  name: string;
  provider: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEYS = {
  CHAT_SESSIONS: 'ai-chat-sessions',
  CURRENT_SESSION: 'ai-chat-current-session',
  APP_SETTINGS: 'ai-chat-settings'
} as const;

// Chat session management
export const saveChatSession = (session: ChatSession): void => {
  try {
    const sessions = getChatSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = { ...session, updatedAt: new Date().toISOString() };
    } else {
      sessions.push(session);
    }
    
    localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save chat session:', error);
  }
};

export const getChatSessions = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load chat sessions:', error);
    return [];
  }
};

export const getChatSession = (id: string): ChatSession | null => {
  try {
    const sessions = getChatSessions();
    return sessions.find(session => session.id === id) || null;
  } catch (error) {
    console.error('Failed to get chat session:', error);
    return null;
  }
};

export const deleteChatSession = (id: string): void => {
  try {
    const sessions = getChatSessions();
    const filtered = sessions.filter(session => session.id !== id);
    localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete chat session:', error);
  }
};

// Current session management
export const setCurrentSessionId = (id: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, id);
  } catch (error) {
    console.error('Failed to set current session:', error);
  }
};

export const getCurrentSessionId = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
  } catch (error) {
    console.error('Failed to get current session:', error);
    return null;
  }
};

// Generate unique session ID
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create new session
export const createNewSession = (provider: string, name?: string): ChatSession => {
  const id = generateSessionId();
  const timestamp = new Date().toISOString();
  
  return {
    id,
    name: name || `${provider} Chat - ${new Date().toLocaleDateString()}`,
    provider,
    messages: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

// Settings management
export interface AppSettings {
  theme: 'light' | 'dark';
  autoSave: boolean;
  maxSessionHistory: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  autoSave: true,
  maxSessionHistory: 50
};

export const saveAppSettings = (settings: Partial<AppSettings>): void => {
  try {
    const currentSettings = getAppSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(updatedSettings));
  } catch (error) {
    console.error('Failed to save app settings:', error);
  }
};

export const getAppSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to load app settings:', error);
    return DEFAULT_SETTINGS;
  }
};

// Cleanup old sessions based on settings
export const cleanupOldSessions = (): void => {
  try {
    const settings = getAppSettings();
    const sessions = getChatSessions();
    
    if (sessions.length > settings.maxSessionHistory) {
      // Sort by updatedAt and keep only the most recent ones
      const sorted = sessions.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      const toKeep = sorted.slice(0, settings.maxSessionHistory);
      localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(toKeep));
    }
  } catch (error) {
    console.error('Failed to cleanup old sessions:', error);
  }
};

// Export/Import functionality
export const exportChatHistory = (): string => {
  try {
    const sessions = getChatSessions();
    const settings = getAppSettings();
    
    return JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      sessions,
      settings
    }, null, 2);
  } catch (error) {
    console.error('Failed to export chat history:', error);
    return '';
  }
};

export const importChatHistory = (jsonData: string): boolean => {
  try {
    const data = JSON.parse(jsonData);
    
    if (data.sessions && Array.isArray(data.sessions)) {
      localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(data.sessions));
    }
    
    if (data.settings) {
      localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(data.settings));
    }
    
    return true;
  } catch (error) {
    console.error('Failed to import chat history:', error);
    return false;
  }
};