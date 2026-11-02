const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const ragService = require('./services/ragService');

const app = express();
const PORT = process.env.PORT || 3001;

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// OpenAI API proxy
app.post('/api/openai/chat', async (req, res) => {
  try {
    const { messages, model = 'gpt-4o-mini', max_tokens = 1000, temperature = 0.7 } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured on server'
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages,
        max_tokens,
        temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const assistantMessage = response.data.choices?.[0]?.message?.content || 'No response generated';

    res.json({
      success: true,
      data: assistantMessage,
      usage: response.data.usage
    });

  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 429) {
        return res.status(429).json({ success: false, error: 'OpenAI rate limit hit. Wait a moment and try again, or upgrade your OpenAI plan.' });
      } else if (status === 401) {
        return res.status(500).json({ success: false, error: 'OpenAI API key is invalid or expired. Check OPENAI_API_KEY in server/.env.' });
      } else if (status === 503) {
        return res.status(503).json({ success: false, error: 'OpenAI service is temporarily unavailable. Try again in a few seconds.' });
      } else {
        return res.status(500).json({ success: false, error: errorData?.error?.message || `OpenAI API error (${status})` });
      }
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ success: false, error: 'Request to OpenAI timed out. Try a shorter message or try again.' });
    }

    res.status(500).json({ success: false, error: 'Could not reach OpenAI API. Check your internet connection.' });
  }
});

// OpenAI streaming endpoint
app.post('/api/openai/chat/stream', async (req, res) => {
  try {
    const { messages, model = 'gpt-4o-mini', max_tokens = 1000, temperature = 0.7 } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ success: false, error: 'OpenAI API key not configured on server' });
    }
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'Messages array is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model, messages, max_tokens, temperature, stream: true },
      {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        responseType: 'stream',
        timeout: 60000
      }
    );

    let buffer = '';
    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') { res.write('data: [DONE]\n\n'); res.end(); return; }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
          } catch {}
        }
      }
    });
    response.data.on('end', () => { res.write('data: [DONE]\n\n'); res.end(); });
    response.data.on('error', () => { res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`); res.end(); });
    req.on('close', () => response.data.destroy());

  } catch (error) {
    console.error('OpenAI Streaming Error:', error.response?.data || error.message);
    if (!res.headersSent) res.status(500).json({ success: false, error: error.message || 'Streaming failed' });
  }
});

// Hugging Face API proxy with multiple fallback strategies
app.post('/api/huggingface/chat', async (req, res) => {
  try {
    const { input } = req.body;

    if (!process.env.HUGGINGFACE_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'Hugging Face token not configured on server'
      });
    }

    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'Input text is required'
      });
    }

    // Try multiple working models as fallbacks
    const models = [
      'facebook/blenderbot-400M-distill',
      'microsoft/DialoGPT-small', 
      'gpt2',
      'distilgpt2'
    ];

    let lastError = null;

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        
        const response = await axios.post(
          `https://api-inference.huggingface.co/models/${model}`,
          { 
            inputs: input,
            parameters: {
              max_length: 100,
              temperature: 0.7,
              do_sample: true
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );

        let assistantMessage = 'No response generated';
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          const result = response.data[0];
          assistantMessage = result.generated_text || result.summary_text || result.translation_text || assistantMessage;
          
          // Clean up the response (remove input echo for GPT models)
          if (assistantMessage.startsWith(input)) {
            assistantMessage = assistantMessage.substring(input.length).trim();
          }
        } else if (response.data.generated_text) {
          assistantMessage = response.data.generated_text;
        }

        // If we get here, the request succeeded
        console.log(`✅ Success with model: ${model}`);
        return res.json({
          success: true,
          data: assistantMessage || 'I received your message but had trouble generating a response.',
          model: model
        });

      } catch (modelError) {
        lastError = modelError;
        console.log(`❌ Model ${model} failed:`, modelError.response?.status || modelError.message);
        
        // If it's a 503, the model might just be loading
        if (modelError.response?.status === 503) {
          console.log(`Model ${model} is loading, continuing to next model...`);
          continue;
        }
        
        // For other errors, also continue to next model
        continue;
      }
    }

    // If we get here, all models failed
    console.error('All Hugging Face models failed. Last error:', lastError?.response?.data || lastError?.message);
    
    // Provide helpful error message based on the last error
    if (lastError?.response) {
      const status = lastError.response.status;
      
      if (status === 401 || status === 403) {
        return res.status(500).json({
          success: false,
          error: 'Hugging Face API authentication failed. Please check your token permissions.'
        });
      } else if (status === 404) {
        return res.status(500).json({
          success: false,
          error: 'Hugging Face models not accessible. Your account may not have Inference API access.'
        });
      } else if (status === 503) {
        return res.status(503).json({
          success: false,
          error: 'All Hugging Face models are currently loading. Please try again in 1-2 minutes.'
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Unable to connect to Hugging Face Inference API. This may be due to account limitations or API changes.'
    });

  } catch (error) {
    console.error('Hugging Face API Proxy Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to communicate with Hugging Face API'
    });
  }
});

// Gemini API proxy
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, model = 'gemini-1.5-flash' } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key not configured on server'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: message
          }]
        }],
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
        },
        timeout: 30000
      }
    );

    let assistantMessage = 'No response generated';
    
    if (response.data.candidates && 
        response.data.candidates.length > 0 && 
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts &&
        response.data.candidates[0].content.parts.length > 0) {
      assistantMessage = response.data.candidates[0].content.parts[0].text || assistantMessage;
    }

    res.json({
      success: true,
      data: assistantMessage
    });

  } catch (error) {
    console.error('Gemini API Error:', error.response?.data || error.message);
    
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 400 && errorData?.error?.message?.includes('API key')) {
        return res.status(500).json({ success: false, error: 'Gemini API key is invalid. Check GEMINI_API_KEY in server/.env.' });
      } else if (status === 429) {
        return res.status(429).json({ success: false, error: 'Gemini rate limit hit. Wait a moment and try again.' });
      } else if (status === 404) {
        return res.status(500).json({ success: false, error: `Gemini model not found. The model may have been deprecated.` });
      } else {
        return res.status(500).json({ success: false, error: errorData?.error?.message || `Gemini API error (${status})` });
      }
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ success: false, error: 'Request to Gemini timed out. Try a shorter message or try again.' });
    }

    res.status(500).json({ success: false, error: 'Could not reach Gemini API. Check your internet connection.' });
  }
});

// RAG Pipeline Endpoints

// Upload and ingest PDF
app.post('/api/rag/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded'
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, error: 'OPENAI_API_KEY is not configured on the server (required for embeddings)' });
    }
    if (!process.env.PINECONE_API_KEY) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, error: 'PINECONE_API_KEY is not configured on the server' });
    }

    const namespace = req.body.namespace || 'default';
    const metadata = {
      namespace,
      uploadedAt: new Date().toISOString(),
      originalName: req.file.originalname,
    };

    const result = await ragService.ingestPDF(req.file.path, metadata);

    // Optionally delete the file after ingestion
    if (process.env.DELETE_UPLOADED_PDFS !== 'false') {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      ...result,
      message: `Successfully ingested ${result.fileName}`
    });

  } catch (error) {
    console.error('PDF Upload Error:', error.message);

    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to ingest PDF'
    });
  }
});

// Gemini streaming endpoint
app.post('/api/gemini/chat/stream', async (req, res) => {
  try {
    const { message, model = 'gemini-2.0-flash' } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: 'Gemini API key not configured on server' });
    }
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${process.env.GEMINI_API_KEY}&alt=sse`,
      {
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024 }
      },
      { headers: { 'Content-Type': 'application/json' }, responseType: 'stream', timeout: 60000 }
    );

    let buffer = '';
    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') { res.write('data: [DONE]\n\n'); res.end(); return; }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
          } catch {}
        }
      }
    });
    response.data.on('end', () => { res.write('data: [DONE]\n\n'); res.end(); });
    response.data.on('error', () => { res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`); res.end(); });
    req.on('close', () => response.data.destroy());

  } catch (error) {
    console.error('Gemini Streaming Error:', error.response?.data || error.message);
    if (!res.headersSent) res.status(500).json({ success: false, error: error.message || 'Streaming failed' });
  }
});

// Query RAG with citations
app.post('/api/rag/query', async (req, res) => {
  try {
    const { question, namespace = 'default', topK = 4, chatHistory = [] } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ success: false, error: 'OPENAI_API_KEY is not configured on the server (required for embeddings)' });
    }
    if (!process.env.PINECONE_API_KEY) {
      return res.status(500).json({ success: false, error: 'PINECONE_API_KEY is not configured on the server' });
    }

    const result = await ragService.query(question, namespace, topK, chatHistory);

    res.json(result);

  } catch (error) {
    console.error('RAG Query Error:', error.message);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to query RAG'
    });
  }
});

// List available namespaces
app.get('/api/rag/namespaces', async (req, res) => {
  try {
    if (!process.env.PINECONE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Pinecone API key is required'
      });
    }

    const result = await ragService.listNamespaces();
    res.json(result);

  } catch (error) {
    console.error('List Namespaces Error:', error.message);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list namespaces'
    });
  }
});

// Delete a namespace
app.delete('/api/rag/namespace/:namespace', async (req, res) => {
  try {
    const { namespace } = req.params;

    if (!namespace) {
      return res.status(400).json({
        success: false,
        error: 'Namespace is required'
      });
    }

    if (!process.env.PINECONE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Pinecone API key is required'
      });
    }

    await ragService.deleteNamespace(namespace);

    res.json({
      success: true,
      message: `Namespace '${namespace}' deleted successfully`
    });

  } catch (error) {
    console.error('Delete Namespace Error:', error.message);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete namespace'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Handle multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server with automatic port handling
const server = app.listen(PORT, () => {
  console.log(`🚀 AI Chat Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Check API key configuration
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasHuggingFace = !!process.env.HUGGINGFACE_TOKEN;
  const hasGemini = !!process.env.GEMINI_API_KEY;

  console.log('🔑 API Keys configured:');
  console.log(`   OpenAI: ${hasOpenAI ? '✅' : '❌'}`);
  console.log(`   Hugging Face: ${hasHuggingFace ? '✅' : '❌'}`);
  console.log(`   Gemini: ${hasGemini ? '✅' : '❌'}`);

  if (!hasOpenAI && !hasHuggingFace && !hasGemini) {
    console.warn('⚠️  No API keys configured. Please check your .env file.');
  }
});

// Handle port already in use error
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`⚠️  Port ${PORT} is already in use. Attempting to use next available port...`);

    // Try next port
    const nextPort = parseInt(PORT) + 1;
    console.log(`🔄 Trying port ${nextPort}...`);

    app.listen(nextPort, () => {
      console.log(`✅ Server started on port ${nextPort} instead`);
      console.log(`📍 Health check: http://localhost:${nextPort}/health`);
      console.log(`⚠️  Update your frontend .env: VITE_API_BASE_URL=http://localhost:${nextPort}/api`);
    });
  } else {
    throw error;
  }
});