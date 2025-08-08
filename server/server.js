const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

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
    const { messages, model = 'gpt-3.5-turbo', max_tokens = 1000, temperature = 0.7 } = req.body;

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
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Please try again later.'
        });
      } else if (status === 401) {
        return res.status(500).json({
          success: false,
          error: 'Invalid API key configuration'
        });
      } else {
        return res.status(500).json({
          success: false,
          error: errorData?.error?.message || `API Error: ${status}`
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to communicate with OpenAI API'
    });
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
        return res.status(500).json({
          success: false,
          error: 'Invalid Gemini API key configuration'
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to communicate with Gemini API'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
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