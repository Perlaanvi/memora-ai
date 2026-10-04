import { isPersonalQuery, buildSearchQuery } from '../src/server/semanticRetrievalService';
import { cosineSimilarity } from '../src/server/embeddingService';

function runScenarioTests() {
  console.log('=== MEMORA Phase A6 Semantic Retrieval Test Suite ===\n');

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

  // 1. Personal Query Intent Detection - Positive Cases
  console.log('--- 1. Intent Detection: Positive Personal Memory Cases ---');
  assert(
    isPersonalQuery('Who did I drink tea with recently?'),
    'Scenario 1: Detects "Who did I drink tea with recently?" as personal query'
  );
  assert(
    isPersonalQuery('Do I have any running goals?'),
    'Scenario 2: Detects "Do I have any running goals?" as personal query'
  );
  assert(
    isPersonalQuery('What was my cooking software concept?'),
    'Scenario 3: Detects "What was my cooking software concept?" as personal query'
  );
  assert(
    isPersonalQuery('What did I record this week?'),
    'Detects "What did I record this week?" as personal query'
  );
  assert(
    isPersonalQuery('When did I meet Suresh?'),
    'Detects "When did I meet Suresh?" as personal query'
  );
  assert(
    isPersonalQuery('What ideas did I have about mobile apps?'),
    'Detects "What ideas did I have about mobile apps?" as personal query'
  );
  assert(
    isPersonalQuery('Where did we go on vacation?'),
    'Detects "Where did we go on vacation?" as personal query'
  );

  // 2. Personal Query Intent Detection - Negative Cases (General / Non-Personal)
  console.log('\n--- 2. Intent Detection: Negative General Query Cases ---');
  assert(
    !isPersonalQuery('What is the capital of France?'),
    'Scenario 4: Rejects general knowledge "What is the capital of France?"'
  );
  assert(
    !isPersonalQuery('Explain quantum computing basics.'),
    'Scenario 5: Rejects general technical "Explain quantum computing basics."'
  );
  assert(
    !isPersonalQuery('Write a quicksort algorithm in Python'),
    'Rejects code generation request'
  );
  assert(
    !isPersonalQuery('How does photosynthesis work in plants?'),
    'Rejects scientific query'
  );
  assert(
    !isPersonalQuery('What is 25 * 40?'),
    'Rejects mathematical computation'
  );

  // 3. Multi-Turn Anaphora & Context Expansion
  console.log('\n--- 3. Multi-turn Anaphora & Context Expansion ---');
  const historyTurn = [{ role: 'user' as const, content: 'I met Ravi yesterday at the coffee shop.' }];
  const followUpQuery = 'What did we do?';
  
  assert(
    isPersonalQuery(followUpQuery, historyTurn),
    'Scenario 9A: Detects "What did we do?" with personal history as personal query'
  );

  const expandedQuery = buildSearchQuery(followUpQuery, historyTurn);
  assert(
    expandedQuery.includes('Ravi') && expandedQuery.includes('coffee shop') && expandedQuery.includes('What did we do?'),
    'Scenario 9B: Query expansion appends context from preceding user turn',
    `Got: "${expandedQuery}"`
  );

  // 4. Cosine Similarity & Vector Math Verification
  console.log('\n--- 4. Cosine Similarity & Vector Math Verification ---');
  const v1 = [1, 0, 0];
  const v2 = [1, 0, 0];
  const v3 = [0, 1, 0];
  const v4 = [0.7071, 0.7071, 0];

  assert(
    Math.abs(cosineSimilarity(v1, v2) - 1.0) < 0.001,
    'Cosine similarity of identical vectors is 1.0'
  );
  assert(
    Math.abs(cosineSimilarity(v1, v3) - 0.0) < 0.001,
    'Cosine similarity of orthogonal vectors is 0.0'
  );
  assert(
    Math.abs(cosineSimilarity(v1, v4) - 0.7071) < 0.01,
    'Cosine similarity of 45-degree vectors is ~0.707'
  );

  // 5. Zero vector and edge cases
  const vZero = [0, 0, 0];
  assert(
    cosineSimilarity(v1, vZero) === 0,
    'Handles zero vector gracefully without NaN or error'
  );
  assert(
    cosineSimilarity([], []) === 0,
    'Handles empty vector gracefully without error'
  );

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

runScenarioTests();
