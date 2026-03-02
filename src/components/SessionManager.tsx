import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Divider,
  Menu,
  MenuItem,
  Alert
} from '@mui/material';
import {
  History as HistoryIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useChatContext } from '../contexts/ChatContext';
import { ApiProviderType } from '../types';
import { exportChatHistory, importChatHistory } from '../utils/storage';

interface SessionManagerProps {
  open: boolean;
  onClose: () => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ open, onClose }) => {
  const { state, createSession, loadSession, deleteSession, clearCurrentSession } = useChatContext();
  const [newSessionDialog, setNewSessionDialog] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionProvider, setNewSessionProvider] = useState<ApiProviderType>('rag');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleCreateSession = () => {
    if (newSessionName.trim()) {
      createSession(newSessionProvider, newSessionName.trim());
      setNewSessionName('');
      setNewSessionDialog(false);
    } else {
      createSession(newSessionProvider);
      setNewSessionDialog(false);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      deleteSession(sessionId);
    }
  };

  const handleExport = () => {
    const data = exportChatHistory();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setAnchorEl(null);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const success = importChatHistory(content);
          if (success) {
            window.location.reload(); // Refresh to load imported data
          } else {
            setImportError('Failed to import chat history. Please check the file format.');
          }
        } catch (error) {
          setImportError('Invalid file format. Please select a valid chat history export.');
        }
      };
      reader.readAsText(file);
    }
    setAnchorEl(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'rag': return 'primary';
      case 'openai': return 'success';
      case 'gemini': return 'info';
      default: return 'default';
    }
  };

  return (
    <>
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{ '& .MuiDrawer-paper': { width: 350 } }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon />
              Chat Sessions
            </Typography>
            <Box>
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <MoreVertIcon />
              </IconButton>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {importError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setImportError(null)}>
              {importError}
            </Alert>
          )}

          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            fullWidth
            onClick={() => setNewSessionDialog(true)}
            sx={{ mb: 2 }}
          >
            New Session
          </Button>

          {state.currentSession && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Current Session
              </Typography>
              <Box sx={{ 
                p: 1, 
                border: 2, 
                borderColor: 'primary.main', 
                borderRadius: 1,
                bgcolor: 'primary.50'
              }}>
                <Typography variant="body2" fontWeight="bold">
                  {state.currentSession.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip 
                    label={state.currentSession.provider} 
                    size="small" 
                    color={getProviderColor(state.currentSession.provider) as any}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {state.currentSession.messages.length} messages
                  </Typography>
                </Box>
                <Button 
                  size="small" 
                  onClick={clearCurrentSession}
                  sx={{ mt: 1 }}
                >
                  Clear Session
                </Button>
              </Box>
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />
          
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
            Previous Sessions ({state.sessions.length})
          </Typography>

          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {state.sessions
              .filter(session => session.id !== state.currentSession?.id)
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((session) => (
                <ListItem key={session.id} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      loadSession(session.id);
                      onClose();
                    }}
                    sx={{ borderRadius: 1, mb: 0.5 }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ flexGrow: 1 }}>
                            {session.name}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={session.provider} 
                              size="small" 
                              color={getProviderColor(session.provider) as any}
                            />
                            <Typography variant="caption">
                              {session.messages.length} msgs
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="textSecondary">
                            {formatDate(session.updatedAt)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            {state.sessions.length === 0 && (
              <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ py: 2 }}>
                No saved sessions yet
              </Typography>
            )}
          </List>
        </Box>
      </Drawer>

      {/* Menu for import/export */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={handleExport}>
          <DownloadIcon sx={{ mr: 1 }} />
          Export Sessions
        </MenuItem>
        <MenuItem component="label">
          <UploadIcon sx={{ mr: 1 }} />
          Import Sessions
          <input
            type="file"
            accept=".json"
            hidden
            onChange={handleImport}
          />
        </MenuItem>
      </Menu>

      {/* New Session Dialog */}
      <Dialog
        open={newSessionDialog}
        onClose={() => setNewSessionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Chat Session</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Session Name (optional)"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              sx={{ mb: 3 }}
              placeholder="e.g., Research Notes, Code Review, Project Planning"
              helperText="Give your conversation a memorable name to find it later"
            />

            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Select AI Provider
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
              Choose which AI model to use for this conversation
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                {
                  id: 'rag' as ApiProviderType,
                  name: 'RAG with PDFs',
                  description: 'Upload documents and ask questions with cited answers',
                  color: 'primary' as const
                },
                {
                  id: 'openai' as ApiProviderType,
                  name: 'OpenAI Chat',
                  description: 'GPT-3.5/4 - Best for general chat and coding tasks',
                  color: 'success' as const
                },
                {
                  id: 'gemini' as ApiProviderType,
                  name: 'Gemini Chat',
                  description: 'Advanced reasoning and analysis capabilities',
                  color: 'info' as const
                }
              ].map((provider) => (
                <Box
                  key={provider.id}
                  onClick={() => setNewSessionProvider(provider.id)}
                  sx={{
                    p: 2,
                    border: 2,
                    borderColor: newSessionProvider === provider.id ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: newSessionProvider === provider.id ? 'primary.50' : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.light',
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label={provider.name}
                      size="small"
                      color={provider.color}
                    />
                    {newSessionProvider === provider.id && (
                      <Typography variant="caption" color="primary" fontWeight="bold">
                        ✓ Selected
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {provider.description}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="caption">
                <strong>Tip:</strong> Sessions let you organize conversations by topic or project.
                You can switch between them anytime from the session menu.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSessionDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateSession} variant="contained" size="large">
            Create Session
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SessionManager;