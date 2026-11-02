const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings, ChatOpenAI } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const path = require('path');

// Service state (closure-based)
let pinecone = null;
let index = null;
let embeddings = null;
let llm = null;
let isInitialized = false;

const indexName = process.env.PINECONE_INDEX_NAME || 'ai-chat-rag';

async function initialize() {
  if (isInitialized) {
    console.log('✅ RAG Service already initialized');
    return;
  }

  try {
    console.log('🔧 Initializing RAG Service...');

    // Initialize Pinecone client
    console.log('🔧 Step 1: Creating Pinecone client...');
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    console.log('✅ Pinecone client created');

    // Verify index exists
    console.log('🔧 Step 2: Verifying index exists...');
    try {
      const indexList = await pinecone.listIndexes();
      console.log('✅ Index list retrieved:', indexList.indexes?.map(idx => idx.name) || []);

      const indexExists = indexList.indexes?.some(idx => idx.name === indexName);

      if (!indexExists) {
        const errorMsg = `Pinecone index "${indexName}" does not exist. Please create it at https://app.pinecone.io/ with:\n` +
          `  - Name: ${indexName}\n` +
          `  - Dimensions: 768\n` +
          `  - Metric: cosine`;
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }
      console.log(`✅ Index "${indexName}" exists`);
    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw error;
      }
      console.warn('⚠️  Could not verify index existence, proceeding anyway:', error.message);
    }

    // Get index
    console.log('🔧 Step 3: Getting index reference...');
    index = pinecone.Index(indexName);
    console.log('✅ Index reference obtained');

    // Initialize OpenAI embeddings (768 dimensions)
    console.log('🔧 Step 4: Initializing OpenAI embeddings...');
    embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      dimensions: 768,
    });
    console.log('✅ OpenAI embeddings initialized (768 dimensions)');

    // Initialize OpenAI LLM for answer generation
    console.log('🔧 Step 5: Initializing OpenAI LLM...');
    llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
    });
    console.log('✅ OpenAI LLM initialized');

    isInitialized = true;
    console.log('✅ RAG Service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize RAG Service:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}

async function ingestPDF(filePath, metadata = {}) {
  await initialize();

  try {
    console.log(`📄 Loading PDF: ${filePath}`);

    // Load PDF
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();

    console.log(`📑 Loaded ${docs.length} pages from PDF`);

    // Split documents into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`✂️  Split into ${splitDocs.length} chunks`);

    // Add metadata to each chunk
    const fileName = path.basename(filePath);
    const enrichedDocs = splitDocs.map((doc, index) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        ...metadata,
        fileName,
        chunkIndex: index,
        source: filePath,
      },
    }));

    // Delete any existing vectors for this file to avoid duplicates on re-upload
    const ns = metadata.namespace || 'default';
    const originalName = metadata.originalName || fileName;
    try {
      await index.namespace(ns).deleteMany({ filter: { originalName: { $eq: originalName } } });
      console.log(`🗑️  Cleared existing vectors for "${originalName}" in namespace "${ns}"`);
    } catch {
      console.log(`ℹ️  No prior vectors found for "${originalName}" (or filter-delete not supported)`);
    }

    // Store in Pinecone
    await PineconeStore.fromDocuments(enrichedDocs, embeddings, {
      pineconeIndex: index,
      namespace: ns,
    });

    console.log(`✅ Successfully ingested PDF: ${fileName}`);

    return {
      success: true,
      fileName,
      chunks: splitDocs.length,
      pages: docs.length,
    };
  } catch (error) {
    console.error('❌ Error ingesting PDF:', error.message);
    throw error;
  }
}

async function query(question, namespace = 'default', topK = 4, chatHistory = []) {
  await initialize();

  try {
    console.log(`🔍 Querying: "${question}"`);

    // Create vector store instance
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      namespace,
    });

    // Retrieve relevant documents with similarity scores
    // Limit to topK (default 4) to avoid context stuffing and excessive token usage
    // More chunks != better answers; quality matters more than quantity
    const relevantDocs = await vectorStore.similaritySearchWithScore(question, topK);

    if (relevantDocs.length === 0) {
      return {
        success: true,
        answer: 'No documents have been uploaded yet. Please upload a PDF to get started.',
        citations: [],
        sources: 0,
      };
    }

    // Log all scores for debugging
    console.log(`📊 Similarity scores:`, relevantDocs.map(([_, score]) => score.toFixed(3)).join(', '));

    // Dynamic threshold: keep chunks within 70% of top score
    // This adapts to different embedding models/corpora without hardcoded values
    // Always keep at least top 2 chunks if top score is reasonably strong (>0.3)
    const topScore = relevantDocs[0][1];
    const MIN_TOP_SCORE = 0.3; // Absolute minimum for top result
    const RELATIVE_THRESHOLD = 0.7; // Keep chunks within 70% of top score

    let relevantResults;
    if (topScore < MIN_TOP_SCORE) {
      // Top result is weak - likely no relevant documents
      console.log(`⚠️  Top score ${topScore.toFixed(3)} below minimum threshold ${MIN_TOP_SCORE}`);
      return {
        success: true,
        answer: 'I could not find relevant information about this topic in the uploaded documents. The question may be outside the scope of the available content.',
        citations: [],
        sources: 0,
      };
    } else {
      // Filter by dynamic threshold, but always keep at least top 2
      const dynamicThreshold = topScore * RELATIVE_THRESHOLD;
      relevantResults = relevantDocs.filter(([_, score]) => score >= dynamicThreshold);

      // Ensure we keep at least 2 chunks if available
      if (relevantResults.length < 2 && relevantDocs.length >= 2) {
        relevantResults = relevantDocs.slice(0, 2);
      }

      // Cap at maximum to prevent context stuffing (rare with topK=4, but safeguard for larger topK)
      const MAX_CHUNKS = 6;
      if (relevantResults.length > MAX_CHUNKS) {
        console.log(`⚠️  Capping chunks from ${relevantResults.length} to ${MAX_CHUNKS} to prevent context stuffing`);
        relevantResults = relevantResults.slice(0, MAX_CHUNKS);
      }

      console.log(`📚 Retrieved ${relevantResults.length}/${relevantDocs.length} chunks (threshold: ${dynamicThreshold.toFixed(3)}, top: ${topScore.toFixed(3)})`)
    }

    // Build context from relevant documents
    const context = relevantResults
      .map(([doc, score], i) => `[${i + 1}] (relevance: ${score.toFixed(2)}) ${doc.pageContent}`)
      .join('\n\n');

    // Create citations
    const citations = relevantResults.map(([doc, score], i) => ({
      id: i + 1,
      fileName: doc.metadata.fileName || 'Unknown',
      page: doc.metadata.loc?.pageNumber || doc.metadata.page || 'N/A',
      text: doc.pageContent.substring(0, 150) + '...',
      relevance: score.toFixed(2),
    }));

    // Build conversation history section (last 4 exchanges max)
    const recentHistory = chatHistory.slice(-8);
    const historySection = recentHistory.length > 0
      ? `\nConversation so far:\n${recentHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}\n`
      : '';

    // Generate answer with strict grounding instructions
    const prompt = `You are a document Q&A assistant. Your job is to answer questions ONLY using information from the provided context.

CRITICAL RULES:
1. If the context does not contain information to answer the question, respond with: "This information is not found in the uploaded documents."
2. NEVER make up or infer information that is not explicitly stated in the context.
3. ALWAYS cite your sources using [1], [2], etc. for every claim you make.
4. If only partial information is available, state what you found and what is missing.
5. Use the conversation history below to understand follow-up questions and resolve pronouns (e.g. "it", "that", "the previous answer").
${historySection}
Context from documents:
${context}

Current question: ${question}

Answer based ONLY on the context above. If the answer is not in the context, say "This information is not found in the uploaded documents."`;

    const response = await llm.invoke(prompt);
    const answer = response.content;

    console.log('✅ Generated answer with citations');

    return {
      success: true,
      answer,
      citations,
      sources: relevantDocs.length,
    };
  } catch (error) {
    console.error('❌ Error querying RAG:', error.message);
    throw error;
  }
}

async function deleteNamespace(namespace) {
  await initialize();

  try {
    await index.namespace(namespace).deleteAll();
    console.log(`🗑️  Deleted namespace: ${namespace}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting namespace:', error.message);
    throw error;
  }
}

async function listNamespaces() {
  await initialize();

  try {
    console.log('📊 Fetching index stats...');
    const stats = await index.describeIndexStats();
    console.log('📊 Stats received:', JSON.stringify(stats, null, 2));

    const namespaces = Object.keys(stats.namespaces || {});

    return {
      success: true,
      namespaces: namespaces.map(ns => ({
        name: ns,
        vectorCount: stats.namespaces[ns]?.recordCount || stats.namespaces[ns]?.vectorCount || 0,
      })),
    };
  } catch (error) {
    console.error('❌ Error listing namespaces:', error);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}

module.exports = {
  initialize,
  ingestPDF,
  query,
  deleteNamespace,
  listNamespaces,
};
