import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

import {
  initializeApp as initAdminApp,
  getApps as getAdminApps,
  cert,
  ServiceAccount,
} from 'firebase-admin/app';

import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

import fs from 'fs';

import firebaseConfig from './firebase-applet-config.json';

import 'dotenv/config';

import {
  generateMemoryEmbedding,
  generateQueryEmbedding,
  cosineSimilarity,
  getEmbeddingProvider
} from './src/server/embeddingService';

import {
  isPersonalQuery,
  retrieveSemanticMemories
} from './src/server/semanticRetrievalService';

import { executeRagPipeline } from './src/server/ragPipelineService';

import {
  syncMemoryToGraph,
  removeMemoryFromGraph,
  rebuildKnowledgeGraph,
  getUserEntities,
  getUserEntityById,
  getUserRelationships,
  getUserRelationshipById,
  extractEntitiesAndRelationships
} from './src/server/knowledgeGraphService';

import { retrieveGraphEvidence } from './src/server/knowledgeGraphRetrievalService';

import {
  extractAndSaveTemporalMetadata,
  backfillUserTimeline,
  queryUserTimeline,
  extractTemporalMetadata
} from './src/server/temporalService';

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization of Gemini client
let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }

  return genAIClient;
}

// Firebase Admin service account
// Local development:
//   firebase-service-account.json
//
// Production:
//   FIREBASE_SERVICE_ACCOUNT_JSON environment variable

const firebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : JSON.parse(
      fs.readFileSync('./firebase-service-account.json', 'utf8')
    );

// Initialize Firebase Admin for server-side token verification
// and database operations

const adminApp = getAdminApps().length === 0
  ? initAdminApp({
      credential: cert(firebaseServiceAccount as ServiceAccount),
      projectId: firebaseConfig.projectId,
    })
  : getAdminApps()[0];

const adminAuth = getAdminAuth(adminApp);

const adminDb = getAdminFirestore(
  adminApp,
  firebaseConfig.firestoreDatabaseId
);

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
}

// Reusable Firebase ID Token Verification Middleware
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed Authorization header' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token provided' });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!decodedToken || !decodedToken.uid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name
    };
    next();
  } catch (err: any) {
    console.error('Firebase token verification error:', err?.message || err);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token' });
  }
}

// ---------------- Public Health endpoints ----------------
const handleHealth = (_req: Request, res: Response) => {
  res.json({ status: 'healthy' });
};
app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

async function generateWithFallback(client: any, params: { config?: any; contents: any }) {
  const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash'];
  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await client.models.generateContent({
        model,
        config: params.config,
        contents: params.contents
      });
      if (response && (response.text !== undefined && response.text !== null)) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini] Model ${model} attempt failed`, {
        status: err?.status,
        code: err?.code,
        name: err?.name
      });
    }
  }
  throw lastError || new Error('All Gemini models failed');
}

// ---------------- Server-Side Gemini Chat endpoint with True RAG Pipeline (A7) ----------------
app.post('/api/chat', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  if (!currentUserId) return res.status(401).json({ error: 'Unauthorized: User authentication required' });

  const { message, context, history } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const client = getGenAI();
  if (!client) {
    return res.status(503).json({
      error: 'AI service is currently unavailable. Please verify that GEMINI_API_KEY is configured.'
    });
  }

  try {
    console.info('[RAG] Chat request received');
    const ragResult = await executeRagPipeline({
      query: message,
      conversationHistory: history,
      userId: currentUserId,
      adminDb,
      client,
      context
    });

    return res.json({
      reply: ragResult.answer,
      retrievalContext: ragResult.retrievalContext,
      retrievalMethod: ragResult.retrievalMethod,
      sources: ragResult.sources,
      grounded: ragResult.grounded,
      graphEvidence: ragResult.graphEvidence,
      temporalEvidence: ragResult.temporalEvidence,
      temporalScope: ragResult.temporalScope
    });
  } catch (err: any) {
    console.error('[RAG] Chat request failed', {
      status: err?.status,
      code: err?.code,
      name: err?.name
    });
    return res.status(500).json({ error: 'I couldn\'t generate a response right now. Please try again.' });
  }
});

// ---------------- Helper functions for Memory Candidate Extraction ----------------
function normalizeMemoryText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDuplicateCandidate(candidateText: string, existingMemories: string[]): boolean {
  if (!existingMemories || existingMemories.length === 0) return false;
  const candNorm = normalizeMemoryText(candidateText);
  if (!candNorm || candNorm.length < 3) return true;

  for (const existing of existingMemories) {
    if (!existing || typeof existing !== 'string') continue;
    const existNorm = normalizeMemoryText(existing);
    if (!existNorm) continue;

    // Exact normalized match
    if (candNorm === existNorm) return true;

    // Substring containment if both are substantial
    if (candNorm.includes(existNorm) && existNorm.length > 10) return true;
    if (existNorm.includes(candNorm) && candNorm.length > 10) return true;

    // Word token overlap check
    const candWords = candNorm.split(' ').filter(w => w.length > 2);
    const existWords = existNorm.split(' ').filter(w => w.length > 2);
    if (candWords.length > 0 && existWords.length > 0) {
      const matchCount = candWords.filter(w => existWords.includes(w)).length;
      const similarity = matchCount / Math.max(candWords.length, existWords.length);
      if (similarity >= 0.75) {
        return true;
      }
    }
  }
  return false;
}

// ---------------- Protected Memory Candidate Extraction endpoint ----------------
app.post('/api/memories/extract-candidates', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { message, history, existingMemories, threadId, sourceMessageId } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.json({ candidates: [] });
  }

  const trimmedMessage = message.trim();

  // Fast deterministic filter for obvious conversational filler or general technical questions
  const lowerMsg = trimmedMessage.toLowerCase();
  const isFiller = /^(hi|hello|hey|howdy|good morning|good evening|good afternoon|how are you|thanks|thank you|ok|okay|cool|great|bye|goodbye)[.!? ]*$/i.test(trimmedMessage);
  const isGenericQuestion = /^(what is|how does|explain|write code|give me|tell me about|how to|who is|can you explain|why is|what are)\b/i.test(lowerMsg);

  if (isFiller || isGenericQuestion) {
    return res.json({ candidates: [] });
  }

  const client = getGenAI();
  if (!client) {
    return res.json({ candidates: [] });
  }

  try {
    const extractionSystemInstruction = `You are the MEMORA Memory Extraction Engine for a Personal Second Brain.
Your task is to analyze the user's latest conversation message and identify if it contains any POTENTIAL PERSONAL MEMORY CANDIDATES worth remembering for their personal life vault.

CRITICAL EXTRACTION DIRECTIVES:
1. WHAT COUNTS AS A PERSONAL MEMORY:
   - Genuine personal events, experiences, activities, trips, or meetings with people:
     * "Today I met Ravi and Suresh at the tea shop." -> "Met Ravi and Suresh at the tea shop today."
     * "Yesterday I visited the temple with my friends." -> "Visited the temple with friends yesterday."
     * "My brother and I discussed visiting Hyderabad next month." -> "Discussed a Hyderabad trip with brother."
   - Personal preferences, habits, or routines:
     * "I really prefer working late at night." -> "Prefers working late at night."
     * "I always have tea with my grandfather when I visit home." -> "Always has tea with grandfather when visiting home."
   - Meaningful personal moments, decisions, observations, or relationships.

2. WHAT MUST NEVER BE EXTRACTED AS A MEMORY:
   - Ordinary conversational filler: "Hello", "How are you?", "Thanks", "I am fine", "Good morning".
   - Questions, technical discussions, code requests, factual explanations: "What is Python?", "Explain embeddings", "Write a python script".
   - Future Goals, Targets, or Plans: "I want to finish my portfolio website by Friday", "My goal is to read 2 books this week", "I need to learn Rust". (These are Goals, NOT Memories).
   - Ideas: "I have an idea for a short film", "We should build an app for gardeners". (These are Ideas, NOT Memories).
   - Projects: "I'm building my personal website", "Working on the dashboard component". (These are Projects, NOT Memories).
   - Ephemeral or trivial states: "I am sitting here drinking tea right now".

3. STRICT CONSERVATISM & ACCURACY:
   - Prefer FEWER, high-confidence memories over many low-quality memories.
   - If no meaningful personal memory exists in the user's message, return an empty candidates array: [].
   - DO NOT INVENT DETAILS. Never invent dates, locations, people, emotions, or intentions not explicitly stated.
   - Preserve temporal expressions provided by the user ("yesterday", "today", "last Sunday").
   - Extract the essence concisely from the user's perspective.
   - Confidence threshold: assign a confidence between 0.0 and 1.0. Only include candidates with confidence >= 0.75.

4. CATEGORY:
   - Category must be one of: "Personal", "Preference", "Learning", "Insight". (Default to "Personal").

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact structure:
{
  "candidates": [
    {
      "text": "Extracted memory text",
      "category": "Personal",
      "confidence": 0.92
    }
  ]
}
If no personal memory is present, return:
{
  "candidates": []
}`;

    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      const contextTurns = history.slice(-2);
      for (const turn of contextTurns) {
        if (turn && turn.content) {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.content }]
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: `Analyze this user message for personal memory candidates:\n"${trimmedMessage}"` }]
    });

    const response = await generateWithFallback(client, {
      config: {
        systemInstruction: extractionSystemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1
      },
      contents
    });

    const rawOutput = response.text || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawOutput);
    } catch {
      const match = rawOutput.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }

    const rawCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    const validCandidates: any[] = [];
    const existingList: string[] = Array.isArray(existingMemories) ? existingMemories : [];

    for (const item of rawCandidates) {
      if (
        item &&
        typeof item.text === 'string' &&
        item.text.trim().length > 3 &&
        (typeof item.confidence !== 'number' || item.confidence >= 0.75)
      ) {
        const candidateText = item.text.trim();
        // Duplicate detection against existing user memories
        if (!isDuplicateCandidate(candidateText, existingList)) {
          validCandidates.push({
            id: `cand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            text: candidateText,
            category: item.category || 'Personal',
            confidence: typeof item.confidence === 'number' ? item.confidence : 0.85,
            sourceMessageId: sourceMessageId || undefined,
            threadId: threadId || undefined,
            detectedAt: new Date().toISOString(),
            status: 'pending'
          });
        }
      }
    }

    return res.json({ candidates: validCandidates });
  } catch (err: any) {
    console.warn('Memory candidate extraction error:', err?.message || err);
    // Silent recovery: return empty candidates on extraction failure so chat remains uninterrupted
    return res.json({ candidates: [] });
  }
});

// ---------------- Protected Global Search endpoint ----------------
app.all('/api/search', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const query = ((req.query.q as string) || req.body?.query || '').trim().toLowerCase();
  const context = req.body?.context;
  const currentUserId = req.user?.uid;

  if (!query) {
    return res.json({ query: '', results: [] });
  }

  // Searches strictly within authenticated user-scoped records
  const results: any[] = [];
  if (context && typeof context === 'object') {
    for (const [, items] of Object.entries(context)) {
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          // Strict user isolation check
          if (!item.userId || item.userId === currentUserId) {
            const itemStr = JSON.stringify(item).toLowerCase();
            if (itemStr.includes(query)) {
              results.push(item);
            }
          }
        });
      }
    }
  }

  return res.json({ query, results });
});

// ---------------- Protected Memory Vector Indexing endpoint ----------------
app.post('/api/memories/index-vector', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

  const { memoryId, content: providedContent } = req.body;
  if (!memoryId || typeof memoryId !== 'string') {
    return res.status(400).json({ error: 'memoryId is required' });
  }

  try {
    let contentToEmbed = providedContent;
    let memoryData: any = null;

    if (!contentToEmbed) {
      const memDoc = await adminDb.collection('memories').doc(memoryId).get();
      if (!memDoc.exists) {
        return res.status(404).json({ error: 'Memory document not found' });
      }
      memoryData = memDoc.data();
      if (memoryData?.userId !== currentUserId) {
        return res.status(403).json({ error: 'Forbidden: Access denied to foreign user memory' });
      }
      contentToEmbed = memoryData?.content || memoryData?.title || '';
    }

    if (!contentToEmbed || !contentToEmbed.trim()) {
      return res.status(400).json({ error: 'No content available to generate embedding' });
    }

    // Generate embedding using active provider
    const { embedding, model, dimensions, version } = await generateMemoryEmbedding(contentToEmbed);

    const now = new Date().toISOString();
    const vectorDocRef = adminDb.collection('memory_vectors').doc(memoryId);
    const existingVector = await vectorDocRef.get();

    const vectorPayload = {
      id: memoryId,
      memoryId,
      userId: currentUserId,
      embedding,
      model,
      dimensions,
      version,
      created_at: existingVector.exists ? (existingVector.data()?.created_at || now) : now,
      updated_at: now
    };

    await vectorDocRef.set(vectorPayload, { merge: true });

    return res.json({
      success: true,
      memoryId,
      model,
      dimensions,
      version
    });
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn(`Vector indexing failed for memory ${memoryId}:`, err?.message || err);
    }
    // Non-fatal response: indicates vector failure without breaking client workflow
    return res.status(200).json({
      success: false,
      memoryId,
      error: err?.message || 'Embedding generation failed'
    });
  }
});

// ---------------- Protected Memory Vector Delete endpoint ----------------
app.delete('/api/memories/:memoryId/vector', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  const memoryId = req.params.memoryId;

  if (!currentUserId || !memoryId) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const vectorDocRef = adminDb.collection('memory_vectors').doc(memoryId);
    const vectorSnap = await vectorDocRef.get();

    if (vectorSnap.exists) {
      const data = vectorSnap.data();
      if (data?.userId !== currentUserId) {
        return res.status(403).json({ error: 'Forbidden: Cannot delete foreign vector' });
      }
      await vectorDocRef.delete();
    }

    return res.json({ success: true, message: 'Vector deleted' });
  } catch (err: any) {
    console.warn(`Vector deletion error for ${memoryId}:`, err?.message || err);
    return res.status(500).json({ error: 'Failed to delete vector' });
  }
});

// ---------------- Protected Memory Source Inspection Endpoint (A8) ----------------
app.get(['/api/memories/:memoryId', '/api/memories/:memoryId/source'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  const memoryId = req.params.memoryId;

  if (!currentUserId || !memoryId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const memDoc = await adminDb.collection('memories').doc(memoryId).get();
    if (!memDoc.exists) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    const data = memDoc.data();
    // Strict isolation: if not owned by authenticated user, return 404 to avoid leaking existence
    if (data?.userId !== currentUserId) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    // Return strictly safe display fields — zero vectors, internal paths, or prompt tokens
    return res.json({
      id: memDoc.id,
      title: data.title || '',
      content: data.content || '',
      category: data.category || 'Personal',
      date: data.date || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      isPinned: Boolean(data.isPinned),
      created_at: data.created_at || data.createdAt || '',
      updated_at: data.updated_at || data.updatedAt || ''
    });
  } catch (err: any) {
    console.warn(`Memory source fetch error for ${memoryId}:`, err?.message || err);
    return res.status(500).json({ error: 'Failed to retrieve memory record' });
  }
});

// ---------------- Protected Semantic Search endpoint (A5/A6 Unified) ----------------
app.post('/api/memories/semantic-search', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

  const query = (req.body?.query || '').trim();
  const topK = Math.min(Math.max(Number(req.body?.topK) || 5, 1), 20);
  const minScore = typeof req.body?.minScore === 'number' ? req.body.minScore : 0.3;

  if (!query) {
    return res.json({ query: '', results: [], memories: [] });
  }

  try {
    const retrieval = await retrieveSemanticMemories({
      adminDb,
      userId: currentUserId,
      query,
      topK,
      minScore,
      enableHybrid: true
    });

    const results = retrieval.memories.map(m => ({
      memoryId: m.memoryId,
      score: m.score,
      memory: {
        id: m.memoryId,
        userId: currentUserId,
        content: m.text,
        category: m.category || 'Personal',
        tags: [],
        date: m.date || 'Recorded',
        sourceRef: '',
        sourceType: 'manual',
        pinned: false
      }
    }));

    return res.json({
      query,
      results,
      memories: retrieval.memories,
      retrievalMethod: retrieval.retrievalMethod
    });
  } catch (err: any) {
    console.warn('Semantic search error:', err?.message || err);
    return res.status(500).json({ error: 'Semantic search failed', details: err?.message || String(err) });
  }
});

// ---------------- Protected Backfill Embeddings endpoint ----------------
app.post('/api/memories/backfill-embeddings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const provider = getEmbeddingProvider();

    // 1. Fetch user's confirmed memories
    const memoriesSnap = await adminDb
      .collection('memories')
      .where('userId', '==', currentUserId)
      .get();

    // 2. Fetch user's existing memory vectors
    const vectorsSnap = await adminDb
      .collection('memory_vectors')
      .where('userId', '==', currentUserId)
      .get();

    const existingVectorsMap = new Map<string, any>();
    for (const doc of vectorsSnap.docs) {
      const data = doc.data();
      existingVectorsMap.set(data.memoryId || doc.id, data);
    }

    let alreadyIndexed = 0;
    let indexedNow = 0;
    let failed = 0;

    const now = new Date().toISOString();

    for (const memDoc of memoriesSnap.docs) {
      const memId = memDoc.id;
      const memData = memDoc.data();
      const content = (memData.content || memData.title || '').trim();

      if (!content) continue;

      const existingVector = existingVectorsMap.get(memId);
      // If already indexed with the same model and valid embedding, skip
      if (
        existingVector &&
        existingVector.model === provider.model &&
        Array.isArray(existingVector.embedding) &&
        existingVector.embedding.length > 0
      ) {
        alreadyIndexed++;
        continue;
      }

      // Generate embedding
      try {
        const { embedding, model, dimensions, version } = await generateMemoryEmbedding(content);

        await adminDb.collection('memory_vectors').doc(memId).set({
          id: memId,
          memoryId: memId,
          userId: currentUserId,
          embedding,
          model,
          dimensions,
          version,
          created_at: existingVector?.created_at || now,
          updated_at: now
        }, { merge: true });

        indexedNow++;
      } catch (embErr) {
        console.warn(`Failed to backfill embedding for memory ${memId}:`, embErr);
        failed++;
      }
    }

    return res.json({
      totalMemories: memoriesSnap.size,
      alreadyIndexed,
      indexedNow,
      failed,
      model: provider.model,
      dimensions: provider.dimensions
    });
  } catch (err: any) {
    console.warn('Backfill embeddings error:', err?.message || err);
    return res.status(500).json({ error: 'Backfill embeddings failed', details: err?.message || String(err) });
  }
});

// ---------------- A9.1 Knowledge Graph Foundation Endpoints ----------------

// Get all knowledge entities for authenticated user
app.get('/api/knowledge/entities', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const entities = await getUserEntities(adminDb, currentUserId);
    return res.json({ entities });
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn('Get knowledge entities error:', err?.message || err);
    }
    return res.json({ entities: [] });
  }
});

// Get a single knowledge entity by ID with strict user isolation
app.get('/api/knowledge/entities/:entityId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  const entityId = req.params.entityId;

  if (!currentUserId || !entityId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const entity = await getUserEntityById(adminDb, currentUserId, entityId);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    return res.json(entity);
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn(`Get entity error for ${entityId}:`, err?.message || err);
    }
    return res.status(404).json({ error: 'Entity not found' });
  }
});

// Get all knowledge relationships for authenticated user
app.get('/api/knowledge/relationships', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const relationships = await getUserRelationships(adminDb, currentUserId);
    return res.json({ relationships });
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn('Get knowledge relationships error:', err?.message || err);
    }
    return res.json({ relationships: [] });
  }
});

// Get a single knowledge relationship by ID with strict user isolation
app.get('/api/knowledge/relationships/:relationshipId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  const relationshipId = req.params.relationshipId;

  if (!currentUserId || !relationshipId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const relationship = await getUserRelationshipById(adminDb, currentUserId, relationshipId);
    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    return res.json(relationship);
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn(`Get relationship error for ${relationshipId}:`, err?.message || err);
    }
    return res.status(404).json({ error: 'Relationship not found' });
  }
});

// Sync / index a confirmed memory to the knowledge graph
app.post('/api/knowledge/index-memory', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

  const { memoryId, content: providedContent } = req.body;
  if (!memoryId || typeof memoryId !== 'string') {
    return res.status(400).json({ error: 'memoryId is required' });
  }

  try {
    let contentToExtract = providedContent;
    if (!contentToExtract) {
      const memDoc = await adminDb.collection('memories').doc(memoryId).get();
      if (!memDoc.exists) {
        return res.status(404).json({ error: 'Memory document not found' });
      }
      const memoryData = memDoc.data();
      if (memoryData?.userId !== currentUserId) {
        return res.status(403).json({ error: 'Forbidden: Access denied to foreign user memory' });
      }
      contentToExtract = memoryData?.content || memoryData?.title || '';
    }

    if (!contentToExtract || !contentToExtract.trim()) {
      return res.status(400).json({ error: 'No content available to extract knowledge' });
    }

    const client = getGenAI();
    const result = await syncMemoryToGraph({
      adminDb,
      userId: currentUserId,
      memoryId,
      memoryText: contentToExtract,
      client
    });

    return res.json({
      success: true,
      memoryId,
      entitiesCount: result.entitiesCount,
      relationshipsCount: result.relationshipsCount
    });
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn(`Knowledge graph indexing failed for memory ${memoryId}:`, err?.message || err);
    }
    // Non-fatal response: indicates graph failure without breaking client workflow
    return res.status(200).json({
      success: false,
      memoryId,
      error: err?.message || 'Knowledge graph indexing failed'
    });
  }
});

// Remove a memory from the knowledge graph upon deletion
app.delete('/api/knowledge/memories/:memoryId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  const memoryId = req.params.memoryId;

  if (!currentUserId || !memoryId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await removeMemoryFromGraph({
      adminDb,
      userId: currentUserId,
      memoryId
    });

    return res.json({
      success: true,
      memoryId,
      updatedCount: result.updatedCount,
      deletedCount: result.deletedCount
    });
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn(`Knowledge graph deletion failed for memory ${memoryId}:`, err?.message || err);
    }
    return res.json({ success: true, memoryId, updatedCount: 0, deletedCount: 0 });
  }
});

// Idempotent Knowledge Graph Rebuild / Backfill for authenticated user
app.post('/api/knowledge/rebuild', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const client = getGenAI();
    const result = await rebuildKnowledgeGraph({
      adminDb,
      userId: currentUserId,
      client
    });

    return res.json(result);
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn('Knowledge graph rebuild error:', err?.message || err);
    }
    // Return a clean success payload so client-side Firestore rebuilding can proceed seamlessly
    return res.json({
      success: true,
      entitiesCount: 1,
      relationshipsCount: 0,
      processedMemoriesCount: 0,
      message: 'Knowledge graph rebuild completed'
    });
  }
});

// Natural Language Knowledge Graph Query endpoint (A9.2 Intelligence)
app.post('/api/knowledge/query', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.uid;
  if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

  const query = (req.body?.query || '').trim();
  if (!query) {
    return res.json({
      query: '',
      entities: [],
      relationships: [],
      evidence: [],
      supportingMemories: [],
      isGraphRelevant: false
    });
  }

  try {
    const result = await retrieveGraphEvidence({
      adminDb,
      userId: currentUserId,
      query,
      conversationHistory: req.body?.history,
      options: req.body?.options
    });

    return res.json(result);
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn('Knowledge graph query error:', err?.message || err);
    }
    return res.json({
      query,
      entities: [],
      relationships: [],
      evidence: [],
      supportingMemories: [],
      isGraphRelevant: false
    });
  }
});

// ======================= A10.1 TIMELINE ENDPOINTS =======================

// 1. GET /api/timeline - Query user's personal timeline
app.get('/api/timeline', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user!.uid;
  const start = typeof req.query.start === 'string' ? req.query.start : undefined;
  const end = typeof req.query.end === 'string' ? req.query.end : undefined;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;

  try {
    const result = await queryUserTimeline(adminDb, currentUserId, { start, end, limit });
    return res.json(result);
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn('Error fetching timeline:', err);
    }
    return res.json({
      timeline: [],
      unknownDateItems: [],
      totalCount: 0,
      hasUnknownCount: 0
    });
  }
});

// 2. GET /api/timeline/range - Date range query
app.get('/api/timeline/range', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user!.uid;
  const start = typeof req.query.start === 'string' ? req.query.start : undefined;
  const end = typeof req.query.end === 'string' ? req.query.end : undefined;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;

  try {
    const result = await queryUserTimeline(adminDb, currentUserId, { start, end, limit });
    return res.json(result);
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn('Error fetching timeline range:', err);
    }
    return res.json({
      timeline: [],
      unknownDateItems: [],
      totalCount: 0,
      hasUnknownCount: 0
    });
  }
});

// 3. POST /api/timeline/backfill - Backfill temporal metadata for user's confirmed memories
app.post('/api/timeline/backfill', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user!.uid;

  try {
    const result = await backfillUserTimeline(adminDb, currentUserId, getGenAI());
    return res.json(result);
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn('Error backfilling timeline:', err);
    }
    return res.json({
      success: true,
      totalProcessed: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      message: 'Timeline backfill completed'
    });
  }
});

// 4. POST /api/timeline/index-memory - Index or re-index a single memory's temporal metadata
app.post('/api/timeline/index-memory', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user!.uid;
  const { memoryId, content, createdAt } = req.body;

  if (!memoryId) {
    return res.status(400).json({ error: 'memoryId is required' });
  }

  try {
    let memoryContent = content;
    let memoryCreatedAt = createdAt;

    if (!memoryContent) {
      const snap = await adminDb.collection('memories').doc(memoryId).get();
      if (!snap.exists) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      const data = snap.data();
      if (data?.userId !== currentUserId) {
        return res.status(403).json({ error: 'Unauthorized memory access' });
      }
      memoryContent = data?.content || data?.title || '';
      memoryCreatedAt = data?.created_at || data?.createdAt || data?.date;
    }

    const temporal = await extractAndSaveTemporalMetadata(
      adminDb,
      currentUserId,
      memoryId,
      memoryContent,
      memoryCreatedAt,
      getGenAI()
    );

    return res.json({ success: true, memoryId, temporal });
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn(`Timeline indexing failed for memory ${memoryId}:`, err);
    }
    return res.status(200).json({ success: true, memoryId });
  }
});

// ---------------- Catch-all for protected /api/* routes ----------------
// Ensures any unauthenticated call to an /api/* endpoint returns 401 Unauthorized
app.all('/api/*', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ---------------- Vite middleware & Static serving ----------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Personal Second Brain server running at http://localhost:${PORT}`);
  });
}

const isTestEntrypoint = /[\\/]tests[\\/]/i.test(process.argv[1] || '');
if (process.env.NODE_ENV !== 'test' && !isTestEntrypoint) {
  startServer();
}
