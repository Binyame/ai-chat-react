import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Paper, 
  Button, 
  CircularProgress, 
  Typography, 
  Alert
} from '@mui/material';
import { Message } from '../types';
import { sendMessageToOpenAI } from '../services/apiService';
import { canMakeRequest, getTimeRemaining } from '../utils/helpers';

const ChatComponent: React.FC = () => {
  const [input, setInput] = useState('');
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const MIN_REQUEST_INTERVAL = 10000; // 10 seconds minimum between requests

  // Timer for cooldown display
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      const remaining = getTimeRemaining(lastRequestTime, MIN_REQUEST_INTERVAL);
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, lastRequestTime]);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Check if we're allowed to make a request yet
    if (!canMakeRequest(lastRequestTime, MIN_REQUEST_INTERVAL)) {
      setChatLog(prev => [...prev, { 
        role: 'assistant', 
        content: `Please wait ${Math.ceil(getTimeRemaining(lastRequestTime, MIN_REQUEST_INTERVAL) / 1000)} seconds between requests to avoid rate limits.` 
      }]);
      return;
    }

    // Set loading state
    setLoading(true);

    // Add user message to chat log immediately
    setChatLog(prev => [...prev, { role: 'user', content: message }]);

    try {
      // Update last request time
      setLastRequestTime(Date.now());
      setTimeRemaining(MIN_REQUEST_INTERVAL);
      
      // Send message to OpenAI API
      const response = await sendMessageToOpenAI([...chatLog, { role: 'user', content: message }]);

      if (response.success) {
        // Update chat log with the assistant's response
        setChatLog(prev => [...prev, { role: 'assistant', content: response.data }]);
      } else {
        // Show error in chat
        setChatLog(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: ${response.error || 'Unknown error'}`
        }]);
        
        // If rate limited, implement a longer cooldown
        if (response.error?.includes('429')) {
          setTimeRemaining(60000); // 1 minute cooldown after rate limit hit
        }
      }
    } catch {
      // Handle and display the error
      setChatLog(prev => [...prev, { 
        role: 'assistant', 
        content: 'An error occurred while generating a response.'
      }]);
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

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        This implementation uses the <strong>OpenAI API</strong> - You need a valid API key in your .env file.
      </Alert>
      
      {timeRemaining > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Next request allowed in: {Math.ceil(timeRemaining / 1000)} seconds
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
            Start a conversation using OpenAI API...
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
          disabled={loading || timeRemaining > 0}
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
          disabled={loading || timeRemaining > 0 || !input.trim()}
          color="primary"
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Send'}
        </Button>
      </Box>
    </Box>
  );
};

export default ChatComponent;