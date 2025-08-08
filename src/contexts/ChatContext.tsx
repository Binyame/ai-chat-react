import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Message, ApiProviderType } from '../types';
import { 
  ChatSession, 
  saveChatSession, 
  getChatSession, 
  getCurrentSessionId, 
  setCurrentSessionId,
  createNewSession,
  getChatSessions,
  deleteChatSession,
  cleanupOldSessions,
  AppSettings,
  getAppSettings,
  saveAppSettings
} from '../utils/storage';

// State interface
interface ChatState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  activeProvider: ApiProviderType;
  loading: boolean;
  error: string | null;
  settings: AppSettings;
}

// Actions
type ChatAction = 
  | { type: 'SET_CURRENT_SESSION'; payload: ChatSession }
  | { type: 'ADD_MESSAGE'; payload: { message: Message } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ACTIVE_PROVIDER'; payload: ApiProviderType }
  | { type: 'LOAD_SESSIONS'; payload: ChatSession[] }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'CREATE_NEW_SESSION'; payload: { provider: ApiProviderType; name?: string } }
  | { type: 'CLEAR_CURRENT_SESSION' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> };

// Initial state
const initialState: ChatState = {
  currentSession: null,
  sessions: [],
  activeProvider: 'mock',
  loading: false,
  error: null,
  settings: getAppSettings()
};

// Reducer
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_CURRENT_SESSION':
      return {
        ...state,
        currentSession: action.payload,
        activeProvider: action.payload.provider as ApiProviderType
      };

    case 'ADD_MESSAGE':
      if (!state.currentSession) return state;
      
      const updatedSession = {
        ...state.currentSession,
        messages: [...state.currentSession.messages, action.payload.message],
        updatedAt: new Date().toISOString()
      };
      
      return {
        ...state,
        currentSession: updatedSession
      };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_ACTIVE_PROVIDER':
      return { ...state, activeProvider: action.payload };

    case 'LOAD_SESSIONS':
      return { ...state, sessions: action.payload };

    case 'DELETE_SESSION':
      const filteredSessions = state.sessions.filter(s => s.id !== action.payload);
      return {
        ...state,
        sessions: filteredSessions,
        currentSession: state.currentSession?.id === action.payload ? null : state.currentSession
      };

    case 'CREATE_NEW_SESSION':
      const newSession = createNewSession(action.payload.provider, action.payload.name);
      return {
        ...state,
        currentSession: newSession,
        activeProvider: action.payload.provider,
        sessions: [...state.sessions, newSession]
      };

    case 'CLEAR_CURRENT_SESSION':
      return {
        ...state,
        currentSession: null
      };

    case 'UPDATE_SETTINGS':
      const newSettings = { ...state.settings, ...action.payload };
      return {
        ...state,
        settings: newSettings
      };

    default:
      return state;
  }
};

// Context
interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  // Convenience methods
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  switchProvider: (provider: ApiProviderType) => void;
  createSession: (provider: ApiProviderType, name?: string) => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  saveCurrentSession: () => void;
  clearCurrentSession: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider component
interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Load sessions and restore current session on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load all sessions
        const sessions = getChatSessions();
        dispatch({ type: 'LOAD_SESSIONS', payload: sessions });

        // Restore current session if exists
        const currentSessionId = getCurrentSessionId();
        if (currentSessionId) {
          const currentSession = getChatSession(currentSessionId);
          if (currentSession) {
            dispatch({ type: 'SET_CURRENT_SESSION', payload: currentSession });
          }
        }

        // Cleanup old sessions
        cleanupOldSessions();
      } catch (error) {
        console.error('Failed to load initial data:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load chat history' });
      }
    };

    loadInitialData();
  }, []);

  // Auto-save current session when it changes
  useEffect(() => {
    if (state.currentSession && state.settings.autoSave) {
      saveChatSession(state.currentSession);
      setCurrentSessionId(state.currentSession.id);
    }
  }, [state.currentSession, state.settings.autoSave]);

  // Save settings when they change
  useEffect(() => {
    saveAppSettings(state.settings);
  }, [state.settings]);

  // Convenience methods
  const addMessage = (message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: { message } });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const switchProvider = (provider: ApiProviderType) => {
    dispatch({ type: 'SET_ACTIVE_PROVIDER', payload: provider });
    
    // Create new session for the provider if no current session or provider changed
    if (!state.currentSession || state.currentSession.provider !== provider) {
      dispatch({ type: 'CREATE_NEW_SESSION', payload: { provider } });
    }
  };

  const createSession = (provider: ApiProviderType, name?: string) => {
    dispatch({ type: 'CREATE_NEW_SESSION', payload: { provider, name } });
  };

  const loadSession = (sessionId: string) => {
    const session = getChatSession(sessionId);
    if (session) {
      dispatch({ type: 'SET_CURRENT_SESSION', payload: session });
    }
  };

  const deleteSession = (sessionId: string) => {
    deleteChatSession(sessionId);
    dispatch({ type: 'DELETE_SESSION', payload: sessionId });
  };

  const saveCurrentSession = () => {
    if (state.currentSession) {
      saveChatSession(state.currentSession);
    }
  };

  const clearCurrentSession = () => {
    dispatch({ type: 'CLEAR_CURRENT_SESSION' });
    setCurrentSessionId('');
  };

  const updateSettings = (settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  const contextValue: ChatContextType = {
    state,
    dispatch,
    addMessage,
    setLoading,
    setError,
    switchProvider,
    createSession,
    loadSession,
    deleteSession,
    saveCurrentSession,
    clearCurrentSession,
    updateSettings
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

// Hook to use the chat context
export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};