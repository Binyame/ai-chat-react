import React, { useState } from 'react';
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
import { sendMessageToMockAI } from '../services/mockService';

const MockChatComponent: React.FC = () => {
  const [input, setInput] = useState('');
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Set loading state
    setLoading(true);

    // Add user message to chat log immediately
    setChatLog(prev => [...prev, { role: 'user', content: message }]);

    try {
      // Get response from mock service
      const response = await sendMessageToMockAI(message);

      if (response.success) {
        // Update chat log with the assistant's response
        setChatLog(prev => [...prev, { role: 'assistant', content: response.data }]);
      } else {
        // Show error in chat
        setChatLog(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: ${response.error || 'Unknown error'}`
        }]);
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
        This is the <strong>Mock Implementation</strong> - All responses are generated locally without any API calls.
      </Alert>
      
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
            Start a conversation... (Using local mock AI - no API calls)
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
          disabled={loading}
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
          disabled={loading || !input.trim()}
          color="primary"
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Send'}
        </Button>
      </Box>
    </Box>
  );
};

export default MockChatComponent;