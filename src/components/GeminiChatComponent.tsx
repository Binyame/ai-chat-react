import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Paper,
  Button,
  CircularProgress,
  Typography,
  Alert,
  Link as MuiLink,
  Stack,
  Fade,
  Zoom,
  Skeleton,
  Chip
} from '@mui/material';
import {
  Send as SendIcon,
  AutoAwesome as GeminiIcon
} from '@mui/icons-material';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

// Types for messages
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// More explicit types for the component props
// interface MarkdownLinkProps {
//   children: React.ReactNode;
//   href?: string;
// }

const GeminiChatComponent: React.FC = () => {
  const [input, setInput] = useState('');
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);

  // The model we'll use - gemini-2.5-flash is the current fast model for v1beta API (2026)
  const MODEL_NAME = "gemini-2.5-flash";
  
  // Check if API key is available
  useEffect(() => {
    const checkApiKey = async () => {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        setApiKeyValid(false);
        setError('Gemini API key is not set in environment variables.');
        return;
      }
      
      // Validate the API key with a simple request
      try {
        // Use void to indicate we're intentionally ignoring the response
        void await axios.get(
          `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
        );
        
        // If we get here, the API key is valid
        setApiKeyValid(true);
        setError(null);
      } catch (error) {
        console.error('API Key validation error:', error);
        setApiKeyValid(false);
        
        if (axios.isAxiosError(error) && error.response) {
          const statusCode = error.response.status;
          const errorData = error.response.data;
          
          if (errorData && errorData.error && errorData.error.message) {
            setError(`API Key Error: ${errorData.error.message}`);
          } else {
            setError(`API Key Error: Status ${statusCode}`);
          }
        } else {
          setError('Could not validate the Gemini API key. Please check your environment variables.');
        }
      }
    };
    
    checkApiKey();
  }, []);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || !apiKeyValid) {
      setError('Valid Gemini API key is required. Please check your .env file.');
      return;
    }
    
    // Clear previous errors
    setError(null);
    
    // Set loading state
    setLoading(true);

    // Add user message to chat log immediately
    setChatLog(prev => [...prev, { role: 'user', content: message }]);

    try {
      // Make API call to Gemini with the recommended model (using v1 stable endpoint)
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/${MODEL_NAME}:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: message
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Gemini API Response:', response.data);
      
      // Extract the assistant's response
      let assistantMessage = 'Sorry, I couldn\'t generate a response.';
      
      if (response.data.candidates && 
          response.data.candidates.length > 0 && 
          response.data.candidates[0].content &&
          response.data.candidates[0].content.parts &&
          response.data.candidates[0].content.parts.length > 0) {
        assistantMessage = response.data.candidates[0].content.parts[0].text || assistantMessage;
      }
      
      // Add assistant's response to chat log
      setChatLog(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('API Error:', error);
      
      // Display error message
      if (axios.isAxiosError(error) && error.response) {
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        let errorMessage = `Error ${statusCode}`;
        
        // Check for specific Gemini API error messages
        if (errorData && errorData.error && errorData.error.message) {
          errorMessage = errorData.error.message;
          
          // Handle invalid API key specifically
          if (statusCode === 400 && errorMessage.includes('API key')) {
            errorMessage = 'Invalid API key. Please check your Gemini API key in the .env file.';
            setApiKeyValid(false);
          }
          
          // Handle model deprecation/availability issues
          if (errorMessage.includes('deprecated') || errorMessage.includes('not found')) {
            errorMessage = `Model error: ${errorMessage}. Please update the component to use a different model.`;
          }
        }
        
        setError(errorMessage);
        setChatLog(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: ${errorMessage}` 
        }]);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setError(`Error: ${errorMessage}`);
        setChatLog(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: ${errorMessage}` 
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (loading || apiKeyValid !== true) return;
    
    if (input.trim()) {
      const messageToSend = input;
      setInput(''); // Clear input field immediately
      sendMessage(messageToSend);
    }
  };

  // MessageContent component that properly handles ReactMarkdown props
  const MessageContent = ({ content, role }: { content: string, role: string }) => {
    if (role === 'assistant') {
      return (
        <div className="markdown-content">
          <ReactMarkdown
            children={content}
            components={{
              h1: ({ children }: any) => <Typography variant="h5" gutterBottom>{children}</Typography>,
              h2: ({ children }: any) => <Typography variant="h6" gutterBottom>{children}</Typography>,
              h3: ({ children }: any) => <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{children}</Typography>,
              p: ({ children }: any) => <Typography variant="body1" paragraph>{children}</Typography>,
              ul: ({ children }: any) => <Box component="ul" sx={{ pl: 2 }}>{children}</Box>,
              ol: ({ children }: any) => <Box component="ol" sx={{ pl: 2 }}>{children}</Box>,
              li: ({ children }: any) => <Box component="li" sx={{ mb: 0.5 }}>{children}</Box>,
              a: ({ href, children }: any) => <MuiLink href={href} target="_blank" rel="noopener">{children}</MuiLink>,
              code: ({ inline, className, children }: any) => 
                inline ? (
                  <Box component="code" sx={{ bgcolor: '#f5f5f5', p: 0.3, borderRadius: 0.5, fontSize: '0.9rem' }}>
                    {children}
                  </Box>
                ) : (
                  <Box component="pre" sx={{ bgcolor: '#f5f5f5', p: 1, borderRadius: 1, overflow: 'auto', fontSize: '0.9rem' }}>
                    <Box component="code" className={className}>
                      {children}
                    </Box>
                  </Box>
                )
            }}
          />
        </div>
      );
    }
    
    return <Typography variant="body1">{content}</Typography>;
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
          <GeminiIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Gemini Chat
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {apiKeyValid === false && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Gemini API key not found or invalid. Please add a valid API key to your .env file:
            </Typography>
            <Box component="pre" sx={{
              bgcolor: '#f5f5f5',
              p: 1,
              borderRadius: 1,
              overflow: 'auto',
              fontSize: '0.8rem',
              mt: 1
            }}>
              VITE_GEMINI_API_KEY=your_gemini_api_key_here
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              You can get a free API key from{' '}
              <MuiLink
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener"
              >
                Google AI Studio
              </MuiLink>.
            </Typography>
          </Alert>
        )}

        {apiKeyValid === true && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Connected to <strong>{MODEL_NAME}</strong> with markdown support
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
                  <GeminiIcon sx={{ fontSize: 80, mb: 2, opacity: 0.5, color: 'primary.main' }} />
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                    {apiKeyValid === true ? 'Start a Conversation' : 'API Key Required'}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {apiKeyValid === true
                      ? 'Ask me anything! I support markdown formatting in responses.'
                      : 'Add your Gemini API key to the .env file to start chatting.'}
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
                    <Chip label="Gemini" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                  )}
                </Stack>
                <Box sx={{ color: 'inherit' }}>
                  <MessageContent content={message.content} role={message.role} />
                </Box>
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
          disabled={loading || apiKeyValid !== true}
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
          disabled={loading || !input.trim() || apiKeyValid !== true}
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

export default GeminiChatComponent;