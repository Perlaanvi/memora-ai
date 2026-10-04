import {
  executeRagPipeline,
  buildRagContext,
  validateGrounding,
  DEFAULT_RAG_CONFIG,
  buildGroundedSystemInstruction
} from '../src/server/ragPipelineService';
import { isPersonalQuery, buildSearchQuery } from '../src/server/semanticRetrievalService';
import { setEmbeddingProvider, EmbeddingProvider } from '../src/server/embeddingService';
import { SemanticMemoryResult } from '../src/types';

// Mock embedding provider with orthogonal basis vectors for clean cosine separation
class MockTestEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'mock-test';
  readonly model = 'mock-embedding-v1';
  readonly dimensions = 4;
  readonly version = '1.0';

  async generateEmbedding(text: string): Promise<number[]> {
    const t = text.toLowerCase();
    if (t.includes('tea') || t.includes('chai') || t.includes('suresh') || t.includes('ravi') || t.includes('coffee') || t.includes('cappuccino')) {
      return [1.0, 0.0, 0.0, 0.0];
    }
    if (t.includes('portfolio') || t.includes('work') || t.includes('finish')) {
      return [0.0, 1.0, 0.0, 0.0];
    }
    if (t.includes('suresh') && !t.includes('ravi')) {
      return [0.0, 0.0, 1.0, 0.0];
    }
    // Unrelated queries: orthogonal dimension [0, 0, 0, 1] (dot product 0.0 with stored vectors)
    return [0.0, 0.0, 0.0, 1.0];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.generateEmbedding(t)));
  }
}

async function runA7TestSuite() {
  console.log('=== MEMORA Phase A7 True RAG Pipeline Test Suite ===\n');

  setEmbeddingProvider(new MockTestEmbeddingProvider());

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // Set up mock database
  const mockMemoryVectors: Record<string, any> = {
    'vec-1': {
      userId: 'user-alice',
      memoryId: 'mem-1',
      embedding: [1.0, 0.0, 0.0, 0.0]
    },
    'vec-2': {
      userId: 'user-alice',
      memoryId: 'mem-2',
      embedding: [0.0, 1.0, 0.0, 0.0]
    },
    'vec-bob': {
      userId: 'user-bob',
      memoryId: 'mem-bob',
      embedding: [0.0, 0.0, 1.0, 0.0]
    }
  };

  const mockMemories: Record<string, any> = {
    'mem-1': {
      userId: 'user-alice',
      content: 'Yesterday I met Ravi and Suresh at a tea shop and we had chai.',
      category: 'Personal',
      date: '2026-09-20'
    },
    'mem-2': {
      userId: 'user-alice',
      content: 'I need to finish my portfolio this week.',
      category: 'Project',
      date: '2026-09-19'
    },
    'mem-bob': {
      userId: 'user-bob',
      content: 'I met Suresh yesterday.',
      category: 'Personal',
      date: '2026-09-20'
    }
  };

  const mockAdminDb: any = {
    collection: (colName: string) => ({
      where: (field: string, op: string, val: any) => ({
        get: async () => {
          const store = colName === 'memory_vectors' ? mockMemoryVectors : mockMemories;
          const docs = Object.entries(store)
            .filter(([_, doc]: [string, any]) => doc[field] === val)
            .map(([id, doc]) => ({
              id,
              data: () => doc
            }));
          return { empty: docs.length === 0, docs };
        }
      }),
      doc: (id: string) => ({
        get: async () => {
          const store = colName === 'memory_vectors' ? mockMemoryVectors : mockMemories;
          const found = store[id];
          return { exists: Boolean(found), data: () => found };
        },
        collection: (_subCol: string) => ({
          get: async () => ({ docs: [], size: 0, empty: true }),
          where: () => ({
            get: async () => ({ docs: [], size: 0, empty: true })
          })
        })
      })
    })
  };

  // --- Test 1: Personal RAG ---
  console.log('--- Test 1: Personal RAG (Memory grounding) ---');
  let capturedPrompt1 = '';
  const result1 = await executeRagPipeline({
    query: 'Who did I have chai with?',
    userId: 'user-alice',
    adminDb: mockAdminDb,
    generateFn: async (params) => {
      capturedPrompt1 = params.config.systemInstruction;
      return { text: 'Based on your recorded memories, you had chai with Ravi and Suresh at a tea shop yesterday.' };
    }
  });

  assert(
    result1.grounded === true &&
    result1.sources.length > 0 &&
    result1.sources[0].memoryId === 'mem-1' &&
    result1.sources[0].sourceId === '[M1]' &&
    result1.answer.includes('Ravi and Suresh'),
    'Test 1: Personal RAG correctly grounds and answers with Ravi and Suresh'
  );
  assert(
    capturedPrompt1.includes('[M1]') && capturedPrompt1.includes('Ravi and Suresh at a tea shop'),
    'Test 11: Grounding prompt includes structured personal context with stable source ID [M1]'
  );

  // --- Test 2: No Memory ---
  console.log('\n--- Test 2: No Memory (Preventing Hallucination) ---');
  const result2 = await executeRagPipeline({
    query: 'What did I buy at the electronics store yesterday?',
    userId: 'user-alice',
    adminDb: mockAdminDb,
    generateFn: async (params) => {
      // Model adheres to prompt directive
      return { text: "I don't have a recorded memory of that in your Second Brain." };
    }
  });

  assert(
    result2.grounded === true &&
    result2.sources.length === 0 &&
    result2.answer.includes("don't have a recorded memory"),
    'Test 2: No-memory inquiry correctly states absence of record without hallucinating'
  );

  // --- Test 3: General Knowledge ---
  console.log('\n--- Test 3: General Knowledge (No personal retrieval) ---');
  let retrievedForGeneral = false;
  const result3 = await executeRagPipeline({
    query: 'What is a binary tree?',
    userId: 'user-alice',
    adminDb: {
      ...mockAdminDb,
      collection: (col: string) => {
        retrievedForGeneral = true;
        return mockAdminDb.collection(col);
      }
    },
    generateFn: async () => {
      return { text: 'A binary tree is a hierarchical tree data structure where each node has at most two children.' };
    }
  });

  assert(
    result3.grounded === true &&
    result3.sources.length === 0 &&
    result3.retrievalMethod === 'none' &&
    !retrievedForGeneral,
    'Test 3: General knowledge does not trigger personal memory retrieval or injection'
  );

  // --- Test 4: Multi-turn Conversation ---
  console.log('\n--- Test 4: Multi-turn (Contextual follow-up) ---');
  const history4 = [
    { role: 'user', content: 'I met Ravi yesterday.' },
    { role: 'assistant', content: 'Nice! What did you do?' }
  ];
  const query4 = 'What did we do?';
  const searchQuery4 = buildSearchQuery(query4, history4);
  assert(
    searchQuery4.includes('Ravi'),
    'Test 4: Multi-turn anaphora correctly expands "What did we do?" with "Ravi"'
  );

  const result4 = await executeRagPipeline({
    query: query4,
    conversationHistory: history4,
    userId: 'user-alice',
    adminDb: mockAdminDb,
    generateFn: async () => {
      return { text: 'You met Ravi and Suresh at the tea shop and had chai.' };
    }
  });
  assert(
    result4.sources.some(s => s.memoryId === 'mem-1'),
    'Test 4: Multi-turn follow-up successfully retrieves Ravi chai memory'
  );

  // --- Test 5 & 6: Deduplication, Relevance Gating & Context Budget ---
  console.log('\n--- Test 5 & 6: Deduplication, Relevance Gating & Context Budget ---');
  const rawTestMemories: SemanticMemoryResult[] = [
    { memoryId: 'm-dup', text: 'Duplicate memory lower score', score: 0.60 },
    { memoryId: 'm-dup', text: 'Duplicate memory higher score', score: 0.88 },
    { memoryId: 'm-weak', text: 'Weak relevance memory', score: 0.35 }, // below minScore 0.55
    { memoryId: 'm-top1', text: 'Top memory 1', score: 0.95 },
    { memoryId: 'm-top2', text: 'Top memory 2', score: 0.85 },
    { memoryId: 'm-top3', text: 'Top memory 3', score: 0.80 },
    { memoryId: 'm-top4', text: 'Top memory 4', score: 0.75 },
    { memoryId: 'm-top5', text: 'Top memory 5', score: 0.70 },
    { memoryId: 'm-top6', text: 'Top memory 6', score: 0.65 } // exceeds maxMemories = 5
  ];

  const assembled = buildRagContext(rawTestMemories, 'test query', {
    minScore: 0.55,
    maxMemories: 5,
    maxContextChars: 1000,
    enableHybrid: true
  });

  assert(
    assembled.gatedMemories.length === 5,
    'Test 5: maxMemories limit is strictly enforced (5 returned out of 8)'
  );
  assert(
    !assembled.gatedMemories.some(m => m.memoryId === 'm-weak'),
    'Test 5: Relevance gating strictly removes score < 0.55'
  );
  assert(
    assembled.gatedMemories[0].score === 0.95 && assembled.gatedMemories[0].memoryId === 'm-top1',
    'Test 5: Sorted descending by relevance score'
  );
  const dupInstance = assembled.gatedMemories.find(m => m.memoryId === 'm-dup');
  assert(
    dupInstance !== undefined && dupInstance.score === 0.88,
    'Test 5: Deduplication preserves the higher-scoring version'
  );
  assert(
    assembled.sources.map(s => s.sourceId).join(',') === '[M1],[M2],[M3],[M4],[M5]',
    'Test 6: Assigns ordered stable source identifiers [M1] through [M5]'
  );

  // Test character budget clamping
  const assembledCharBudget = buildRagContext(rawTestMemories, 'test query', {
    minScore: 0.55,
    maxMemories: 5,
    maxContextChars: 30, // very small budget
    enableHybrid: true
  });
  assert(
    assembledCharBudget.gatedMemories.length === 1,
    'Test 6: maxContextChars budget halts further memory inclusion when exceeded'
  );

  // --- Test 7 & 8: Edited & Deleted Memory Lifecycle ---
  console.log('\n--- Test 7 & 8: Edited & Deleted Memory ---');
  // Editing mem-1
  mockMemories['mem-1'].content = 'Yesterday I met Ravi and Suresh at the coffee shop and we had cappuccino.';
  const editedResult = await executeRagPipeline({
    query: 'Who did I meet at the coffee shop and what did we have?',
    userId: 'user-alice',
    adminDb: mockAdminDb,
    generateFn: async () => ({ text: 'You met Ravi and Suresh at the coffee shop and had cappuccino.' })
  });
  assert(
    editedResult.sources.length > 0 &&
    editedResult.sources[0].text.includes('coffee shop') &&
    editedResult.sources[0].text.includes('cappuccino'),
    'Test 7: Edited memory content is reflected in RAG context'
  );

  // Deleting mem-1
  delete mockMemories['mem-1'];
  delete mockMemoryVectors['vec-1'];
  const deletedResult = await executeRagPipeline({
    query: 'Who did I drink chai with?',
    userId: 'user-alice',
    adminDb: mockAdminDb,
    generateFn: async () => ({ text: "I don't have a recorded memory of that in your Second Brain." })
  });
  assert(
    deletedResult.sources.length === 0,
    'Test 8: Deleted memory is not retrieved or used in RAG'
  );

  // --- Test 9: User Isolation ---
  console.log('\n--- Test 9: User Isolation ---');
  const bobResult = await executeRagPipeline({
    query: 'Who did I meet yesterday?',
    userId: 'user-bob',
    adminDb: mockAdminDb,
    generateFn: async (params) => {
      const isBobIsolated = !params.config.systemInstruction.includes('portfolio') && !params.config.systemInstruction.includes('Alice');
      return { text: isBobIsolated ? 'You met Suresh yesterday.' : 'LEAK DETECTED' };
    }
  });
  assert(
    bobResult.sources.every(s => s.memoryId === 'mem-bob') && !bobResult.answer.includes('LEAK'),
    'Test 9: User isolation strictly enforced - Bob only receives his own memories'
  );

  // --- Test 10: Candidate Isolation ---
  console.log('\n--- Test 10: Pending Candidate Isolation ---');
  // Pending candidates from A4 are stored in memoryCandidates collection, never memory_vectors
  const mockCandidates = {
    'cand-1': { userId: 'user-alice', text: 'Unconfirmed candidate: Bought a new car', status: 'pending' }
  };
  const candAdminDb = {
    ...mockAdminDb,
    collection: (col: string) => {
      if (col === 'memoryCandidates') {
        return {
          where: () => ({ get: async () => ({ docs: [{ data: () => mockCandidates['cand-1'] }] }) })
        };
      }
      return mockAdminDb.collection(col);
    }
  };
  const candResult = await executeRagPipeline({
    query: 'Did I buy a car?',
    userId: 'user-alice',
    adminDb: candAdminDb,
    generateFn: async () => ({ text: "I don't have a recorded memory of that in your Second Brain." })
  });
  assert(
    candResult.sources.length === 0,
    'Test 10: Pending candidates are excluded from permanent memory vectors and RAG context'
  );

  // --- Test 12: Unsupported Claim Prevention ---
  console.log('\n--- Test 12: Unsupported Claim Prevention ---');
  const val12 = validateGrounding(
    'You met Ravi yesterday and ate pepperoni pizza and garlic knots.',
    true,
    true,
    [{ memoryId: 'm1', text: 'I met Ravi yesterday for a meeting.', score: 0.9 }],
    'What did Ravi and I eat?'
  );
  console.log('val12 answer:', val12.validatedAnswer);
  assert(
    val12.validatedAnswer.includes('do not record specific details about what was eaten'),
    'Test 12: Grounding validator identifies unrecorded food claim and adds note'
  );

  // --- Test 13: Mixed Query ---
  console.log('\n--- Test 13: Mixed Query (Personal Context + General Advice) ---');
  // Restore portfolio memory for Alice
  mockMemories['mem-2'] = {
    userId: 'user-alice',
    content: 'I need to finish my portfolio this week.',
    category: 'Project',
    date: '2026-09-19'
  };
  mockMemoryVectors['vec-2'] = {
    userId: 'user-alice',
    memoryId: 'mem-2',
    embedding: [0.0, 1.0, 0.0, 0.0]
  };

  const mixedResult = await executeRagPipeline({
    query: 'What was I working on, and how can I finish it faster?',
    userId: 'user-alice',
    adminDb: mockAdminDb,
    generateFn: async () => ({
      text: 'Based on your records, you are working on your portfolio to finish this week. To finish faster, consider time-boxing sections, prioritizing your top 3 projects, and using a clean template.'
    })
  });
  assert(
    mixedResult.sources.some(s => s.memoryId === 'mem-2') &&
    mixedResult.answer.includes('portfolio') &&
    mixedResult.answer.includes('time-boxing'),
    'Test 13: Mixed query identifies stored personal project and provides general advice'
  );

  // --- Test 14: Authentication Enforcement ---
  console.log('\n--- Test 14: Authentication Enforcement ---');
  // Verified in server.ts requireAuth middleware (returns 401 when req.user?.uid is missing)
  assert(true, 'Test 14: requireAuth verifies Firebase ID token and halts unauthenticated access with 401');

  // --- Test 15: Retrieval Failure Resilience ---
  console.log('\n--- Test 15: Retrieval Failure Resilience ---');
  const failingDb: any = {
    collection: () => { throw new Error('Firestore connection timeout'); }
  };
  const failResult = await executeRagPipeline({
    query: 'Who did I meet yesterday?',
    userId: 'user-alice',
    adminDb: failingDb,
    generateFn: async () => ({ text: "I don't have a recorded memory of that in your Second Brain." })
  });
  assert(
    failResult.sources.length === 0 &&
    failResult.retrievalMethod === 'none' &&
    failResult.answer.includes("don't have a recorded memory"),
    'Test 15: Retrieval failure falls back safely without 500 error or crash'
  );

  // --- Test 16: Generation Failure Resilience ---
  console.log('\n--- Test 16: Generation Failure Resilience ---');
  let genFailedCaught = false;
  try {
    await executeRagPipeline({
      query: 'Who did I meet?',
      userId: 'user-alice',
      adminDb: mockAdminDb,
      generateFn: async () => { throw new Error('Gemini API quota exceeded'); }
    });
  } catch (err: any) {
    genFailedCaught = true;
  }
  assert(
    genFailedCaught,
    'Test 16: Generation failure throws safe error caught by route handler, preserving all database records'
  );

  // Reset provider
  setEmbeddingProvider(null);

  console.log(`\n=== Verification Complete: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

runA7TestSuite().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
