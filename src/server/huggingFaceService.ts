/**
 * MEMORA AI — Hugging Face Reranker Service
 *
 * M.1.2.2
 *
 * Purpose:
 * - Rerank retrieved memories using a Hugging Face cross-encoder.
 * - Keep the API key strictly server-side.
 * - Never allow Hugging Face failure to break MEMORA RAG.
 * - Fall back to the original retrieval scores when reranking fails.
 */

export interface RerankInputItem {
  id: string;
  text: string;
  originalScore?: number;
}

export interface HuggingFaceRerankRequest {
  query: string;
  candidates: RerankInputItem[];
  topK?: number;
  minConfidence?: number;
}

export interface RerankedCandidateItem {
  id: string;
  text: string;
  relevanceScore: number;
  originalScore: number;
}

export interface HuggingFaceRerankResponse {
  success: boolean;
  model: string;
  reranked: RerankedCandidateItem[];
  latencyMs: number;
  fallbackUsed: boolean;
  error?: string;
}

const DEFAULT_MODEL =
  process.env.HUGGINGFACE_RERANKER_MODEL ||
  'cross-encoder/ms-marco-MiniLM-L-6-v2';

const MAX_QUERY_LENGTH = 512;
const MAX_CANDIDATES = 25;
const MAX_TEXT_LENGTH = 1000;
const TIMEOUT_MS = 1500;

/**
 * Removes control characters from user-provided text.
 *
 * Important:
 * This does NOT log or expose the original memory content.
 */
function sanitizeText(value: string, maxLength: number): string {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, maxLength)
    .trim();
}

/**
 * Normalize an arbitrary model score into [0, 1].
 */
function normalizeScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Return original candidates without calling Hugging Face.
 *
 * This is the main resilience mechanism of the service.
 */
function fallbackResponse(
  candidates: RerankInputItem[],
  model: string,
  startedAt: number,
  error?: string
): HuggingFaceRerankResponse {
  const reranked = candidates.map((candidate) => ({
    id: candidate.id,
    text: candidate.text,
    relevanceScore: normalizeScore(candidate.originalScore ?? 0),
    originalScore: normalizeScore(candidate.originalScore ?? 0),
  }));

  reranked.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    success: false,
    model,
    reranked,
    latencyMs: Date.now() - startedAt,
    fallbackUsed: true,
    error,
  };
}

/**
 * Extract a numeric relevance score from Hugging Face responses.
 *
 * Different inference configurations can return slightly different
 * response structures, so this function accepts the common formats.
 */
function extractScore(result: any): number | null {
  if (typeof result === 'number') {
    return result;
  }

  if (typeof result?.score === 'number') {
    return result.score;
  }

  if (Array.isArray(result) && typeof result[0] === 'number') {
    return result[0];
  }

  if (Array.isArray(result) && typeof result[0]?.score === 'number') {
    return result[0].score;
  }

  return null;
}

/**
 * Hugging Face Cross-Encoder Reranker
 */
export async function rerankCandidates(
  request: HuggingFaceRerankRequest
): Promise<HuggingFaceRerankResponse> {
  const startedAt = Date.now();

  const model = DEFAULT_MODEL;

  const query = sanitizeText(request.query, MAX_QUERY_LENGTH);

  const candidates = (request.candidates || [])
    .slice(0, MAX_CANDIDATES)
    .map((candidate) => ({
      id: String(candidate.id),
      text: sanitizeText(candidate.text, MAX_TEXT_LENGTH),
      originalScore: normalizeScore(candidate.originalScore ?? 0),
    }))
    .filter((candidate) => candidate.id && candidate.text);

  /**
   * Empty input:
   * No network request is made.
   */
  if (!query || candidates.length === 0) {
    return {
      success: true,
      model,
      reranked: [],
      latencyMs: Date.now() - startedAt,
      fallbackUsed: false,
    };
  }

  /**
   * API key is intentionally read only from the server environment.
   */
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  /**
   * Optional feature:
   * If no key exists, MEMORA continues using normal retrieval.
   */
  if (!apiKey) {
    return fallbackResponse(
      candidates,
      model,
      startedAt,
      'Hugging Face API key is not configured'
    );
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    /**
     * Hugging Face inference endpoint.
     */
    const endpoint =
      `https://router.huggingface.co/hf-inference/models/` +
      encodeURIComponent(model);

    /**
     * Cross-encoder input:
     *
     * query + candidate text
     */
    const inputs = candidates.map((candidate) => [
      query,
      candidate.text,
    ]);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'x-use-cache': 'false',
      },
      body: JSON.stringify({
        inputs,
      }),
      signal: controller.signal,
    });

    /**
     * Rate limit.
     */
    if (response.status === 429) {
      return fallbackResponse(
        candidates,
        model,
        startedAt,
        'Hugging Face rate limit reached'
      );
    }

    /**
     * Any other unsuccessful response.
     */
    if (!response.ok) {
      return fallbackResponse(
        candidates,
        model,
        startedAt,
        `Hugging Face request failed with HTTP ${response.status}`
      );
    }

    const data = await response.json();

    /**
     * Expected response:
     * One score for each candidate.
     */
    const results = Array.isArray(data) ? data : [];

    if (results.length !== candidates.length) {
      return fallbackResponse(
        candidates,
        model,
        startedAt,
        'Hugging Face returned an unexpected result count'
      );
    }

    const scores = results.map(extractScore);
    if (scores.some((score) => score === null)) {
      return fallbackResponse(
        candidates,
        model,
        startedAt,
        'Hugging Face returned malformed relevance scores'
      );
    }

    const reranked: RerankedCandidateItem[] = candidates.map(
      (candidate, index) => {
        const rawScore = scores[index] ?? 0;

        return {
          id: candidate.id,
          text: candidate.text,
          relevanceScore: normalizeScore(rawScore),
          originalScore: candidate.originalScore ?? 0,
        };
      }
    );

    /**
     * Highest relevance first.
     */
    reranked.sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );

    /**
     * Optional top-K filtering.
     */
    const topK =
      typeof request.topK === 'number' && request.topK > 0
        ? Math.floor(request.topK)
        : reranked.length;

    const minConfidence =
      typeof request.minConfidence === 'number'
        ? normalizeScore(request.minConfidence)
        : 0;

    const filtered = reranked
      .filter((item) => item.relevanceScore >= minConfidence)
      .slice(0, topK);

    return {
      success: true,
      model,
      reranked: filtered,
      latencyMs: Date.now() - startedAt,
      fallbackUsed: false,
    };
  } catch (error: any) {
    /**
     * Timeout, network failure, model loading failure,
     * or unexpected errors must never break RAG.
     */
    const errorMessage =
      error?.name === 'AbortError'
        ? 'Hugging Face request timed out'
        : 'Hugging Face reranking failed';

    return fallbackResponse(
      candidates,
      model,
      startedAt,
      errorMessage
    );
  } finally {
    clearTimeout(timeout);
  }
}
