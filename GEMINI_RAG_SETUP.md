# RAG with Gemini Setup Guide

This app has been configured to use **Google Gemini** for RAG instead of OpenAI.

## Important: Pinecone Index Configuration

**CRITICAL:** Gemini embeddings use **768 dimensions**, different from OpenAI's 1536 dimensions.

### Create New Pinecone Index

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Click "Create Index"
3. Configure:
   - **Name:** `ai-chat-rag-gemini` (or your preferred name)
   - **Dimensions:** `768` ⚠️ **IMPORTANT: Must be 768 for Gemini**
   - **Metric:** `cosine`
   - **Region:** Choose closest to you
4. Click "Create Index"

### Update Environment Variables

Edit `server/.env`:

```env
# Gemini API Key (Required for RAG)
GEMINI_API_KEY=your_gemini_api_key_here

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=ai-chat-rag-gemini  # Your index name with 768 dimensions
```

## What Changed from OpenAI Version

### Embeddings
- **Before:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **Now:** OpenAI `text-embedding-3-small` (768 dimensions - configured)

### LLM for Answers
- **Before:** GPT-3.5-turbo
- **Now:** Gemini 1.5 Flash

**Note:** We use OpenAI for embeddings (stable, reliable) and Gemini for answer generation (free tier, cost-effective).

## Benefits of Using Gemini

✅ **Free Tier:** Generous free usage limits
✅ **Fast:** Quick response times
✅ **Quality:** High-quality embeddings and answers
✅ **Cost-Effective:** Lower costs compared to OpenAI

## Testing

After setting up:

1. Start the server:
   ```bash
   cd server
   npm run dev
   ```

2. You should see:
   ```
   ✅ RAG Service initialized successfully
   🔑 API Keys configured:
      Gemini: ✅
   ```

3. Upload a PDF and test the RAG functionality!

## Common Issues

### "Failed to initialize RAG Service"
- **Check:** Pinecone index has **768 dimensions** (not 1536)
- **Check:** Index name in `.env` matches your Pinecone index
- **Check:** Gemini API key is valid

### "API key error"
- Verify `GEMINI_API_KEY` in `server/.env`
- Get a new key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Wrong dimensions error
- You MUST create a new index with 768 dimensions
- Cannot reuse an index created for OpenAI (1536 dimensions)
- Delete old index or create a new one

## Migration from OpenAI

If you previously used OpenAI:

1. **Option A:** Create new index with 768 dimensions and re-upload all PDFs
2. **Option B:** Keep both indexes and switch based on use case

The RAG service automatically uses the correct embedding dimensions based on the model configured.

## Cost Comparison

**Gemini (Free Tier):**
- 60 requests per minute
- 1500 requests per day
- Free for most use cases

**Pinecone:**
- Free tier: 100K vectors (same as before)
- Can store ~1000-2000 pages of text

## Quick Reference

| Component | Model | Dimensions |
|-----------|-------|------------|
| Embeddings | Google embedding-001 | 768 |
| LLM | Gemini 1.5 Flash | N/A |
| Vector DB | Pinecone | 768 |

Enjoy your Gemini-powered RAG pipeline! 🚀
