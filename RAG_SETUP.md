# RAG Pipeline Setup Guide

This guide will help you set up and use the RAG (Retrieval-Augmented Generation) pipeline with LangChain.js and Pinecone.

## What is RAG?

RAG combines document retrieval with AI language models to provide accurate answers with citations. The pipeline:

1. **Ingests PDFs** - Loads and processes PDF documents
2. **Creates Embeddings** - Converts text chunks into vector embeddings
3. **Stores in Vector DB** - Saves embeddings in Pinecone for fast retrieval
4. **Retrieves Relevant Chunks** - Finds the most relevant document sections for each question
5. **Generates Answers** - Uses OpenAI to create answers with citations

## Prerequisites

### 1. OpenAI API Key
Required for embeddings and answer generation.

- Sign up at [OpenAI Platform](https://platform.openai.com/signup)
- Create an API key at [API Keys](https://platform.openai.com/api-keys)
- Note: RAG uses `text-embedding-3-small` (cheap) and `gpt-3.5-turbo`

### 2. Pinecone API Key
Required for vector database storage.

- Sign up at [Pinecone](https://www.pinecone.io/)
- Free tier includes:
  - 1 project
  - 1 index
  - 100K vectors (~500-1000 pages of text)
- Create an API key from the [Pinecone Console](https://app.pinecone.io/)

### 3. Create Pinecone Index

**Important:** You must create an index before using RAG.

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Click "Create Index"
3. Configure:
   - **Name:** `ai-chat-rag` (or your custom name)
   - **Dimensions:** `1536` (for OpenAI text-embedding-3-small)
   - **Metric:** `cosine`
   - **Region:** Choose closest to you
4. Click "Create Index"

## Installation

The backend dependencies are already installed. If you need to reinstall:

```bash
cd server
npm install --legacy-peer-deps langchain @langchain/core @langchain/openai @langchain/pinecone @langchain/community @langchain/textsplitters @pinecone-database/pinecone pdf-parse multer
```

**Note:** The `--legacy-peer-deps` flag is required due to dependency version conflicts in LangChain packages.

## Configuration

### 1. Update Server Environment Variables

Edit `server/.env`:

```bash
# Required for RAG
OPENAI_API_KEY=sk-...your-key-here
PINECONE_API_KEY=...your-pinecone-key-here
PINECONE_INDEX_NAME=ai-chat-rag

# Optional: Keep uploaded PDFs (default: delete after processing)
DELETE_UPLOADED_PDFS=true
```

### 2. Verify Configuration

Start the backend server:

```bash
cd server
npm run dev
```

Look for these startup messages:
```
🚀 AI Chat Backend running on port 3001
🔑 API Keys configured:
   OpenAI: ✅
   Pinecone: ✅
```

## Using the RAG Pipeline

### 1. Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 2. Access RAG Chat

1. Open [http://localhost:5173](http://localhost:5173)
2. Click the **"RAG with PDFs"** tab
3. You should see the RAG chat interface

### 3. Upload PDF Documents

1. Click **"Upload PDF"** button
2. Select a PDF file (max 10MB)
3. Wait for processing (creates embeddings and stores in Pinecone)
4. You'll see: "Successfully uploaded [filename] (X chunks from Y pages)"

### 4. Ask Questions

Type questions about your uploaded documents:

**Example:**
- Upload: Research paper on climate change
- Ask: "What are the main findings about global temperature?"
- Get: Answer with citations like [1], [2] pointing to specific pages

### 5. Manage Collections (Namespaces)

- **Default Collection:** All PDFs go to "default" namespace
- **View Collections:** Click "Manage Collections" button
- **Delete Collection:** Remove all documents from a namespace
- **Switch Collections:** Use dropdown to query different document sets

## How It Works

### PDF Ingestion Process

```
1. Upload PDF → server/uploads/
2. PDFLoader extracts text from each page
3. RecursiveCharacterTextSplitter:
   - Chunk size: 1000 characters
   - Overlap: 200 characters (for context continuity)
4. OpenAIEmbeddings creates vector for each chunk
5. Store in Pinecone with metadata:
   - fileName
   - page number
   - chunkIndex
   - uploadedAt
6. Delete PDF file (optional)
```

### Query Process

```
1. User asks question
2. Embed question using OpenAI
3. Pinecone similarity search (top 4 chunks)
4. Build context from retrieved chunks
5. Send to GPT-3.5-turbo with prompt:
   - Context from documents
   - User question
   - Instruction to cite sources
6. Return answer + citations with metadata
```

## API Endpoints

### POST /api/rag/upload
Upload and ingest a PDF file.

**Request:**
```bash
curl -X POST http://localhost:3001/api/rag/upload \
  -F "pdf=@document.pdf" \
  -F "namespace=default"
```

**Response:**
```json
{
  "success": true,
  "fileName": "document.pdf",
  "chunks": 45,
  "pages": 10
}
```

### POST /api/rag/query
Query documents with a question.

**Request:**
```bash
curl -X POST http://localhost:3001/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the main conclusion?",
    "namespace": "default",
    "topK": 4
  }'
```

**Response:**
```json
{
  "success": true,
  "answer": "The main conclusion is... [1][2]",
  "citations": [
    {
      "id": 1,
      "fileName": "document.pdf",
      "page": 5,
      "text": "...excerpt from page 5..."
    }
  ],
  "sources": 4
}
```

### GET /api/rag/namespaces
List all document collections.

**Response:**
```json
{
  "success": true,
  "namespaces": [
    {
      "name": "default",
      "vectorCount": 150
    }
  ]
}
```

### DELETE /api/rag/namespace/:namespace
Delete all documents in a collection.

## Cost Estimation

Based on OpenAI and Pinecone pricing (as of 2024):

### OpenAI Costs
- **Embeddings (text-embedding-3-small):** $0.02 per 1M tokens
  - ~100 pages ≈ 50K tokens ≈ $0.001
- **GPT-3.5-turbo:** $0.50 per 1M input tokens
  - Average query ≈ 2K tokens ≈ $0.001

### Pinecone Costs
- **Free Tier:** 100K vectors (good for ~500-1000 pages)
- **Paid:** $70/month for 1M vectors

**Example:** 1000 pages + 1000 queries ≈ $3-5/month

## Troubleshooting

### Error: "No relevant documents found"
**Solution:** Upload some PDF documents first.

### Error: "OpenAI and Pinecone API keys are required"
**Solution:** Check your `server/.env` file has both keys set.

### Error: "Failed to initialize RAG Service"
**Solution:**
1. Verify Pinecone index exists
2. Check index name matches `PINECONE_INDEX_NAME`
3. Ensure dimensions are 1536

### Error: "File too large"
**Solution:** PDFs are limited to 10MB. Split or compress large files.

### Poor Answer Quality
**Solutions:**
- Upload more relevant documents
- Try different questions (be specific)
- Increase `topK` parameter (retrieve more chunks)
- Check if documents are text-based (not scanned images)

### Slow Uploads
**Causes:**
- Large PDFs (many pages)
- Complex PDF formatting
- Network latency to Pinecone

**Optimization:**
- Process PDFs in batches
- Use smaller chunk sizes
- Upgrade Pinecone plan for better performance

## Advanced Configuration

### Custom Chunk Size

Edit `server/services/ragService.js`:

```javascript
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,      // Smaller chunks = more precise citations
  chunkOverlap: 100,   // Less overlap = more unique chunks
});
```

### Different LLM Model

Edit `server/services/ragService.js`:

```javascript
this.llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4',  // Better quality, higher cost
  temperature: 0.3,    // Lower = more factual
});
```

### Custom Namespaces

Organize documents by topic:

```javascript
// Frontend: Upload to custom namespace
formData.append('namespace', 'research-papers');

// Query specific namespace
{
  question: "...",
  namespace: "research-papers"
}
```

## Security Best Practices

1. **Never commit API keys** - Use `.env` files
2. **Validate file types** - Only allow PDFs (implemented)
3. **Limit file size** - 10MB max (implemented)
4. **Rate limiting** - Prevent abuse (implemented)
5. **Delete uploaded files** - Remove after processing (configurable)
6. **Use namespaces** - Isolate documents by user/project

## Next Steps

1. **Multi-user support:** Add authentication and user-specific namespaces
2. **More file types:** Add DOCX, TXT support
3. **Streaming responses:** Stream answers for better UX
4. **Better citations:** Include exact page numbers and highlighting
5. **Conversation memory:** Remember context across questions
6. **Semantic caching:** Cache common queries

## Support

For issues or questions:
- Check server logs: `server/` terminal output
- Test API directly: Use curl commands above
- Verify Pinecone index: Check [Pinecone Console](https://app.pinecone.io/)
- Check OpenAI usage: [OpenAI Usage Dashboard](https://platform.openai.com/usage)
