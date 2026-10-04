import type { Firestore } from 'firebase-admin/firestore';
import { generateQueryEmbedding, cosineSimilarity } from './embeddingService';
import { SemanticMemoryResult, RetrievalContext, MemoryCategory } from '../types';

export interface RetrieveMemoriesOptions {
  adminDb: Firestore;
  userId: string;
  query: string;
  topK?: number;
  minScore?: number;
  history?: { role: string; content: string }[];
  enableHybrid?: boolean;
}

export interface SemanticRetrievalOutput extends RetrievalContext {
  queryUsed: string;
}

/**
 * Common English stopwords to ignore when analyzing query keywords
 */
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could',
  'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s',
  'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m',
  'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t',
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t',
  'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t',
  'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s',
  'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself',
  'yourselves', 'tell', 'show', 'give', 'yesterday', 'today', 'tomorrow', 'recently', 'last', 'next', 'week', 'month', 'year'
]);

/**
 * Fast deterministic intent layer to detect if a query potentially requires personal memory retrieval.
 * Examples that trigger retrieval:
 *  - "Who did I meet recently?"
 *  - "What was my idea yesterday?"
 *  - "What am I currently working on?"
 *  - "When did I meet Ravi?"
 *  - "What was my video idea?"
 *  - "What am I currently trying to finish?"
 * Examples that do NOT trigger retrieval:
 *  - "What is Python?"
 *  - "Explain recursion."
 *  - "How does an API work?"
 *  - "What is a transformer?"
 *  - "Write a Python function."
 */
export function isPersonalQuery(message: string, history?: { role: string; content: string }[]): boolean {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim().toLowerCase();
  if (trimmed.length === 0) return false;

  // 1. Filter out obvious general/technical explanations without personal reference
  const isGeneralTechnical = /^(what is|explain|how does|what are|define|how to|write a|write code|code a|implement|show me a code|give me a function|tell me about the history of)\b/i.test(trimmed);
  const hasFirstPersonPronoun = /\b(i|my|me|we|our|myself|us|mine)\b/i.test(trimmed);

  // If it's a technical query with NO first person pronoun, skip personal retrieval
  if (isGeneralTechnical && !hasFirstPersonPronoun) {
    return false;
  }

  // 2. Filter out general conversational pleasantries
  const isGreeting = /^(hi|hello|hey|good morning|good evening|good afternoon|how are you|thanks|thank you|ok|okay|bye|goodbye)[.!? ]*$/i.test(trimmed);
  if (isGreeting) {
    return false;
  }

  // 3. Positive indicators for personal life retrieval
  // A. First-person inquiries (e.g. "Who did I...", "What was my...", "What am I...")
  if (hasFirstPersonPronoun) {
    const personalActionOrEntity = /\b(meet|met|chai|tea|dinner|lunch|breakfast|friend|friends|brother|sister|mom|dad|family|vacation|trip|yesterday|today|last night|last week|recent|recently|idea|ideas|video|goal|goals|project|projects|plan|plans|finish|trying to finish|working on|discuss|discussed|talk|talked|visit|visited|remember|routine|habit|preference|note|notes|bought|schedule|scheduled)\b/i.test(trimmed);
    if (personalActionOrEntity) return true;

    // Any question with "did I", "was I", "have I", "am I", "do I", "was my", "were my", "is my", "are my"
    if (/\b(did i|was i|have i|am i|do i|can i|was my|were my|is my|are my|about my|my)\b/i.test(trimmed)) {
      return true;
    }
  }

  // B. Questions asking about personal entities, names, or meetings even if pronoun omitted (e.g. "When did Ravi meet?")
  const personalQueryPatterns = [
    /\b(who did|what did|when did|where did|why did|how did)\b/i.test(trimmed),
    /\b(who does|where does|what does|who works|who worked|where do)\b/i.test(trimmed),
    /\b(who was|what was|when was|where was|who is|who are)\b/i.test(trimmed),
    /\b(what happened|what occurred|what took place)\b/i.test(trimmed),
    /\b(what do i remember|do you remember|what do i know about)\b/i.test(trimmed),
    /\b(chai with|met with|talked with|discussed with|worked with|works with|works at|worked at|work for|works for)\b/i.test(trimmed)
  ];
  if (personalQueryPatterns.some(p => p)) {
    return true;
  }

  // C. Anaphoric follow-up inquiries that depend on recent context (e.g. "What did we do?", "When was that?", "What about Ravi?")
  if (history && history.length > 0) {
    const isAnaphoric = /\b(what did we do|when was that|where was that|who was there|tell me more|what happened then|what was that|what about|how about|and what about|did i meet|who did i meet|and when|what about my)\b/i.test(trimmed);
    if (isAnaphoric) return true;
  }

  return false;
}

/**
 * Builds an effective search query incorporating multi-turn context when the current query is anaphoric
 */
export function buildSearchQuery(message: string, history?: { role: string; content: string }[]): string {
  const trimmed = message.trim();
  if (!history || history.length === 0) return trimmed;

  // Check if current query is short or anaphoric
  const isAnaphoric = /^(what did we do|what was that|when was that|who was that|where was that|tell me more|with whom|what else)[?.! ]*$/i.test(trimmed);
  const words = trimmed.split(/\s+/);

  if ((isAnaphoric || words.length <= 4) && history.length > 0) {
    // Find the most recent user turn
    const previousUserTurns = history.filter(h => h && h.role === 'user');
    if (previousUserTurns.length > 0) {
      const lastUserMsg = previousUserTurns[previousUserTurns.length - 1].content.trim();
      if (lastUserMsg && lastUserMsg.length > 3) {
        return `${lastUserMsg} ${trimmed}`;
      }
    }
  }

  return trimmed;
}

/**
 * Reusable server-side semantic retrieval service
 * Retrieves confirmed Memories for the authenticated user based on meaning and keyword relevance.
 */
export async function retrieveSemanticMemories(
  options: RetrieveMemoriesOptions
): Promise<SemanticRetrievalOutput> {
  const {
    adminDb,
    userId,
    query,
    topK = 5,
    minScore = 0.60,
    history,
    enableHybrid = true
  } = options;

  if (!userId || typeof userId !== 'string') {
    return { memories: [], retrievalMethod: 'none', queryUsed: query };
  }

  const trimmedQuery = (query || '').trim();
  if (!trimmedQuery) {
    return { memories: [], retrievalMethod: 'none', queryUsed: '' };
  }

  const queryUsed = buildSearchQuery(trimmedQuery, history);

  try {
    // 1. Generate query embedding via the existing A5 provider
    const { embedding: queryEmbedding } = await generateQueryEmbedding(queryUsed);

    // 2. Fetch authenticated user's vectors with strict isolation
    const vectorsSnap = await adminDb
      .collection('memory_vectors')
      .where('userId', '==', userId)
      .get();

    const scoredVectorsMap = new Map<string, { memoryId: string; score: number }>();

    if (!vectorsSnap.empty) {
      for (const doc of vectorsSnap.docs) {
        const data = doc.data();
        if (data.userId !== userId) continue; // Multi-tenant isolation sanity check

        const vec = data.embedding;
        if (Array.isArray(vec) && vec.length > 0) {
          const score = cosineSimilarity(queryEmbedding, vec);
          if (score >= minScore) {
            const memoryId = data.memoryId || doc.id;
            scoredVectorsMap.set(memoryId, { memoryId, score });
          }
        }
      }
    }

    // 3. Hybrid Exact Keyword Retrieval (Preserves exact keyword search & blends with semantic index)
    let foundKeywordMatches = false;
    if (enableHybrid) {
      // Extract significant search tokens
      const searchTokens = trimmedQuery
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 3 && !STOP_WORDS.has(t));

      if (searchTokens.length > 0) {
        const memoriesSnap = await adminDb
          .collection('memories')
          .where('userId', '==', userId)
          .get();

        for (const doc of memoriesSnap.docs) {
          const memData = doc.data();
          if (memData.userId !== userId) continue;

          const content = (memData.content || memData.title || '').toLowerCase();
          const tags = Array.isArray(memData.tags) ? memData.tags.map((t: string) => String(t).toLowerCase()) : [];
          
          let tokenMatches = 0;
          for (const token of searchTokens) {
            if (content.includes(token) || tags.some((t: string) => t.includes(token))) {
              tokenMatches++;
            }
          }

          if (tokenMatches > 0) {
            foundKeywordMatches = true;
            const memoryId = doc.id;
            // Calculate a hybrid keyword score proportional to the fraction of non-stopword tokens matched
            const matchRatio = tokenMatches / searchTokens.length;
            const keywordScore = Math.min(0.40 + matchRatio * 0.55, 0.95);
            const existing = scoredVectorsMap.get(memoryId);

            if (existing) {
              // Blend semantic and keyword: take the higher score with a boost
              const blendedScore = Math.min(Math.max(existing.score, keywordScore) + 0.05, 1.0);
              scoredVectorsMap.set(memoryId, { memoryId, score: blendedScore });
            } else {
              // If not in semantic results (e.g. slight semantic divergence or not yet embedded), include via keyword
              scoredVectorsMap.set(memoryId, { memoryId, score: keywordScore });
            }
          }
        }
      }
    }

    if (scoredVectorsMap.size === 0) {
      return { memories: [], retrievalMethod: 'none', queryUsed };
    }

    // 4. Rank candidates descending by score
    const rankedCandidates = Array.from(scoredVectorsMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(topK, 1));

    // 5. Hydrate Memory documents from Firestore
    const hydratedMemories: SemanticMemoryResult[] = [];

    for (const candidate of rankedCandidates) {
      const memDoc = await adminDb.collection('memories').doc(candidate.memoryId).get();
      if (memDoc.exists) {
        const memData = memDoc.data();
        // Multi-tenant check
        if (memData?.userId === userId) {
          const text = (memData.content || memData.title || '').trim();
          if (text) {
            hydratedMemories.push({
              memoryId: candidate.memoryId,
              text,
              score: Number(candidate.score.toFixed(4)),
              category: (memData.category as MemoryCategory) || 'Personal',
              date: memData.date || (memData.created_at ? memData.created_at.slice(0, 10) : undefined),
              createdAt: memData.created_at,
              updatedAt: memData.updated_at
            });
          }
        }
      }
    }

    const retrievalMethod = foundKeywordMatches && scoredVectorsMap.size > 0 ? 'hybrid' : 'semantic';

    return {
      memories: hydratedMemories,
      retrievalMethod: hydratedMemories.length > 0 ? retrievalMethod : 'none',
      queryUsed
    };
  } catch (err: any) {
    // Non-fatal error handling: log diagnostic without exposing secrets, return empty context
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn(`[SemanticRetrieval] Retrieval failed for user ${userId}:`, err?.message || err);
    }
    return {
      memories: [],
      retrievalMethod: 'none',
      queryUsed
    };
  }
}
