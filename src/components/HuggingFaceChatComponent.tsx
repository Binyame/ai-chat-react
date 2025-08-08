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
import axios from 'axios';
import { Message } from '../types';

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

  // Create Axios instance with default configuration
  const huggingfaceAxios = axios.create({
    baseURL: 'https://api-inference.huggingface.co',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_HUGGINGFACE_TOKEN}`
    }
  });

  // Test connection to Hugging Face API on mount
  useEffect(() => {
    const testConnection = async () => {
      setConnectionStatus({
        tested: false,
        success: false,
        message: 'Testing connection to Hugging Face API...'
      });
      
      try {
        // Try a simple request to a public model - using gpt2 which is simpler
        const response = await huggingfaceAxios.post('/models/gpt2', {
          inputs: "Hello world"
        });
        
        setConnectionStatus({
          tested: true,
          success: true,
          message: 'Connected to Hugging Face API successfully!'
        });

        console.log('Connection test response:', response.data);
      } catch (err) {
        let errorMessage = 'Unknown connection error';
        let details: Record<string, unknown> = {};
        
        if (axios.isAxiosError(err)) {
          if (err.response) {
            errorMessage = `Connection error: API error: ${err.response.status}`;
            details = {
              status: err.response.status,
              statusText: err.response.statusText,
              data: err.response.data,
              headers: err.response.headers
            };
            
            // Special handling for common errors
            if (err.response.status === 403) {
              errorMessage = 'API Key error: Please check your Hugging Face token (403 Forbidden)';
            } else if (err.response.status === 400) {
              errorMessage = 'Bad Request: The API request format is incorrect (400 Bad Request)';
            }
          } else if (err.request) {
            errorMessage = 'No response from server. Please check your internet connection.';
            details = { request: err.request };
          } else {
            errorMessage = `Error: ${err.message}`;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        setConnectionStatus({
          tested: true,
          success: false,
          message: errorMessage,
          details
        });
        
        // Log detailed error for debugging
        console.error('Hugging Face API Connection Error:', err);
        console.error('Error Details:', details);
      }
    };
    
    testConnection();
  }, [huggingfaceAxios]);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Clear any previous errors
    setError(null);
    
    // Set loading state
    setLoading(true);

    // Add user message to chat log immediately
    setChatLog(prev => [...prev, { role: 'user', content: message }]);

    try {
      // Use the simpler gpt2 model with direct message input
      const response = await huggingfaceAxios.post('/models/gpt2', {
        inputs: message // Just send the message directly, not a complex prompt
      });

      console.log('Response from Hugging Face:', response.data);
      
      // Extract the assistant's response - adjust based on the actual response format
      // GPT-2 usually returns an object with generated_text
      const assistantMessage = response.data[0]?.generated_text || "I couldn't generate a response.";
      
      // Update chat log with the assistant's response
      setChatLog(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (err) {
      // Handle errors
      let errorMessage = 'An error occurred. Please try again later.';
      
      if (axios.isAxiosError(err)) {
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          if (err.response.status === 403) {
            errorMessage = 'API Key error: Please check your Hugging Face token (403 Forbidden)';
          } else if (err.response.status === 400) {
            errorMessage = 'Bad Request: The API request format is incorrect (400 Bad Request)';
            console.error('Request that caused 400:', { inputs: message });
          } else {
            errorMessage = `Error ${err.response.status}: ${err.response.statusText}`;
          }
          console.error('API Response Error:', err.response.data);
        } else if (err.request) {
          // The request was made but no response was received
          errorMessage = 'No response from server. Please check your internet connection.';
          console.error('No Response Error:', err.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          errorMessage = `Error: ${err.message}`;
          console.error('Request Setup Error:', err.message);
        }
      }
      
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