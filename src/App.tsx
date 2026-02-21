import { useState, useMemo } from 'react'
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  AppBar, 
  Toolbar,
  ThemeProvider,
  createTheme,
  IconButton,
  useMediaQuery,
  CssBaseline
} from '@mui/material'
import { History as HistoryIcon, Brightness4, Brightness7 } from '@mui/icons-material'
import { ChatProvider } from './contexts/ChatContext'
import ErrorBoundary from './components/ErrorBoundary'
import SessionManager from './components/SessionManager'
import ChatComponent from './components/ChatComponent'
import MockChatComponent from './components/MockChatComponent'
import HuggingFaceChatComponent from './components/HuggingFaceChatComponent'
import GeminiChatComponent from './components/GeminiChatComponent'
import RAGChatComponent from './components/RAGChatComponent'

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false);
  
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useState(prefersDarkMode);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: darkMode ? '#90caf9' : '#1976d2',
          },
          secondary: {
            main: darkMode ? '#f48fb1' : '#dc004e',
          },
          background: {
            default: darkMode ? '#121212' : '#ffffff',
            paper: darkMode ? '#1e1e1e' : '#ffffff',
          },
        },
      }),
    [darkMode]
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <ErrorBoundary>
      <ChatProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
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
              <IconButton
                color="inherit"
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
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
              <Tab label="RAG with PDFs" />
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
            {activeTab === 4 && <RAGChatComponent />}
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