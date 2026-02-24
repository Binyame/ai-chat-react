import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Paper,
  Button,
  CircularProgress,
  Typography,
  Alert,
  Stack,
  Fade,
  Zoom,
  Skeleton,
  Chip
} from '@mui/material';
import {
  Send as SendIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
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
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, md: 3 }, pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <ChatIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            OpenAI Chat
          </Typography>
        </Stack>
        <Alert severity="info" sx={{ mb: 2 }}>
          Direct chat with <strong>GPT-3.5 Turbo</strong> via OpenAI API
        </Alert>

        {timeRemaining > 0 && (
          <Alert severity="warning">
            Next request allowed in: {Math.ceil(timeRemaining / 1000)} seconds
          </Alert>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
        {chatLog.length === 0 ? (
          <Fade in timeout={500}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              <Zoom in timeout={800}>
                <Box
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    bgcolor: 'action.hover',
                    maxWidth: 500,
                  }}
                >
                  <ChatIcon sx={{ fontSize: 80, mb: 2, opacity: 0.5, color: 'primary.main' }} />
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                    Start a Conversation
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Ask me anything! I'm powered by OpenAI's GPT-3.5 Turbo model.
                  </Typography>
                </Box>
              </Zoom>
            </Box>
          </Fade>
        ) : (
          chatLog.map((message, index) => (
            <Fade in key={index} timeout={300}>
              <Paper
                elevation={message.role === 'user' ? 0 : 1}
                sx={{
                  p: 2.5,
                  mb: 2,
                  bgcolor: message.role === 'user' ? 'primary.main' : 'background.paper',
                  color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  ml: message.role === 'user' ? 'auto' : 0,
                  mr: message.role === 'user' ? 0 : 'auto',
                  maxWidth: '80%',
                  borderRadius: 2,
                  boxShadow: message.role === 'user'
                    ? '0 2px 8px rgba(0,0,0,0.15)'
                    : '0 1px 3px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: message.role === 'user'
                      ? '0 4px 12px rgba(0,0,0,0.2)'
                      : '0 2px 8px rgba(0,0,0,0.12)',
                  },
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'inherit' }}>
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                  </Typography>
                  {message.role === 'assistant' && (
                    <Chip label="GPT-3.5" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                  )}
                </Stack>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'inherit', lineHeight: 1.6 }}>
                  {message.content}
                </Typography>
              </Paper>
            </Fade>
          ))
        )}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={30} />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="70%" />
            </Box>
          </Box>
        )}
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pb: { xs: 2, md: 3 }, pt: 1 }}>
        <Paper
          elevation={3}
          sx={{
            p: 1.5,
            display: 'flex',
            gap: 1,
            bgcolor: 'background.paper',
            borderRadius: 2,
          }}
        >
        <TextField
          fullWidth
          multiline
          maxRows={4}
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
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.default',
            },
          }}
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || timeRemaining > 0 || !input.trim()}
          sx={{
            minWidth: 100,
            height: 56,
            borderRadius: 2,
            boxShadow: 2,
            '&:hover': {
              boxShadow: 4,
            },
          }}
          endIcon={loading ? null : <SendIcon />}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Send'}
        </Button>
      </Paper>
      </Box>
    </Box>
  );
};

export default ChatComponent;