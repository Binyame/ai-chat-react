# RAG Pipeline Testing Guide

Quick reference for testing the RAG endpoints.

## Prerequisites

1. Create Pinecone index with:
   - Name: `ai-chat-rag`
   - Dimensions: `1536`
   - Metric: `cosine`

2. Set environment variables in `server/.env`:
   ```env
   OPENAI_API_KEY=sk-...
   PINECONE_API_KEY=...
   PINECONE_INDEX_NAME=ai-chat-rag
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

## Test Endpoints

### 1. Health Check

```bash
curl http://localhost:3001/health
```

Expected:
```json
{"status":"OK","timestamp":"2024-..."}
```

### 2. Upload PDF

```bash
curl -X POST http://localhost:3001/api/rag/upload \
  -F "pdf=@/path/to/your/document.pdf" \
  -F "namespace=default"
```

Expected:
```json
{
  "success": true,
  "fileName": "document.pdf",
  "chunks": 45,
  "pages": 10,
  "message": "Successfully ingested document.pdf"
}
```

### 3. Query RAG

```bash
curl -X POST http://localhost:3001/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the main topic of the document?",
    "namespace": "default",
    "topK": 4
  }'
```

Expected:
```json
{
  "success": true,
  "answer": "The main topic is... [1][2]",
  "citations": [
    {
      "id": 1,
      "fileName": "document.pdf",
      "page": 5,
      "text": "...relevant excerpt..."
    }
  ],
  "sources": 4
}
```

### 4. List Namespaces

```bash
curl http://localhost:3001/api/rag/namespaces
```

Expected:
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

### 5. Delete Namespace

```bash
curl -X DELETE http://localhost:3001/api/rag/namespace/default
```

Expected:
```json
{
  "success": true,
  "message": "Namespace 'default' deleted successfully"
}
```

## Error Scenarios

### Missing API Keys

Request:
```bash
# With OPENAI_API_KEY or PINECONE_API_KEY not set
curl -X POST http://localhost:3001/api/rag/upload -F "pdf=@test.pdf"
```

Response:
```json
{
  "success": false,
  "error": "OpenAI and Pinecone API keys are required for RAG functionality"
}
```

### No Documents Uploaded

Request:
```bash
curl -X POST http://localhost:3001/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "test"}'
```

Response:
```json
{
  "success": false,
  "error": "No relevant documents found. Please upload some PDFs first."
}
```

### Invalid File Type

Request:
```bash
curl -X POST http://localhost:3001/api/rag/upload -F "pdf=@image.jpg"
```

Response:
```json
{
  "success": false,
  "error": "Only PDF files are allowed"
}
```

## Monitoring

### Server Logs

Watch for these messages:

**PDF Upload:**
```
📄 Loading PDF: /path/to/file.pdf
📑 Loaded 10 pages from PDF
✂️  Split into 45 chunks
✅ Successfully ingested PDF: document.pdf
```

**Query:**
```
🔍 Querying: "What is the main topic?"
📚 Found 4 relevant chunks
✅ Generated answer with citations
```

### Pinecone Console

1. Go to https://app.pinecone.io/
2. Select your index (`ai-chat-rag`)
3. Check "Vector Count" increases after uploads
4. View "Queries per second" during testing

## Common Issues

### "Failed to initialize RAG Service"
- Check Pinecone index exists
- Verify index name matches `PINECONE_INDEX_NAME`
- Ensure dimensions are `1536`

### "Cannot find module 'langchain'"
```bash
cd server
npm install
```

### Slow Uploads
- Large PDFs take time to process
- Check server logs for progress
- First upload may be slower (model loading)

## Sample Test Document

Create a simple test PDF or use:

```bash
# Download a sample PDF
curl -o test.pdf https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
```

Then upload:
```bash
curl -X POST http://localhost:3001/api/rag/upload \
  -F "pdf=@test.pdf" \
  -F "namespace=test"
```

## Performance Benchmarks

Typical performance on modern hardware:

- **PDF Upload (10 pages):** 5-15 seconds
- **Query (with 4 chunks):** 2-5 seconds
- **Embedding generation:** ~1 second per 1000 tokens
- **LLM response:** ~2-3 seconds

## Clean Up

To reset everything:

```bash
# Delete all namespaces
curl -X DELETE http://localhost:3001/api/rag/namespace/default

# Or reset Pinecone index from console
# https://app.pinecone.io/ → Select index → Delete All Vectors
```
