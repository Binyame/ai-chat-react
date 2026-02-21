import { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Send as SendIcon,
  Upload as UploadIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

interface Citation {
  id: number;
  fileName: string;
  page: string | number;
  text: string;
}

interface Namespace {
  name: string;
  vectorCount: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export default function RAGChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState('default');
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadNamespaces();
  }, []);

  const loadNamespaces = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rag/namespaces`);
      const data = await response.json();

      if (data.success) {
        setNamespaces(data.namespaces || []);
      }
    } catch (err) {
      console.error('Failed to load namespaces:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('namespace', selectedNamespace);

    try {
      const response = await fetch(`${API_BASE_URL}/rag/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadSuccess(`Successfully uploaded ${file.name} (${data.chunks} chunks from ${data.pages} pages)`);
        loadNamespaces();
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError(data.error || 'Failed to upload PDF');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: input,
          namespace: selectedNamespace,
          topK: 4,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer,
          citations: data.citations,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setError(data.error || 'Failed to get response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNamespace = async (namespace: string) => {
    if (!confirm(`Are you sure you want to delete the namespace "${namespace}"? This will remove all uploaded documents.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/rag/namespace/${namespace}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        loadNamespaces();
        if (selectedNamespace === namespace) {
          setSelectedNamespace('default');
        }
      } else {
        setError(data.error || 'Failed to delete namespace');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete namespace');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          RAG Chat with Citations
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Upload PDFs and ask questions. Answers will include citations to source documents.
        </Typography>

        {/* Namespace selector and upload */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
          <TextField
            select
            size="small"
            label="Document Collection"
            value={selectedNamespace}
            onChange={(e) => setSelectedNamespace(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ minWidth: 200 }}
          >
            <option value="default">Default</option>
            {namespaces.filter(ns => ns.name !== 'default').map((ns) => (
              <option key={ns.name} value={ns.name}>
                {ns.name} ({ns.vectorCount} vectors)
              </option>
            ))}
          </TextField>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Upload PDF
          </Button>

          <Button
            variant="outlined"
            startIcon={<FolderIcon />}
            onClick={() => setManageDialogOpen(true)}
          >
            Manage Collections
          </Button>
        </Stack>

        {/* Success/Error messages */}
        {uploadSuccess && (
          <Alert severity="success" sx={{ mt: 2 }} onClose={() => setUploadSuccess(null)}>
            {uploadSuccess}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
            <DescriptionIcon sx={{ fontSize: 60, mb: 2, opacity: 0.3 }} />
            <Typography variant="h6">No messages yet</Typography>
            <Typography variant="body2">
              Upload a PDF document and start asking questions about it
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => (
            <Paper
              key={index}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: message.role === 'user' ? 'primary.light' : 'background.paper',
                ml: message.role === 'user' ? 'auto' : 0,
                mr: message.role === 'user' ? 0 : 'auto',
                maxWidth: '80%',
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>

              {/* Citations */}
              {message.citations && message.citations.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                    Sources:
                  </Typography>
                  {message.citations.map((citation) => (
                    <Card key={citation.id} variant="outlined" sx={{ mb: 1, bgcolor: 'action.hover' }}>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Chip label={`[${citation.id}]`} size="small" color="primary" />
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {citation.fileName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Page {citation.page}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          {citation.text}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Paper>
          ))
        )}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question about your documents..."
          disabled={loading}
        />
        <Button
          variant="contained"
          onClick={handleSendMessage}
          disabled={loading || !input.trim()}
          sx={{ minWidth: 100 }}
          endIcon={<SendIcon />}
        >
          Send
        </Button>
      </Box>

      {/* Manage Collections Dialog */}
      <Dialog open={manageDialogOpen} onClose={() => setManageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Document Collections</DialogTitle>
        <DialogContent>
          {namespaces.length === 0 ? (
            <Typography color="text.secondary">No collections found. Upload a PDF to get started.</Typography>
          ) : (
            <List>
              {namespaces.map((ns) => (
                <ListItem
                  key={ns.name}
                  secondaryAction={
                    ns.name !== 'default' && (
                      <IconButton edge="end" onClick={() => handleDeleteNamespace(ns.name)}>
                        <DeleteIcon />
                      </IconButton>
                    )
                  }
                >
                  <ListItemText
                    primary={ns.name}
                    secondary={`${ns.vectorCount} document chunks`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
