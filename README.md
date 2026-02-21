# AI Chat React Application

A modern, secure React application for chatting with multiple AI providers including OpenAI, Hugging Face, and Google Gemini. Features persistent chat sessions, secure API key management via backend proxy, and comprehensive error handling.

## 🚀 Features

### Core Features
- **Multiple AI Providers**: OpenAI GPT, Hugging Face, Google Gemini, and Mock AI
- **RAG Pipeline**: Upload PDFs and get AI answers with citations using LangChain.js + Pinecone
- **Persistent Chat History**: Automatic localStorage backup with session management
- **Secure API Handling**: Backend proxy eliminates frontend API key exposure
- **Session Management**: Save, load, export, and import chat conversations
- **Real-time Error Handling**: Comprehensive error boundaries and user feedback
- **Professional UI**: Material-UI components with responsive design

### Security & Performance
- **🔐 Secure**: API keys stored safely on backend server
- **⚡ Fast**: Context-based state management with optimized re-renders
- **🛡️ Robust**: Error boundaries, proper logging, and graceful degradation
- **📱 Responsive**: Mobile-friendly interface with touch support

## 📋 Prerequisites

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- API keys for desired providers (optional, can use Mock AI)

## 🛠️ Installation & Setup

### 1. Clone and Install Frontend

```bash
git clone <your-repo-url>
cd ai-chat-react
npm install
```

### 2. Setup Backend Server

```bash
cd server
npm install
```

### 3. Configure Environment Variables

**Backend Configuration:**
```bash
cd server
cp .env.example .env
# Edit .env with your API keys
```

**Frontend Configuration:**
```bash
cd .. # Back to root directory
cp .env.example .env.local
# Edit .env.local if needed (backend URL is auto-configured)
```

**Required Backend Environment Variables:**
```env
# API Keys (add the ones you want to use)
OPENAI_API_KEY=your_openai_api_key_here
HUGGINGFACE_TOKEN=your_huggingface_token_here
GEMINI_API_KEY=your_gemini_api_key_here

# Pinecone (Required for RAG functionality)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=ai-chat-rag

# Server Configuration
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 4. Get API Keys (Optional)

- **OpenAI**: [Get API key](https://platform.openai.com/api-keys)
- **Hugging Face**: [Get token](https://huggingface.co/settings/tokens)
- **Google Gemini**: [Get API key](https://makersuite.google.com/app/apikey)
- **Pinecone** (for RAG): [Get API key](https://www.pinecone.io/) and create an index

> **Note**: You can start immediately with the Mock AI provider - no API keys required!

### 5. RAG Pipeline Setup (Optional)

To use the RAG feature with PDF documents:

1. **Get Pinecone API Key**: Sign up at [Pinecone](https://www.pinecone.io/)
2. **Create Pinecone Index**:
   - Name: `ai-chat-rag`
   - Dimensions: `1536` (for OpenAI embeddings)
   - Metric: `cosine`
3. **Add to `.env`**:
   ```env
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX_NAME=ai-chat-rag
   ```

📖 **See [RAG_SETUP.md](RAG_SETUP.md) for detailed RAG setup and usage guide**

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend Server:**
```bash
cd server
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend App:**
```bash
npm run dev  
# App runs on http://localhost:5173
```

### Production Build

**Build Frontend:**
```bash
npm run build
npm run preview
```

**Run Backend:**
```bash
cd server
npm start
```

## 📖 Usage Guide

### Getting Started
1. **Launch the app** - Open http://localhost:5173
2. **Choose Provider** - Click tabs to switch between AI providers
3. **Start Chatting** - Type a message and press Enter or click Send

### Using RAG with PDFs
1. **Select RAG Tab** - Click "RAG with PDFs" tab
2. **Upload PDF** - Click "Upload PDF" and select a document
3. **Ask Questions** - Get AI answers with citations to your documents
4. **View Citations** - See source references with page numbers

📖 **Full RAG Guide**: See [RAG_SETUP.md](RAG_SETUP.md) for complete documentation

### Session Management
1. **Access Sessions** - Click the history icon (📚) in the top-left
2. **Create Session** - Click "New Session" and choose provider
3. **Save Sessions** - Sessions auto-save as you chat
4. **Load Previous** - Click any session in the sidebar to resume
5. **Export/Import** - Use the menu (⋮) to backup your chat history

## 🏗️ Architecture Overview

```
ai-chat-react/
├── src/
│   ├── components/          # React components
│   ├── contexts/           # React Context for state
│   ├── services/           # API services
│   ├── utils/              # Utilities & helpers
│   ├── types/              # TypeScript types
│   └── styles/             # CSS and styling
└── server/                 # Express backend
    ├── server.js           # Main server file
    └── package.json        # Backend dependencies
```

## 🔧 Configuration

### Frontend Environment Variables
```env
VITE_API_BASE_URL=http://localhost:3001/api  # Backend URL
```

## 🚨 Troubleshooting

### Common Issues

**Backend Connection Failed:**
```bash
# Check backend is running
curl http://localhost:3001/health
```

**API Key Issues:**
- Verify API keys in `server/.env`
- Try Mock AI first to verify app functionality

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.
```
