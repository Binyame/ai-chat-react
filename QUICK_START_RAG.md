# Quick Start: RAG Pipeline (Gemini Version)

Get your RAG pipeline running in 5 minutes using Google Gemini!

## Step 1: Get API Keys (5 minutes)

### Gemini API Key
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

### Pinecone API Key
1. Go to https://www.pinecone.io/ and sign up (free tier)
2. After login, go to "API Keys" section
3. Copy your API key

## Step 2: Create Pinecone Index (2 minutes)

⚠️ **IMPORTANT:** Gemini uses 768 dimensions (not 1536 like OpenAI)

1. In Pinecone dashboard, click "Create Index"
2. Fill in:
   - **Name:** `ai-chat-rag-gemini`
   - **Dimensions:** `768` ⚠️ **Must be 768 for Gemini**
   - **Metric:** `cosine`
   - **Cloud:** Choose closest region
3. Click "Create Index"

## Step 3: Configure Environment (1 minute)

Edit `server/.env` and add:

```env
GEMINI_API_KEY=your-gemini-key-here
PINECONE_API_KEY=your-pinecone-key-here
PINECONE_INDEX_NAME=ai-chat-rag-gemini
```

## Step 4: Start the App (1 minute)

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

You should see:
```
✅ RAG Service initialized successfully
🚀 AI Chat Backend running on port 3001
🔑 API Keys configured:
   Gemini: ✅
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## Step 5: Test It! (2 minutes)

1. Open http://localhost:5173
2. Click **"RAG with PDFs"** tab
3. Click **"Upload PDF"** button
4. Select any PDF file
5. Wait for "Successfully uploaded..." message
6. Type a question: "What is this document about?"
7. Get your answer with citations! 🎉

## Troubleshooting

### "Gemini and Pinecone API keys are required"
- Check your `server/.env` file has both keys
- Restart the server after adding keys

### "Failed to initialize RAG Service"
- Verify Pinecone index exists
- Check index name matches your `.env` setting
- ⚠️ **CRITICAL:** Ensure dimensions are `768` (not 1536)
- If you have an old index with 1536 dimensions, create a new one

### Server won't start or "Failed to load pdf-parse"
```bash
cd server
npm install --legacy-peer-deps
# Ensure pdf-parse v1 is installed (v2 not supported yet)
npm install pdf-parse@1.1.1 --legacy-peer-deps
npm run dev
```

## What's Next?

- Upload more PDFs to build your knowledge base
- Try different questions to test retrieval
- Check [RAG_SETUP.md](RAG_SETUP.md) for advanced features
- Explore namespace management for organizing documents

## Cost Estimate

With free tiers:
- **Pinecone:** Free (up to 100K vectors)
- **Gemini:** Free (60 requests/min, 1500 requests/day)
- **Total:** Completely free for testing and light usage!

## Why Gemini?

✅ Generous free tier
✅ Fast response times
✅ High-quality embeddings
✅ No credit card required to start

Enjoy your Gemini-powered RAG chat! 🚀
