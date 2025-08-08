import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Paper, 
  Button, 
  CircularProgress, 
  Typography, 
  Alert,
  Link as MuiLink
} from '@mui/material';
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

  // The model we'll use, based on Google's recommendation
  const MODEL_NAME = "gemini-1.5-flash";
  
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
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
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
      // Make API call to Gemini with the recommended model
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`,
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
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
      padding: 2,
      paddingBottom: 0
    }}>
      <Box sx={{ mb: 2 }}>
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
          <Alert severity="success" sx={{ mb: 2 }}>
            Gemini API key is valid. Using model: {MODEL_NAME}
          </Alert>
        )}
      </Box>
      
      <Box sx={{ 
        flexGrow: 1,
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
            {apiKeyValid === true 
              ? 'Start a conversation with Gemini...' 
              : 'Add your API key to the .env file to start chatting with Gemini...'}
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
                <MessageContent content={message.content} role={message.role} />
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

      <Box sx={{ display: 'flex', gap: 1, pb: 2 }}>
        <TextField
          fullWidth
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
        />
        <Button 
          variant="contained" 
          onClick={handleSend}
          disabled={loading || !input.trim() || apiKeyValid !== true}
          color="primary"
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Send'}
        </Button>
      </Box>
    </Box>
  );
};

export default GeminiChatComponent;