import type { Firestore } from 'firebase-admin/firestore';
import {
  SemanticMemoryResult,
  TemporalEvidence,
  TemporalPrecision,
  TemporalStatus,
  MemoryCategory
} from '../types';
import {
  MONTH_NAMES,
  parseDateParts,
  formatCalendarDate,
  shiftCalendarDays,
  formatTimelineDisplayDate,
  pad2
} from './temporalService';

/**
 * Result of lightweight temporal query analysis
 */
export interface TemporalQueryAnalysis {
  isTemporal: boolean;
  temporalType?:
    | 'exact'
    | 'relative_day'
    | 'relative_week'
    | 'relative_month'
    | 'month'
    | 'year'
    | 'range'
    | 'approximate'
    | 'when_question'
    | 'inherited';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  description?: string;
  referenceDate: string; // ISO string
  inheritedFromHistory?: boolean;
  targetKeywords?: string[];
  rawTemporalExpression?: string;
}

export interface TemporalRetrievalParams {
  adminDb: Firestore;
  userId: string;
  query: string;
  analysis?: TemporalQueryAnalysis;
  conversationHistory?: { role: string; content: string }[];
  referenceDate?: string;
  maxResults?: number;
}

export interface TemporalRetrievalResult {
  memories: SemanticMemoryResult[];
  temporalEvidence: TemporalEvidence[];
  isTemporalRelevant: boolean;
  temporalScope?: {
    startDate?: string;
    endDate?: string;
    description?: string;
    isTemporalQuery: boolean;
  };
  totalTimelineMatches: number;
}

/**
 * Helper to get the last day of a month
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Extract target keywords (entity names, topic nouns) from query for multi-dimensional retrieval
 */
export function extractTargetKeywords(query: string): string[] {
  const clean = query
    .toLowerCase()
    .replace(/[?.!,;:'"()]/g, ' ')
    .trim();

  const stopWords = new Set([
    'what', 'when', 'where', 'who', 'why', 'how',
    'did', 'do', 'does', 'doing', 'done',
    'i', 'me', 'my', 'myself', 'we', 'our', 'us',
    'was', 'were', 'is', 'am', 'are', 'been', 'being',
    'have', 'has', 'had',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'from', 'with', 'about', 'between',
    'yesterday', 'today', 'tomorrow', 'week', 'month', 'year', 'last', 'this', 'next', 'past',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
    'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
    'time', 'first', 'happened', 'record', 'recorded', 'remember', 'tell', 'show'
  ]);

  const words = clean.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
  return Array.from(new Set(words));
}

/**
 * Lightweight deterministic temporal query detection.
 * Analyzes whether query contains temporal intent, extracts date windows,
 * and handles multi-turn temporal inheritance.
 */
export function detectTemporalIntent(
  query: string,
  conversationHistory?: { role: string; content: string }[],
  referenceDateInput?: string
): TemporalQueryAnalysis {
  const refDateStr = referenceDateInput || new Date().toISOString();
  const ref = parseDateParts(refDateStr);

  if (!query || typeof query !== 'string') {
    return { isTemporal: false, referenceDate: refDateStr };
  }

  const lower = query.trim().toLowerCase();

  // 1. Guard against general technical / coding questions with no personal context
  const isGeneralQuestion = /^(what is|explain|define|how does|write a|write code|code a|implement)\b/i.test(lower);
  const hasFirstPerson = /\b(i|my|me|we|our|us)\b/i.test(lower);
  if (isGeneralQuestion && !hasFirstPerson) {
    return { isTemporal: false, referenceDate: refDateStr };
  }

  // 2. Identify "When did I..." or "When was the last time..." questions
  const isWhenQuestion = /\b(when did i|when was the last time|when did we|what date did i|what time did i|when have i|when did)\b/i.test(lower);
  if (isWhenQuestion) {
    const keywords = extractTargetKeywords(query);
    return {
      isTemporal: true,
      temporalType: 'when_question',
      description: 'Temporal inquiry asking for specific date or time',
      referenceDate: refDateStr,
      targetKeywords: keywords,
      rawTemporalExpression: 'when'
    };
  }

  // 3. Approximate temporal: "around last month", "around the beginning of September"
  const approxPattern = /\baround\s+(?:the\s+)?(beginning|start|middle|end)\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?\b/i;
  const approxMatch = lower.match(approxPattern);
  if (approxMatch) {
    const pos = approxMatch[1];
    const m = MONTH_NAMES[approxMatch[2]];
    const y = approxMatch[3] ? parseInt(approxMatch[3], 10) : ref.year;
    if (m) {
      let sDay = 1;
      let eDay = 10;
      if (pos === 'middle') {
        sDay = 11;
        eDay = 20;
      } else if (pos === 'end') {
        sDay = 21;
        eDay = getLastDayOfMonth(y, m);
      }
      const sDate = formatCalendarDate(y, m, sDay);
      const eDate = formatCalendarDate(y, m, eDay);
      return {
        isTemporal: true,
        temporalType: 'approximate',
        startDate: sDate,
        endDate: eDate,
        description: `Around the ${pos} of ${approxMatch[2]} ${y}`,
        referenceDate: refDateStr,
        targetKeywords: extractTargetKeywords(query),
        rawTemporalExpression: approxMatch[0]
      };
    }
  }

  // 4. Date Ranges: "between September 1 and September 15", "from September 10 to September 13"
  const rangePattern = /\b(?:between|from)\s+(?:the\s+)?([A-Za-z]+|\d{1,2}(?:st|nd|rd|th)?)\s+(\d{1,2}(?:st|nd|rd|th)?|[A-Za-z]+)(?:,?\s*(\d{4}))?\s+(?:and|to|until|-|through)\s+(?:the\s+)?([A-Za-z]+|\d{1,2}(?:st|nd|rd|th)?)\s+(\d{1,2}(?:st|nd|rd|th)?|[A-Za-z]+)(?:,?\s*(\d{4}))?\b/i;
  const rangeMatch = lower.match(rangePattern);
  if (rangeMatch) {
    const parsePart = (tok1: string, tok2: string, yrTok?: string) => {
      let m = 0;
      let d = 0;
      const c1 = tok1.replace(/(st|nd|rd|th)$/, '');
      const c2 = tok2.replace(/(st|nd|rd|th)$/, '');
      if (MONTH_NAMES[c1]) {
        m = MONTH_NAMES[c1];
        d = parseInt(c2, 10);
      } else if (MONTH_NAMES[c2]) {
        m = MONTH_NAMES[c2];
        d = parseInt(c1, 10);
      }
      const y = yrTok ? parseInt(yrTok, 10) : ref.year;
      return { year: y, month: m, day: d };
    };

    const p1 = parsePart(rangeMatch[1], rangeMatch[2], rangeMatch[3]);
    const p2 = parsePart(rangeMatch[4], rangeMatch[5], rangeMatch[6] || rangeMatch[3]);

    if (p1.month && p1.day && p2.month && p2.day) {
      const sDate = formatCalendarDate(p1.year, p1.month, p1.day);
      const eDate = formatCalendarDate(p2.year, p2.month, p2.day);
      return {
        isTemporal: true,
        temporalType: 'range',
        startDate: sDate,
        endDate: eDate,
        description: `Range: ${sDate} to ${eDate}`,
        referenceDate: refDateStr,
        targetKeywords: extractTargetKeywords(query),
        rawTemporalExpression: rangeMatch[0]
      };
    }
  }

  // 5. Exact date expressions: "September 20, 2026", "2026-09-20", "September 10", "10th of September"
  // Format: "September 20, 2026" or "September 20"
  const exactMonthDayPattern = /\b(on\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i;
  const exactMatch = lower.match(exactMonthDayPattern);
  if (exactMatch) {
    const m = MONTH_NAMES[exactMatch[2]];
    const d = parseInt(exactMatch[3], 10);
    const y = exactMatch[4] ? parseInt(exactMatch[4], 10) : ref.year;
    if (m && d >= 1 && d <= 31) {
      const dateStr = formatCalendarDate(y, m, d);
      return {
        isTemporal: true,
        temporalType: 'exact',
        startDate: dateStr,
        endDate: dateStr,
        description: `Exact date: ${dateStr}`,
        referenceDate: refDateStr,
        targetKeywords: extractTargetKeywords(query),
        rawTemporalExpression: exactMatch[0]
      };
    }
  }

  // 6. Relative days: "yesterday", "today", "tomorrow", "N days ago"
  if (/\byesterday\b/i.test(lower)) {
    const yest = shiftCalendarDays(ref.year, ref.month, ref.day, -1);
    const dStr = formatCalendarDate(yest.year, yest.month, yest.day);
    return {
      isTemporal: true,
      temporalType: 'relative_day',
      startDate: dStr,
      endDate: dStr,
      description: `Yesterday (${dStr})`,
      referenceDate: refDateStr,
      targetKeywords: extractTargetKeywords(query),
      rawTemporalExpression: 'yesterday'
    };
  }

  if (/\btoday\b/i.test(lower)) {
    const dStr = formatCalendarDate(ref.year, ref.month, ref.day);
    return {
      isTemporal: true,
      temporalType: 'relative_day',
      startDate: dStr,
      endDate: dStr,
      description: `Today (${dStr})`,
      referenceDate: refDateStr,
      targetKeywords: extractTargetKeywords(query),
      rawTemporalExpression: 'today'
    };
  }

  if (/\btomorrow\b/i.test(lower)) {
    const tom = shiftCalendarDays(ref.year, ref.month, ref.day, 1);
    const dStr = formatCalendarDate(tom.year, tom.month, tom.day);
    return {
      isTemporal: true,
      temporalType: 'relative_day',
      startDate: dStr,
      endDate: dStr,
      description: `Tomorrow (${dStr})`,
      referenceDate: refDateStr,
      targetKeywords: extractTargetKeywords(query),
      rawTemporalExpression: 'tomorrow'
    };
  }

  // 6. Relative weeks: "last week", "this week", "next week", "past week"
  if (/\b(last week|past week)\b/i.test(lower)) {
    // 7 days before up to 1 day before
    const startObj = shiftCalendarDays(ref.year, ref.month, ref.day, -7);
    const endObj = shiftCalendarDays(ref.year, ref.month, ref.day, -1);
    const sDate = formatCalendarDate(startObj.year, startObj.month, startObj.day);
    const eDate = formatCalendarDate(endObj.year, endObj.month, endObj.day);
    return {
      isTemporal: true,
      temporalType: 'relative_week',
      startDate: sDate,
      endDate: eDate,
      description: `Last week (${sDate} to ${eDate})`,
      referenceDate: refDateStr,
      targetKeywords: extractTargetKeywords(query),
      rawTemporalExpression: 'last week'
    };
  }

  if (/\b(this week|current week)\b/i.test(lower)) {
    const startObj = shiftCalendarDays(ref.year, ref.month, ref.day, -3);
    const endObj = shiftCalendarDays(ref.year, ref.month, ref.day, 3);
    const sDate = formatCalendarDate(startObj.year, startObj.month, startObj.day);
    const eDate = formatCalendarDate(endObj.year, endObj.month, endObj.day);
    return {
      isTemporal: true,
      temporalType: 'relative_week',
      startDate: sDate,
      endDate: eDate,
      description: `This week (${sDate} to ${eDate})`,
      referenceDate: refDateStr,
      targetKeywords: extractTargetKeywords(query),
      rawTemporalExpression: 'this week'
    };
  }

  if (/\b(next week)\b/i.test(lower)) {
    const startObj = shiftCalendarDays(ref.year, ref.month, ref.day, 1);
    const endObj = shiftCalendarDays(ref.year, ref.month, ref.day, 7);
    const sDate = formatCalendarDate(startObj.year, startObj.month, startObj.day);
    const eDate = formatCalendarDate(endObj.year, endObj.month, endObj.day);
    return {
      isTemporal: true,
      temporalType: 'relative_week',
      startDate: sDate,
      endDate: eDate,
      description: `Next week (${sDate} to ${eDate})`,
      referenceDate: refDateStr,
      targetKeywords: extractTargetKeywords(query),
      rawTemporalExpression: 'next week'
    };
  }

  // 7. Relative month: "last month", "this month", "past month"
  if (/\b(last month|past month)\b/i.test(lower)) {
    let prevM = ref.month - 1;
    let prevY = ref.year;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    const lastD = getLastDayOfMonth(prevY, prevM);
    const sDate = formatCalendarDate(prevY, prevM, 1);
    const eDate = formatCalendarDate(prevY, prevM, lastD);
    return {
      isTemporal: true,
      temporalType: 'relative_month',
      startDate: sDate,
      endDate: eDate,
      description: `Last month (${sDate} to ${eDate})`,
      referenceDate: refDateStr,
      targetKeywords: extractTargetKeywords(query),
      rawTemporalExpression: 'last month'
    };
  }

  if (/\b(this month)\b/i.test(lower)) {
    const lastD = getLastDayOfMonth(ref.year, ref.month);
    const sDate = formatCalendarDate(ref.year, ref.month, 1);
    const eDate = formatCalendarDate(ref.year, ref.month, lastD);
    return {
      isTemporal: true,
      temporalType: 'month',
      startDate: sDate,
      endDate: eDate,
      description: `This month (${sDate} to ${eDate})`,
      referenceDate: refDateStr,
      targetKeywords: extractTargetKeywords(query),
      rawTemporalExpression: 'this month'
    };
  }

  // 8. Month-level queries: "in September", "during August", "in August 2026", "what happened in September"
  const monthPattern = /\b(?:in|during|for|throughout|around)\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?\b/i;
  const monthMatch = lower.match(monthPattern);
  if (monthMatch) {
    const m = MONTH_NAMES[monthMatch[1]];
    const y = monthMatch[2] ? parseInt(monthMatch[2], 10) : ref.year;
    if (m) {
      const lastD = getLastDayOfMonth(y, m);
      const sDate = formatCalendarDate(y, m, 1);
      const eDate = formatCalendarDate(y, m, lastD);
      return {
        isTemporal: true,
        temporalType: 'month',
        startDate: sDate,
        endDate: eDate,
        description: `${monthMatch[1]} ${y} (${sDate} to ${eDate})`,
        referenceDate: refDateStr,
        targetKeywords: extractTargetKeywords(query),
        rawTemporalExpression: monthMatch[0]
      };
    }
  }

  // 9. Year-level queries: "in 2024", "in 2026", "what happened in 2025"
  const yearPattern = /\b(?:in|during|throughout)\s+(20\d{2})\b/i;
  const yearMatch = lower.match(yearPattern);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    const sDate = formatCalendarDate(y, 1, 1);
    const eDate = formatCalendarDate(y, 12, 31);
    return {
      isTemporal: true,
      temporalType: 'year',
      startDate: sDate,
      endDate: eDate,
      description: `Year ${y} (${sDate} to ${eDate})`,
      referenceDate: refDateStr,
      targetKeywords: extractTargetKeywords(query),
      rawTemporalExpression: yearMatch[0]
    };
  }

  // 10. Multi-turn Temporal Inheritance (Section 7)
  // Example:
  // User: "What did I do last week?"
  // Assistant answers.
  // User: "What about Ravi?" or "What about my portfolio?" or "And when did I start it?"
  if (conversationHistory && conversationHistory.length > 0) {
    const isFollowUpPattern = /^(what about|how about|and what about|did i meet|who did i meet|and|what did i do with)\b/i.test(lower);
    const isShortQuery = lower.split(/\s+/).length <= 5;

    if (isFollowUpPattern || isShortQuery) {
      // Look back through conversation history to find the most recent temporal query from user
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const item = conversationHistory[i];
        if (item && item.role === 'user' && item.content) {
          const prevAnalysis = detectTemporalIntent(item.content, undefined, refDateStr);
          if (prevAnalysis.isTemporal && (prevAnalysis.startDate || prevAnalysis.temporalType === 'when_question')) {
            // Inherit the temporal window
            return {
              isTemporal: true,
              temporalType: 'inherited',
              startDate: prevAnalysis.startDate,
              endDate: prevAnalysis.endDate,
              description: `Inherited context from previous turn: ${prevAnalysis.description || 'timeframe'}`,
              referenceDate: refDateStr,
              inheritedFromHistory: true,
              targetKeywords: extractTargetKeywords(query),
              rawTemporalExpression: prevAnalysis.rawTemporalExpression
            };
          }
        }
      }
    }
  }

  return {
    isTemporal: false,
    referenceDate: refDateStr,
    targetKeywords: extractTargetKeywords(query)
  };
}

/**
 * Dedicated Temporal Retrieval Service
 * Queries user-isolated memories using existing A10.1 timeline index.
 * Supports exact date, ranges, multi-dimensional filtering, and temporal absence.
 */
export async function retrieveTemporalMemories(
  params: TemporalRetrievalParams
): Promise<TemporalRetrievalResult> {
  const {
    adminDb,
    userId,
    query,
    conversationHistory,
    referenceDate,
    maxResults = 8
  } = params;

  const analysis = params.analysis || detectTemporalIntent(query, conversationHistory, referenceDate);

  if (!analysis.isTemporal) {
    return {
      memories: [],
      temporalEvidence: [],
      isTemporalRelevant: false,
      totalTimelineMatches: 0
    };
  }

  try {
    // 1. Query user's memories (strictly user-isolated via userId == userId)
    const snapshot = await adminDb
      .collection('memories')
      .where('userId', '==', userId)
      .get();

    if (snapshot.empty) {
      return {
        memories: [],
        temporalEvidence: [],
        isTemporalRelevant: true,
        temporalScope: {
          startDate: analysis.startDate,
          endDate: analysis.endDate,
          description: analysis.description,
          isTemporalQuery: true
        },
        totalTimelineMatches: 0
      };
    }

    const matchedMemories: Array<{
      memory: SemanticMemoryResult;
      evidence: TemporalEvidence;
      score: number;
    }> = [];

    const targetKeywords = analysis.targetKeywords || extractTargetKeywords(query);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const content = String(data.content || '');
      const lowerContent = content.toLowerCase();

      // Read temporal metadata from memory
      const eventStartAt = data.eventStartAt || data.temporal?.eventStartAt || null;
      const eventEndAt = data.eventEndAt || data.temporal?.eventEndAt || null;
      const precision: TemporalPrecision = data.temporalPrecision || data.temporal?.precision || 'unknown';
      const status: TemporalStatus = data.temporalStatus || data.temporal?.status || 'past';
      const isEstimated = Boolean(data.isEstimated || data.temporal?.isEstimated);
      const createdAt = data.created_at || data.createdAt || '';

      // Skip unknown dates if the query is strictly looking for a specific timeframe
      if (analysis.startDate && analysis.endDate) {
        if (!eventStartAt) {
          continue;
        }

        // Check if event falls within query window [startDate, endDate]
        let inWindow = false;

        if (eventEndAt) {
          // Range overlap: [eventStartAt, eventEndAt] overlaps [startDate, endDate]
          if (eventStartAt <= analysis.endDate && eventEndAt >= analysis.startDate) {
            inWindow = true;
          }
        } else {
          // Single date or month/year precision
          if (precision === 'month') {
            // Memory is month-level (e.g. 2026-08-01). Check if month overlaps
            const memMonth = eventStartAt.substring(0, 7);
            const qStartMonth = analysis.startDate.substring(0, 7);
            const qEndMonth = analysis.endDate.substring(0, 7);
            if (memMonth >= qStartMonth && memMonth <= qEndMonth) {
              inWindow = true;
            }
          } else if (precision === 'year') {
            const memYear = eventStartAt.substring(0, 4);
            const qStartYear = analysis.startDate.substring(0, 4);
            const qEndYear = analysis.endDate.substring(0, 4);
            if (memYear >= qStartYear && memYear <= qEndYear) {
              inWindow = true;
            }
          } else {
            // Day level or approximate
            if (eventStartAt >= analysis.startDate && eventStartAt <= analysis.endDate) {
              inWindow = true;
            }
          }
        }

        if (!inWindow) {
          continue;
        }
      }

      // Check multi-dimensional keywords if present (e.g., person name "Ravi", project "portfolio")
      let keywordScoreBonus = 0;
      if (targetKeywords.length > 0) {
        const matchesKeyword = targetKeywords.some(kw => lowerContent.includes(kw));
        if (matchesKeyword) {
          keywordScoreBonus = 0.08;
        } else if (analysis.temporalType === 'when_question') {
          // If query is "when did I meet Ravi", memory MUST mention Ravi
          continue;
        }
      }

      // Calculate confidence / relevance score
      let baseScore = 0.88;
      if (analysis.temporalType === 'exact') baseScore = 0.94;
      else if (analysis.temporalType === 'relative_day') baseScore = 0.93;
      else if (analysis.temporalType === 'range') baseScore = 0.90;
      else if (analysis.temporalType === 'when_question') baseScore = 0.92;

      const finalScore = Math.min(0.99, Number((baseScore + keywordScoreBonus).toFixed(4)));

      const display = formatTimelineDisplayDate(eventStartAt, eventEndAt, precision, isEstimated);

      const temporalEvidenceItem: TemporalEvidence = {
        memoryId: doc.id,
        eventStartAt,
        eventEndAt,
        precision,
        status,
        isEstimated,
        sourceText: content,
        displayDate: display.displayDate,
        formattedPrecision: display.formattedPrecision,
        timeframeDescription: analysis.description
      };

      const semanticMemResult: SemanticMemoryResult = {
        memoryId: doc.id,
        text: content,
        category: (data.category as MemoryCategory) || 'Personal',
        score: finalScore,
        date: display.displayDate || data.date || createdAt,
        createdAt,
        updatedAt: data.updated_at || data.updatedAt
      };

      matchedMemories.push({
        memory: semanticMemResult,
        evidence: temporalEvidenceItem,
        score: finalScore
      });
    }

    // Sort matching memories:
    // If "when did I start..." -> sort ascending by eventStartAt
    // If "when was the last time..." -> sort descending by eventStartAt
    // Otherwise -> sort by score descending, then eventStartAt descending
    const isFirstTime = /\b(first time|start|started|begin|began)\b/i.test(query);
    const isLastTime = /\b(last time|latest|most recent)\b/i.test(query);

    if (isFirstTime) {
      matchedMemories.sort((a, b) => (a.evidence.eventStartAt || '').localeCompare(b.evidence.eventStartAt || ''));
    } else if (isLastTime) {
      matchedMemories.sort((a, b) => (b.evidence.eventStartAt || '').localeCompare(a.evidence.eventStartAt || ''));
    } else {
      matchedMemories.sort((a, b) => {
        if (Math.abs(b.score - a.score) > 0.01) {
          return b.score - a.score;
        }
        return (b.evidence.eventStartAt || '').localeCompare(a.evidence.eventStartAt || '');
      });
    }

    const limited = matchedMemories.slice(0, maxResults);

    return {
      memories: limited.map(m => m.memory),
      temporalEvidence: limited.map(m => m.evidence),
      isTemporalRelevant: true,
      temporalScope: {
        startDate: analysis.startDate,
        endDate: analysis.endDate,
        description: analysis.description,
        isTemporalQuery: true
      },
      totalTimelineMatches: matchedMemories.length
    };
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn(`[TemporalRetrieval] Error querying memories for user ${userId}:`, err?.message || err);
    }
    // Failure resilience: Graceful fallback so chat remains usable
    return {
      memories: [],
      temporalEvidence: [],
      isTemporalRelevant: true,
      temporalScope: {
        startDate: analysis.startDate,
        endDate: analysis.endDate,
        description: analysis.description,
        isTemporalQuery: true
      },
      totalTimelineMatches: 0
    };
  }
}
