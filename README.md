# AI Chat with RAG Pipeline

A production-ready React application that demonstrates retrieval-augmented generation (RAG) for document Q&A with multiple AI providers. Upload PDFs, ask questions, and get AI-generated answers with source citations.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![LangChain](https://img.shields.io/badge/🦜_LangChain-121212?style=flat)](https://js.langchain.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)](https://openai.com/)

🔗 **[Live Demo](https://d3m7knm0s6dj1k.cloudfront.net)** - Deployed on AWS with CloudFront (HTTPS)

---

## Technical Overview

**The core problem:** When using LLMs to answer questions about user documents, you need to retrieve relevant context without exceeding token limits or losing semantic meaning across page boundaries.

**My approach:**

1. **Document Chunking Strategy** - Used LangChain's `RecursiveCharacterTextSplitter` with 1000-character chunks and 200-character overlap. The overlap preserves context across boundaries; after testing various sizes, 1000 chars balanced semantic completeness with embedding efficiency.

2. **Embedding Dimensions Trade-off** - Initially tried OpenAI's 1536-dim embeddings but switched to 768-dim (`text-embedding-3-small`) to reduce Pinecone storage costs by 50% with minimal accuracy loss. For most document Q&A, the semantic capture is nearly identical.

3. **Vector Database Choice** - Chose Pinecone over self-hosted Weaviate/Chroma for two reasons: (a) serverless scaling eliminates cold-start issues during demos, (b) namespace isolation lets users maintain separate document collections without cross-contamination.

4. **Backend Proxy Pattern** - All AI provider calls route through an Express backend. This wasn't just for API key security—it enabled request logging, rate limiting, and the ability to swap providers without frontend changes. The abstraction cost is one extra network hop (~20ms) but the operational flexibility is worth it.

5. **LLM Provider Flexibility** - Integrated OpenAI, Gemini, and Hugging Face with a common interface. Initially tried using Gemini embeddings for cost savings, but LangChain's v2.1.20 didn't support their embedding API properly (404 errors), so I stuck with OpenAI embeddings and used Gemini only for chat completions where it worked reliably.

6. **Hallucination Prevention** - Multi-layer approach to ensure answers stay grounded in source documents:
   - **Two-phase retrieval**: Initially retrieves top-4 candidates (topK=4), then filters to 2-6 final chunks based on dynamic threshold—prevents context stuffing while ensuring sufficient evidence
   - **Similarity score filtering** (safe retrieval gate): Uses `similaritySearchWithScore` with dynamic threshold—keeps chunks within 70% of top score, adapting to different embedding models without hardcoded values
   - **Explicit "not found" short-circuit**: If top score < 0.3, return "not found in documents" immediately without calling the LLM, eliminating hallucination in zero-evidence cases
   - **Strict grounding prompt**: System instructions enforce answer only from provided context, otherwise respond "not found," and always cite sources using `[1]`, `[2]` notation
   - **Transparent citations with relevance**: Each citation includes filename + page number + relevance score (e.g., 0.85) for debugging and user trust
   - **Context limits**: Minimum 2 chunks for sufficient context, maximum 6 to prevent stuffing (quality over quantity)
   - **Observability**: Server logs retrieval scores and selected chunks for each query, enabling trace-back of why specific answers were produced and threshold tuning based on real usage patterns

**What I'd do differently at scale:**
- Implement semantic caching to avoid re-embedding identical documents
- Add BM25 hybrid search alongside vector similarity (catches keyword matches vectors miss)
- Use streaming responses for better UX on slower models
- Deduplicate chunks from same document/page to increase context diversity

---

## Architecture Decisions

### State Management
Chose React Context over Redux because the state graph is simple (current session + chat history). Context re-renders are optimized with `useMemo` on selectors. For a multi-tenant version, I'd switch to Zustand for better dev tools and middleware support.

### Error Boundaries
Implemented granular error boundaries around the RAG upload component specifically—PDF parsing can fail unpredictably with malformed files. Rather than crashing the whole app, failed uploads show inline errors while keeping the chat functional.

### Storage Strategy
Chat sessions persist to localStorage with a TTL-based eviction policy (oldest first when storage fills). Considered IndexedDB for larger storage, but localStorage's synchronous API simplified the codebase and 10MB is sufficient for ~1000 messages.

---

## Features

✨ **Multi-Provider AI Chat**

- RAG with PDF uploads and cited answers
- OpenAI GPT-3.5 Turbo chat
- Google Gemini 2.5 Flash chat

🔄 **Session Management**

- Per-provider session isolation
- Persistent conversation history (localStorage)
- Session switching without data loss
- Export/import session history

🛡️ **Anti-Hallucination Architecture**

- Two-phase retrieval with dynamic thresholding
- Explicit "not found" responses
- Source citation with relevance scores
- Context limits (2-6 chunks)

☁️ **Production Deployment**

- AWS Elastic Beanstalk (backend)
- AWS S3 + CloudFront (frontend with HTTPS)
- Environment variable management
- CORS configuration

---

## Tech Stack

**Frontend:**

- React 18 + TypeScript (strict mode)
- Material-UI for component library
- Vite for build tooling
- React Context for state management

**Backend:**

- Node.js + Express
- LangChain.js for RAG orchestration
- Pinecone vector database (768-dim cosine similarity)
- pdf-parse v1.1.1 for text extraction

**AI Models:**

- OpenAI `gpt-3.5-turbo` for answer generation
- OpenAI `text-embedding-3-small` for vector embeddings (768 dims)
- Google Gemini 2.5 Flash as alternate LLM provider

**Infrastructure:**

- AWS Elastic Beanstalk (Node.js 20 on Amazon Linux 2023)
- AWS S3 (static website hosting)
- AWS CloudFront (CDN with HTTPS)
- Pinecone (serverless vector database)

---

## Getting Started

### Prerequisites
- Node.js 18+
- API keys: OpenAI (required for RAG), Pinecone (required for RAG)
- Optional: Gemini, Hugging Face for additional chat providers

### Quick Start

```bash
# Clone and install
git clone <your-repo-url>
cd ai-chat-react
npm install

# Setup backend
cd server
npm install
cp .env.example .env
# Edit server/.env with your API keys
```

**Required environment variables (server/.env):**
```env
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=ai-chat-rag
PORT=3001
```

**Create Pinecone index:**
- Name: `ai-chat-rag`
- Dimensions: `768`
- Metric: `cosine`

### Run the app

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev
# Open http://localhost:5173
```

---

## 🚀 Deployment

### Live Production Deployment

**🌐 Application URL:** https://d3m7knm0s6dj1k.cloudfront.net

**Current Infrastructure:**

- **Backend:** AWS Elastic Beanstalk (Node.js 20 on Amazon Linux 2023)
  - Environment: `ai-chat-backend-prod`
  - URL: <http://ai-chat-backend-prod.eba-fmvtu3u6.us-east-1.elasticbeanstalk.com>
  - Region: us-east-1

- **Frontend:** AWS S3 + CloudFront
  - CloudFront Distribution: `E3P1COZJYAXZI8`
  - S3 Bucket: `ai-chat-react-binyamseyoum-1772500915`
  - HTTPS enabled with CloudFront default certificate

**Features:**

- ✅ HTTPS with CloudFront SSL
- ✅ Gzip compression enabled
- ✅ CDN caching (24-hour default)
- ✅ Global edge locations
- ✅ Automatic HTTP → HTTPS redirect
- ✅ React Router support (404 → index.html)

### Deploy Your Own

Deploy to AWS using **Elastic Beanstalk** (backend) and **S3 + CloudFront** (frontend):

```bash
# Prerequisites
pip3 install awsebcli --upgrade --user
# or: brew install awsebcli

# Backend Deployment
cd server
eb init --region us-east-1 --platform "Node.js 20"
eb create your-app-backend --single --instance-type t3.micro
eb setenv OPENAI_API_KEY="..." PINECONE_API_KEY="..." \
         PINECONE_INDEX_NAME="..." NODE_ENV="production"

# Frontend Deployment
cd ..
npm run build
BUCKET_NAME="your-app-$(whoami)-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME --region us-east-1
aws s3 sync dist/ s3://$BUCKET_NAME --delete
aws s3 website s3://$BUCKET_NAME --index-document index.html

# CloudFront (optional, for HTTPS)
aws cloudfront create-distribution --distribution-config '{...}'
```

**Complete guides:**

- 📘 [DEPLOYMENT-STEPS.md](./DEPLOYMENT-STEPS.md) - Step-by-step AWS deployment guide
- 📕 [AWS-QUICKSTART.md](./AWS-QUICKSTART.md) - Quick 10-minute deployment
- 🤖 [deploy-aws.sh](./deploy-aws.sh) - Automated deployment script

**AWS Services Used:**

- Elastic Beanstalk (Node.js backend with auto-scaling)
- S3 (static website hosting)
- CloudFront (CDN with HTTPS/SSL)
- Pinecone (vector database - external service)

**Cost Estimate:**

- Elastic Beanstalk (t3.micro): $8-10/month (FREE tier eligible)
- S3 Storage + Requests: $0.10-0.50/month
- CloudFront: $0-1/month (1TB free tier)
- **Total:** ~$10/month (or **$0-5/month with AWS Free Tier**)

### Alternative Platforms

- **Vercel + Railway**: Frontend on Vercel, backend on Railway
- **Render**: Full-stack deployment on one platform
- **Netlify + Railway**: Similar to Vercel setup
- **DigitalOcean App Platform**: All-in-one deployment

---

## Usage

### Session Management

The application features a sophisticated session management system that preserves conversation history:

**Key Features:**

- **Per-Provider Sessions:** Each AI provider (RAG, OpenAI, Gemini) maintains its own session
- **Automatic Restoration:** Switch between providers without losing conversation history
- **localStorage Persistence:** Sessions survive page refreshes and browser restarts
- **Session Switching:** Access previous conversations via the History sidebar (📋 icon)
- **Export/Import:** Download sessions as JSON for backup or transfer

**How It Works:**

1. When you switch to a provider tab, the app checks for an existing session
2. If found, it restores the most recent session for that provider
3. If not found, it creates a new session
4. All messages are automatically saved to localStorage after each exchange

**Example:**

```
User Action                    → System Response
────────────────────────────────────────────────────────
Open OpenAI tab               → Loads/creates OpenAI session
Ask "What is 2+2?"            → Saves to OpenAI session
Switch to Gemini tab          → Loads/creates Gemini session
Ask "What is 3+3?"            → Saves to Gemini session
Switch back to OpenAI         → Restores OpenAI session (shows "What is 2+2?")
Refresh page                  → All sessions still available
```

### RAG Pipeline Usage

1. Click the "RAG with PDFs" tab
2. Upload a PDF (parsed with pdf-parse, chunked automatically)
3. Ask questions about the content
4. Answers include `[1]`, `[2]` citations linking to source chunks
5. View citation details by clicking on citation badges

**How it works:**

- PDF text → RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
- Chunks → OpenAI embeddings (768-dim vectors)
- Vectors stored in Pinecone with file metadata (namespace support)
- Query → similarity search (top-4 chunks) → dynamic filtering → LLM with context → cited answer

**Namespace Management:**

- Create separate namespaces for different document collections
- Switch between namespaces to query different document sets
- Delete namespaces and their vectors when no longer needed

---

## Project Structure

```
ai-chat-react/
├── src/
│   ├── components/         # UI components
│   │   ├── ChatInterface.tsx
│   │   ├── RAGChatComponent.tsx  # PDF upload + RAG query UI
│   │   └── ErrorBoundary.tsx     # Granular error handling
│   ├── contexts/          # React Context (ChatContext)
│   ├── services/          # API clients (OpenAI, Gemini, HF)
│   └── utils/            # Logging, storage helpers
└── server/
    ├── server.js         # Express API + proxy
    └── services/
        └── ragService.js  # LangChain RAG pipeline (functional style)
```

---

## Development Notes

### Code Style
- Functional components with hooks (no class components except ErrorBoundary—React requires it)
- Closure-based modules over classes for services (ragService.js, logger.ts)
- Strict TypeScript with explicit return types on public APIs

### Performance Considerations
- PDF chunking happens server-side to avoid blocking the UI thread
- Embeddings are created in batches (LangChain handles this internally)
- Vector search returns top-4 chunks as a balance between context completeness and token usage

### Known Limitations
- PDF parsing doesn't handle scanned documents (no OCR)
- No streaming responses yet (LangChain supports it, just not wired up)
- Single-user design (no auth or multi-tenancy)

---

## Troubleshooting

**"Vector dimension 0 does not match index 768"**
- This means embeddings failed. Check `OPENAI_API_KEY` is valid in `server/.env`

**PDF upload stuck at "Processing..."**
- Check server logs. Usually means pdf-parse v2 is installed (incompatible). Downgrade: `npm install pdf-parse@1.1.1`

**Backend connection errors**
- Verify backend is running: `curl http://localhost:3001/health`
- Check `VITE_API_BASE_URL` in frontend `.env.local` points to `http://localhost:3001/api`

---

## Security Notes

- API keys live in `server/.env` only (never committed to git)
- Backend proxy pattern prevents client-side key exposure
- `.gitignore` configured to block `.env` files and sensitive docs
- CORS restricted to allowed origins (configured in server/.env)

**⚠️ Never commit `.env` files.** Use `.env.example` for documentation.

---

## License

MIT License - free to use for personal or commercial projects.
