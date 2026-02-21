const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings, ChatOpenAI } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const path = require('path');

class RAGService {
  constructor() {
    this.pinecone = null;
    this.index = null;
    this.embeddings = null;
    this.vectorStore = null;
    this.llm = null;
    this.indexName = process.env.PINECONE_INDEX_NAME || 'ai-chat-rag';
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔧 Initializing RAG Service...');

      // Initialize Pinecone client
      console.log('🔧 Step 1: Creating Pinecone client...');
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
      console.log('✅ Pinecone client created');

      // Verify index exists
      console.log('🔧 Step 2: Verifying index exists...');
      try {
        const indexList = await this.pinecone.listIndexes();
        console.log('✅ Index list retrieved:', indexList.indexes?.map(idx => idx.name) || []);

        const indexExists = indexList.indexes?.some(idx => idx.name === this.indexName);

        if (!indexExists) {
          const errorMsg = `Pinecone index "${this.indexName}" does not exist. Please create it at https://app.pinecone.io/ with:\n` +
            `  - Name: ${this.indexName}\n` +
            `  - Dimensions: 768 (for Gemini embeddings)\n` +
            `  - Metric: cosine`;
          console.error('❌', errorMsg);
          throw new Error(errorMsg);
        }
        console.log(`✅ Index "${this.indexName}" exists`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          throw error;
        }
        console.warn('⚠️  Could not verify index existence, proceeding anyway:', error.message);
      }

      // Get index
      console.log('🔧 Step 3: Getting index reference...');
      this.index = this.pinecone.Index(this.indexName);
      console.log('✅ Index reference obtained');

      // Initialize OpenAI embeddings (768 dimensions with text-embedding-3-small)
      console.log('🔧 Step 4: Initializing OpenAI embeddings...');
      this.embeddings = new OpenAIEmbeddings({
        apiKey: process.env.OPENAI_API_KEY,
        modelName: 'text-embedding-3-small',
        dimensions: 768, // Match Pinecone index dimensions
      });
      console.log('✅ OpenAI embeddings initialized (768 dimensions)');

      // Initialize OpenAI LLM for answer generation
      console.log('🔧 Step 5: Initializing OpenAI LLM...');
      this.llm = new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-3.5-turbo',
        temperature: 0.7,
      });
      console.log('✅ OpenAI LLM initialized');

      this.initialized = true;
      console.log('✅ RAG Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize RAG Service:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  async ingestPDF(filePath, metadata = {}) {
    await this.initialize();

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
      await PineconeStore.fromDocuments(enrichedDocs, this.embeddings, {
        pineconeIndex: this.index,
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

  async query(question, namespace = 'default', topK = 4) {
    await this.initialize();

    try {
      console.log(`🔍 Querying: "${question}"`);

      // Create vector store instance
      const vectorStore = await PineconeStore.fromExistingIndex(this.embeddings, {
        pineconeIndex: this.index,
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

      const response = await this.llm.invoke(prompt);
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

  async deleteNamespace(namespace) {
    await this.initialize();

    try {
      await this.index.namespace(namespace).deleteAll();
      console.log(`🗑️  Deleted namespace: ${namespace}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting namespace:', error.message);
      throw error;
    }
  }

  async listNamespaces() {
    await this.initialize();

    try {
      console.log('📊 Fetching index stats...');
      const stats = await this.index.describeIndexStats();
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
}

// Singleton instance
const ragService = new RAGService();

module.exports = ragService;
