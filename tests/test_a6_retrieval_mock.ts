import { retrieveSemanticMemories } from '../src/server/semanticRetrievalService';
import { setEmbeddingProvider, EmbeddingProvider } from '../src/server/embeddingService';

// Mock embedding provider that converts keywords into test vectors
class MockTestEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'mock-test';
  readonly model = 'mock-embedding-v1';
  readonly dimensions = 3;
  readonly version = '1.0';

  async generateEmbedding(text: string): Promise<number[]> {
    const t = text.toLowerCase();
    if (t.includes('tea') || t.includes('chai') || t.includes('suresh') || t.includes('ravi')) {
      return [0.95, 0.05, 0.0];
    }
    if (t.includes('run') || t.includes('marathon')) {
      return [0.05, 0.95, 0.0];
    }
    if (t.includes('recipe') || t.includes('cook') || t.includes('software')) {
      return [0.0, 0.1, 0.95];
    }
    return [0.33, 0.33, 0.33];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.generateEmbedding(t)));
  }
}

async function testRetrievalLogic() {
  console.log('=== MEMORA Phase A6 Retrieval Logic Verification ===\n');

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

  // Build in-memory mock adminDb
  const mockMemoryVectors: Record<string, any> = {
    'vec-1': {
      userId: 'user-alice',
      memoryId: 'mem-1',
      // High match with tea/chai
      embedding: [0.95, 0.05, 0.0]
    },
    'vec-2': {
      userId: 'user-alice',
      memoryId: 'mem-2',
      // High match with run/marathon
      embedding: [0.05, 0.95, 0.0]
    },
    'vec-3': {
      userId: 'user-alice',
      memoryId: 'mem-3',
      // High match with recipe/cooking
      embedding: [0.0, 0.1, 0.95]
    },
    'vec-bob': {
      userId: 'user-bob', // FOREIGN USER
      memoryId: 'mem-bob',
      embedding: [0.95, 0.05, 0.0]
    }
  };

  const mockMemories: Record<string, any> = {
    'mem-1': {
      userId: 'user-alice',
      content: 'Yesterday I met Ravi and Suresh at the tea shop and we had chai.',
      category: 'Personal',
      date: '2026-09-20'
    },
    'mem-2': {
      userId: 'user-alice',
      content: 'I want to run a half marathon before November.',
      category: 'Health',
      date: '2026-09-18'
    },
    'mem-3': {
      userId: 'user-alice',
      content: 'Idea: Build a Chrome extension that turns recipe blogs into clean checklists.',
      category: 'Project',
      date: '2026-09-15'
    },
    'mem-bob': {
      userId: 'user-bob',
      content: 'Bob had chai with Alice.',
      category: 'Personal',
      date: '2026-09-19'
    }
  };

  const mockAdminDb: any = {
    collection: (colName: string) => ({
      where: (field: string, op: string, val: any) => ({
        get: async () => {
          if (colName === 'memory_vectors') {
            const docs = Object.entries(mockMemoryVectors)
              .filter(([_, doc]) => doc[field] === val)
              .map(([id, doc]) => ({
                id,
                data: () => doc
              }));
            return {
              empty: docs.length === 0,
              docs
            };
          }
          if (colName === 'memories') {
            const docs = Object.entries(mockMemories)
              .filter(([_, doc]) => doc[field] === val)
              .map(([id, doc]) => ({
                id,
                data: () => doc
              }));
            return {
              empty: docs.length === 0,
              docs
            };
          }
          return { empty: true, docs: [] };
        }
      }),
      doc: (id: string) => ({
        get: async () => {
          const store = colName === 'memories' ? mockMemories : mockMemoryVectors;
          const found = store[id];
          return {
            exists: Boolean(found),
            data: () => found
          };
        }
      })
    })
  };

  // Test 1: User Isolation (Scenario 7) - Alice query must never return Bob's memories
  console.log('--- Test 1: User Isolation (Scenario 7) ---');
  const aliceResult = await retrieveSemanticMemories({
    adminDb: mockAdminDb,
    userId: 'user-alice',
    query: 'Who did I drink tea with recently?',
    topK: 5,
    minScore: 0.5,
    enableHybrid: true
  });

  const containsForeign = aliceResult.memories.some(m => m.memoryId === 'mem-bob');
  assert(!containsForeign, 'Scenario 7: User isolation holds - foreign user memories are never retrieved');
  assert(
    aliceResult.memories.some(m => m.memoryId === 'mem-1'),
    'Scenario 1: Successfully retrieves Ravi and Suresh tea memory for Alice'
  );

  // Test 2: Conceptual Goal Retrieval (Scenario 2)
  console.log('\n--- Test 2: Conceptual Goal Retrieval (Scenario 2) ---');
  const goalResult = await retrieveSemanticMemories({
    adminDb: mockAdminDb,
    userId: 'user-alice',
    query: 'Do I have any running goals?',
    topK: 5,
    minScore: 0.5,
    enableHybrid: true
  });
  assert(
    goalResult.memories.length > 0 && goalResult.memories[0].memoryId === 'mem-2',
    'Scenario 2: Correctly matches "running goals" to "half marathon before November"',
    `Top match: ${goalResult.memories[0]?.memoryId}`
  );

  // Test 3: Idea Retrieval (Scenario 3)
  console.log('\n--- Test 3: Idea Retrieval (Scenario 3) ---');
  const ideaResult = await retrieveSemanticMemories({
    adminDb: mockAdminDb,
    userId: 'user-alice',
    query: 'What was my cooking software concept?',
    topK: 5,
    minScore: 0.5,
    enableHybrid: true
  });
  assert(
    ideaResult.memories.length > 0 && ideaResult.memories[0].memoryId === 'mem-3',
    'Scenario 3: Correctly matches "cooking software concept" to "Chrome extension for recipe blogs"',
    `Top match: ${ideaResult.memories[0]?.memoryId}`
  );

  // Test 4: MinScore Thresholding (Scenario 13)
  console.log('\n--- Test 4: MinScore Thresholding (Scenario 13) ---');
  const strictResult = await retrieveSemanticMemories({
    adminDb: mockAdminDb,
    userId: 'user-alice',
    query: 'completely unrelated query xyz',
    topK: 5,
    minScore: 0.99, // extremely strict
    enableHybrid: false
  });
  assert(
    strictResult.memories.length === 0,
    'Scenario 13: minScore threshold filters out weak matches'
  );

  // Test 5: TopK Limiting (Scenario 12)
  console.log('\n--- Test 5: TopK Limiting (Scenario 12) ---');
  const topKResult = await retrieveSemanticMemories({
    adminDb: mockAdminDb,
    userId: 'user-alice',
    query: 'tea chai marathon running recipe',
    topK: 1, // limit to 1
    minScore: 0.01,
    enableHybrid: true
  });
  assert(
    topKResult.memories.length === 1,
    'Scenario 12: topK limiting restricts maximum return count to exactly 1'
  );

  // Test 6: Document Hydration (Scenario 14)
  console.log('\n--- Test 6: Document Hydration (Scenario 14) ---');
  const hydrated = aliceResult.memories[0];
  assert(
    hydrated.text.includes('Ravi and Suresh') && hydrated.category === 'Personal' && hydrated.date === '2026-09-20',
    'Scenario 14: Accurately hydrates memory content, category, and date from memories collection'
  );

  // Test 7: Empty Result Handling (Scenario 6)
  console.log('\n--- Test 7: No Relevant Memory Fallback (Scenario 6) ---');
  const noMatchResult = await retrieveSemanticMemories({
    adminDb: mockAdminDb,
    userId: 'user-charlie-no-memories',
    query: 'What did I buy at the electronics store yesterday?',
    topK: 5,
    minScore: 0.55
  });
  assert(
    noMatchResult.memories.length === 0 && noMatchResult.retrievalMethod === 'none',
    'Scenario 6: Returns empty result with retrievalMethod: "none" when user has no matching memories'
  );

  // Clean up provider
  setEmbeddingProvider(null);

  console.log(`\n=== Verification Complete: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

testRetrievalLogic().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
