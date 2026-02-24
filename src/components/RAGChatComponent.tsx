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
  Collapse,
  Skeleton,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Send as SendIcon,
  Upload as UploadIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  ExpandMore as ExpandMoreIcon,
  CloudUpload as CloudUploadIcon,
  AutoAwesome as AutoAwesomeIcon,
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
  relevance?: string;
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
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState('default');
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set());
  const [showCitations, setShowCitations] = useState<Set<number>>(new Set());

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
    setUploadProgress('Uploading PDF...');

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('namespace', selectedNamespace);

    try {
      setUploadProgress('Processing PDF...');
      const response = await fetch(`${API_BASE_URL}/rag/upload`, {
        method: 'POST',
        body: formData,
      });

      setUploadProgress('Creating embeddings...');
      const data = await response.json();

      if (data.success) {
        setUploadProgress('');
        setUploadSuccess(`✅ Successfully uploaded ${file.name} (${data.chunks} chunks from ${data.pages} pages)`);
        loadNamespaces();
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setUploadProgress('');
        const errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error || 'Failed to upload PDF');
        setError(errorMsg);
        console.error('Upload error:', data);
      }
    } catch (err) {
      setUploadProgress('');
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      console.error('Upload exception:', err);
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        // Trigger upload with the dropped file
        const fakeEvent = {
          target: { files: [file] }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(fakeEvent);
      } else {
        setError('Please upload a PDF file');
      }
    }
  };

  const toggleCitation = (messageIndex: number, citationId: number) => {
    const key = `${messageIndex}-${citationId}`;
    setExpandedCitations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleCitationsVisibility = (messageIndex: number) => {
    setShowCitations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex);
      } else {
        newSet.add(messageIndex);
      }
      return newSet;
    });
  };

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, md: 3 }, pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            RAG Chat with Citations
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Upload PDFs and ask questions. Answers include citations with relevance scores.
        </Typography>

        {/* Drag and Drop Upload Zone */}
        <Box
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          sx={{
            mt: 2,
            p: 3,
            border: '2px dashed',
            borderColor: dragActive ? 'primary.main' : 'divider',
            borderRadius: 2,
            bgcolor: dragActive ? 'action.hover' : 'background.paper',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
          }}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          <CloudUploadIcon
            sx={{
              fontSize: 48,
              color: dragActive ? 'primary.main' : 'text.secondary',
              mb: 1,
              transition: 'color 0.2s ease'
            }}
          />
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {uploading ? 'Processing...' : 'Drop PDF here or click to browse'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Supports PDF files up to 50MB
          </Typography>
        </Box>

        {/* Namespace selector and manage button */}
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

          <Button
            variant="outlined"
            size="small"
            startIcon={<FolderIcon />}
            onClick={() => setManageDialogOpen(true)}
          >
            Manage Collections
          </Button>
        </Stack>

        {/* Upload Progress */}
        {uploadProgress && (
          <Alert severity="info" sx={{ mt: 2 }} icon={<CircularProgress size={20} />}>
            {uploadProgress}
          </Alert>
        )}

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

      <Divider />

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 2 }}>
        {messages.length === 0 ? (
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
                  <DescriptionIcon sx={{ fontSize: 80, mb: 2, opacity: 0.5, color: 'primary.main' }} />
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                    Welcome to RAG Chat
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Upload PDF documents and ask questions to get AI-powered answers with citations
                  </Typography>
                  <Stack spacing={1} alignItems="flex-start" sx={{ textAlign: 'left', mx: 'auto', maxWidth: 400 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>1.</Typography>
                      <Typography>Drop a PDF or click the upload zone above</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>2.</Typography>
                      <Typography>Ask questions about the content</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>3.</Typography>
                      <Typography>Get answers with source citations and relevance scores</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Zoom>
            </Box>
          </Fade>
        ) : (
          messages.map((message, index) => (
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
                    <Chip label="RAG" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                  )}
                </Stack>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'inherit', lineHeight: 1.6 }}>
                  {message.content}
                </Typography>

                {/* Citations */}
                {message.citations && message.citations.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 1.5, borderColor: 'divider' }} />
                    <Box
                      onClick={() => toggleCitationsVisibility(index)}
                      sx={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'action.selected',
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          {showCitations.has(index) ? 'Hide citations' : `View ${message.citations.length} citation${message.citations.length > 1 ? 's' : ''}`}
                        </Typography>
                        <Chip label={message.citations.length} size="small" color="primary" sx={{ height: 20 }} />
                      </Stack>
                      <IconButton
                        size="small"
                        sx={{
                          transform: showCitations.has(index) ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease',
                        }}
                      >
                        <ExpandMoreIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Collapse in={showCitations.has(index)} timeout={300}>
                      <Box sx={{ mt: 1.5 }}>
                        {message.citations.map((citation) => {
                          const citationKey = `${index}-${citation.id}`;
                          const isExpanded = expandedCitations.has(citationKey);

                          return (
                            <Card
                              key={citation.id}
                              variant="outlined"
                              sx={{
                                mb: 1,
                                bgcolor: 'background.default',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                  boxShadow: 1,
                                },
                              }}
                            >
                              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Box
                                  onClick={() => toggleCitation(index, citation.id)}
                                  sx={{
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Chip label={`[${citation.id}]`} size="small" color="primary" />
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                      {citation.fileName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Page {citation.page}
                                    </Typography>
                                    {citation.relevance && (
                                      <Chip
                                        label={`Score: ${citation.relevance}`}
                                        size="small"
                                        variant="outlined"
                                        color={parseFloat(citation.relevance) > 0.7 ? 'success' : 'default'}
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                      />
                                    )}
                                  </Stack>
                                  <IconButton
                                    size="small"
                                    sx={{
                                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.3s ease',
                                    }}
                                  >
                                    <ExpandMoreIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                                <Collapse in={isExpanded} timeout={300}>
                                  <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      {citation.text}
                                    </Typography>
                                  </Box>
                                </Collapse>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Box>
                    </Collapse>
                  </Box>
                )}
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
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
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
          onKeyPress={handleKeyPress}
          placeholder="Ask a question about your documents..."
          disabled={loading}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.default',
            },
          }}
        />
        <Button
          variant="contained"
          onClick={handleSendMessage}
          disabled={loading || !input.trim()}
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
