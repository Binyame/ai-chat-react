import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Paper, 
  Button, 
  CircularProgress, 
  Typography, 
  Alert,
  Link
} from '@mui/material';
import { Message } from '../types';
import { sendMessageToHuggingFace, checkBackendHealth } from '../services/apiService';

const HuggingFaceChatComponent: React.FC = () => {
  const [input, setInput] = useState('');
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  }>({
    tested: false,
    success: false,
    message: ''
  });

  // Test backend connection on mount
  useEffect(() => {
    const testBackendConnection = async () => {
      setConnectionStatus({
        tested: false,
        success: false,
        message: 'Testing connection to backend server...'
      });
      
      try {
        const healthCheck = await checkBackendHealth();
        
        if (healthCheck.success) {
          // Test a simple Hugging Face API call through backend
          const testResponse = await sendMessageToHuggingFace("Hello");
          
          setConnectionStatus({
            tested: true,
            success: testResponse.success,
            message: testResponse.success 
              ? 'Connected to Hugging Face API via backend successfully!' 
              : `Backend connected, but Hugging Face API error: ${testResponse.error}`
          });
        } else {
          setConnectionStatus({
            tested: true,
            success: false,
            message: `Backend connection failed: ${healthCheck.error || 'Unknown error'}`
          });
        }
      } catch (error) {
        setConnectionStatus({
          tested: true,
          success: false,
          message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        
        console.error('Backend connection test error:', error);
      }
    };
    
    testBackendConnection();
  }, []);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Clear any previous errors
    setError(null);
    
    // Set loading state
    setLoading(true);

    // Add user message to chat log immediately
    setChatLog(prev => [...prev, { role: 'user', content: message }]);

    try {
      // Use the backend API service
      const response = await sendMessageToHuggingFace(message);

      console.log('Response from backend:', response);
      
      if (response.success) {
        // Update chat log with the assistant's response
        setChatLog(prev => [...prev, { role: 'assistant', content: response.data || "I couldn't generate a response." }]);
      } else {
        // Handle API error
        const errorMessage = response.error || 'An error occurred. Please try again later.';
        setError(errorMessage);
        setChatLog(prev => [...prev, { role: 'assistant', content: `Error: ${errorMessage}` }]);
      }
    } catch (err) {
      // Handle network/connection errors
      const errorMessage = err instanceof Error ? err.message : 'An error occurred. Please try again later.';
      console.error('Network/Connection Error:', err);
      
      // Add error message to chat
      setChatLog(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage
      }]);
      
      // Set error state
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (loading) return; // Prevent sending while already loading
    
    if (input.trim()) {
      const messageToSend = input;
      setInput(''); // Clear input field immediately
      sendMessage(messageToSend);
    }
  };

  const getConnectionStatusAlert = () => {
    if (!connectionStatus.tested) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          {connectionStatus.message}
        </Alert>
      );
    }
    
    if (connectionStatus.success) {
      return (
        <Alert severity="success" sx={{ mb: 2 }}>
          {connectionStatus.message}
        </Alert>
      );
    }
    
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {connectionStatus.message}
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2">
            Make sure you have:
          </Typography>
          <ul>
            <li>Added your Hugging Face token to the .env file</li>
            <li>Created a token with the proper read permissions</li>
            <li>
              <Link 
                href="https://huggingface.co/settings/tokens" 
                target="_blank" 
                rel="noopener"
              >
                Check your tokens here
              </Link>
            </li>
          </ul>
          {connectionStatus.details && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="error">
                Details: Error {connectionStatus.details.status} - This might indicate an issue with your token or the API.
              </Typography>
              <Button 
                size="small" 
                sx={{ mt: 1 }} 
                onClick={() => console.log('Detailed Error:', connectionStatus.details)}
              >
                Log Details to Console
              </Button>
            </Box>
          )}
        </Box>
      </Alert>
    );
  };

  return (
    <Box>
      {getConnectionStatusAlert()}
      
      {error && error !== connectionStatus.message && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ 
        height: '400px', 
        border: '1px solid #ddd', 
        borderRadius: 1, 
        p: 2, 
        mb: 2,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {chatLog.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', fontStyle: 'italic', alignSelf: 'center', mt: 'auto', mb: 'auto' }}>
            Start a conversation using Hugging Face API (GPT-2 model)...
          </Typography>
        ) : (
          <Box sx={{ flexGrow: 1 }}>
            {chatLog.map((message, index) => (
              <Paper 
                key={index} 
                elevation={1} 
                sx={{ 
                  mb: 2, 
                  p: 2, 
                  backgroundColor: message.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                  ml: message.role === 'user' ? 'auto' : 0,
                  mr: message.role === 'assistant' ? 'auto' : 0,
                  maxWidth: '80%'
                }}
              >
                <Typography variant="body1">{message.content}</Typography>
              </Paper>
            ))}
          </Box>
        )}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={20} />
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={loading || !connectionStatus.success}
          variant="outlined"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button 
          variant="contained" 
          onClick={handleSend}
          disabled={loading || !input.trim() || !connectionStatus.success}
          color="primary"
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Send'}
        </Button>
      </Box>
    </Box>
  );
};

export default HuggingFaceChatComponent;