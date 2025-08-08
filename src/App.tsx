import { useState } from 'react'
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  AppBar, 
  Toolbar,
  ThemeProvider,
  createTheme,
  IconButton
} from '@mui/material'
import { History as HistoryIcon } from '@mui/icons-material'
import { ChatProvider } from './contexts/ChatContext'
import ErrorBoundary from './components/ErrorBoundary'
import SessionManager from './components/SessionManager'
import ChatComponent from './components/ChatComponent'
import MockChatComponent from './components/MockChatComponent'
import HuggingFaceChatComponent from './components/HuggingFaceChatComponent'
import GeminiChatComponent from './components/GeminiChatComponent'

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <ErrorBoundary>
      <ChatProvider>
        <ThemeProvider theme={theme}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100vh',
            overflow: 'hidden'
          }}>
          <AppBar position="static">
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => setSessionManagerOpen(true)}
                sx={{ mr: 2 }}
              >
                <HistoryIcon />
              </IconButton>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                AI Chat Application
              </Typography>
            </Toolbar>
          </AppBar>
          
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'divider'
          }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="chat provider tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Mock (Local)" />
              <Tab label="OpenAI API" />
              <Tab label="Hugging Face" />
              <Tab label="Gemini API" />
            </Tabs>
          </Box>
          
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column'
          }}>
            {activeTab === 0 && <MockChatComponent />}
            {activeTab === 1 && <ChatComponent />}
            {activeTab === 2 && <HuggingFaceChatComponent />}
            {activeTab === 3 && <GeminiChatComponent />}
          </Box>
          
          <SessionManager 
            open={sessionManagerOpen} 
            onClose={() => setSessionManagerOpen(false)} 
          />
          </Box>
        </ThemeProvider>
      </ChatProvider>
    </ErrorBoundary>
  )
}

export default App