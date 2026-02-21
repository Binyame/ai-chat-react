# Quick Start: RAG Pipeline

Get your RAG pipeline running in 5 minutes!

## Step 1: Get API Keys (5 minutes)

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)

### Pinecone API Key
1. Go to https://www.pinecone.io/ and sign up (free tier)
2. After login, go to "API Keys" section
3. Copy your API key

## Step 2: Create Pinecone Index (2 minutes)

1. In Pinecone dashboard, click "Create Index"
2. Fill in:
   - **Name:** `ai-chat-rag`
   - **Dimensions:** `1536`
   - **Metric:** `cosine`
   - **Cloud:** Choose closest region
3. Click "Create Index"

## Step 3: Configure Environment (1 minute)

Edit `server/.env` and add:

```env
OPENAI_API_KEY=sk-your-openai-key-here
PINECONE_API_KEY=your-pinecone-key-here
PINECONE_INDEX_NAME=ai-chat-rag
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
   OpenAI: ✅
   Pinecone: ✅
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

### "OpenAI and Pinecone API keys are required"
- Check your `server/.env` file has both keys
- Restart the server after adding keys

### "Failed to initialize RAG Service"
- Verify Pinecone index exists
- Check index name is exactly `ai-chat-rag`
- Ensure dimensions are `1536`

### Server won't start
```bash
cd server
npm install --legacy-peer-deps
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
- **OpenAI:** ~$0.01 per 100 pages uploaded
- **Total:** Essentially free for testing!

Enjoy your RAG-powered AI chat! 🚀
