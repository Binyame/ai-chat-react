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
      modelName: 'gpt-3.5-turbo',
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

    // Store in Pinecone
    await PineconeStore.fromDocuments(enrichedDocs, embeddings, {
      pineconeIndex: index,
      namespace: metadata.namespace || 'default',
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

async function query(question, namespace = 'default', topK = 4) {
  await initialize();

  try {
    console.log(`🔍 Querying: "${question}"`);

    // Create vector store instance
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      namespace,
    });

    // Retrieve relevant documents
    const relevantDocs = await vectorStore.similaritySearch(question, topK);

    if (relevantDocs.length === 0) {
      return {
        success: false,
        error: 'No relevant documents found. Please upload some PDFs first.',
      };
    }

    console.log(`📚 Found ${relevantDocs.length} relevant chunks`);

    // Build context from retrieved documents
    const context = relevantDocs
      .map((doc, i) => `[${i + 1}] ${doc.pageContent}`)
      .join('\n\n');

    // Create citations
    const citations = relevantDocs.map((doc, i) => ({
      id: i + 1,
      fileName: doc.metadata.fileName || 'Unknown',
      page: doc.metadata.loc?.pageNumber || doc.metadata.page || 'N/A',
      text: doc.pageContent.substring(0, 150) + '...',
    }));

    // Generate answer with LLM
    const prompt = `You are a helpful assistant that answers questions based on the provided context.
Always cite your sources using the reference numbers [1], [2], etc. when using information from the context.

Context:
${context}

Question: ${question}

Answer the question based on the context above. Include citations to the relevant sources using [1], [2], etc.
If the context doesn't contain enough information to fully answer the question, say so.`;

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
