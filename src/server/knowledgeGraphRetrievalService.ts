import { Firestore } from 'firebase-admin/firestore';
import {
  KnowledgeEntity,
  KnowledgeRelationship,
  GraphEvidence,
  GraphRetrievalResult,
  SemanticMemoryResult
} from '../types';
import {
  getUserEntities,
  getUserRelationships,
  normalizeEntityName,
  normalizeRelation,
  SELF_ENTITY_ID
} from './knowledgeGraphService';
import { isPersonalQuery } from './semanticRetrievalService';

export interface GraphRetrievalOptions {
  maxEntities?: number;
  maxRelationships?: number;
  maxSupportingMemories?: number;
}

const DEFAULT_OPTIONS: Required<GraphRetrievalOptions> = {
  maxEntities: 10,
  maxRelationships: 20,
  maxSupportingMemories: 10
};

/**
 * Resolves natural language entity mentions in a query (and recent conversation history)
 * against the user's stored knowledge entities.
 * STRICTLY READ-ONLY: Never creates, updates, or deletes graph entities.
 */
export function resolveEntitiesFromQuery(
  query: string,
  userEntities: KnowledgeEntity[],
  history?: { role: string; content: string }[]
): {
  matchedEntities: KnowledgeEntity[];
  detectedPronounContext?: string;
} {
  if (!userEntities || userEntities.length === 0) {
    return { matchedEntities: [] };
  }

  const cleanQuery = query.toLowerCase();
  const normalizedQuery = normalizeEntityName(cleanQuery);
  const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 1);

  const matchedEntitiesMap = new Map<string, KnowledgeEntity>();

  // 1. Direct entity name & alias matching against query
  for (const entity of userEntities) {
    if (entity.entityId === SELF_ENTITY_ID) continue;

    const normName = normalizeEntityName(entity.name);
    if (!normName) continue;

    // Check exact name match or boundary match in query
    const nameRegex = new RegExp(`\\b${normName}\\b`, 'i');
    if (nameRegex.test(cleanQuery) || cleanQuery.includes(normName)) {
      matchedEntitiesMap.set(entity.entityId, entity);
      continue;
    }

    // Check aliases
    if (Array.isArray(entity.aliases)) {
      for (const alias of entity.aliases) {
        const normAlias = normalizeEntityName(alias);
        if (normAlias && (new RegExp(`\\b${normAlias}\\b`, 'i').test(cleanQuery) || cleanQuery.includes(normAlias))) {
          matchedEntitiesMap.set(entity.entityId, entity);
          break;
        }
      }
    }
  }

  // 2. Multi-turn anaphora/pronoun resolution:
  // If the query contains pronouns (he, him, she, her, they, them, that place, etc.) or "what about...",
  // inspect the latest turns of conversation history to resolve the subject.
  const hasPronounOrFollowUp =
    /\b(he|him|his|she|her|hers|they|them|their|that person|this person|that place|that city|that company|him\?|her\?)\b/i.test(cleanQuery) ||
    /^(what about|how about|tell me more about|who is (he|she|that)|what relationship)\b/i.test(cleanQuery.trim());

  let detectedPronounContext: string | undefined = undefined;

  if (hasPronounOrFollowUp && Array.isArray(history) && history.length > 0) {
    const recentTurns = history.slice(-4);
    for (let i = recentTurns.length - 1; i >= 0; i--) {
      const turnContent = (recentTurns[i].content || '').toLowerCase();
      for (const entity of userEntities) {
        if (entity.entityId === SELF_ENTITY_ID) continue;
        const normName = normalizeEntityName(entity.name);
        if (normName && new RegExp(`\\b${normName}\\b`, 'i').test(turnContent)) {
          matchedEntitiesMap.set(entity.entityId, entity);
          detectedPronounContext = entity.name;
          break;
        }
      }
      if (detectedPronounContext) break;
    }
  }

  return {
    matchedEntities: Array.from(matchedEntitiesMap.values()),
    detectedPronounContext
  };
}

/**
 * Extracts relationship intent keywords from natural language queries.
 */
function extractRelationIntents(query: string): string[] {
  const q = query.toLowerCase();
  const intents: string[] = [];

  // Met / Meetings
  if (/\b(met|meet|meeting|hangout|hung out|saw|seen)\b/i.test(q)) {
    intents.push('met');
  }

  // College friend / friends
  if (/\b(college friend|college friends|former college friend)\b/i.test(q)) {
    intents.push('college_friend');
  } else if (/\b(friends?|friendship|buddies|buddy)\b/i.test(q)) {
    // Relationship-specific lookup: only explicit friend relations
    intents.push('college_friend', 'friend', 'former_friend');
  }

  // Work / Colleagues / Jobs
  if (/\b(work with|worked with|works with|working with|colleague|colleagues|coworker|coworkers)\b/i.test(q)) {
    intents.push('worked_with', 'works_with', 'colleague');
  } else if (/\b(work at|works at|worked at|working at|job at|employed at|works for|working for)\b/i.test(q) || /\b(where does|where do|where did).*(work|job)/i.test(q)) {
    intents.push('works_at', 'worked_at');
  } else if (/\b(work|works|worked|job)\b/i.test(q)) {
    intents.push('works_at', 'worked_at', 'worked_with', 'works_with');
  }

  // Travel / Visited
  if (/\b(visit|visited|visiting|traveled to|travelled to|went to|trip to)\b/i.test(q)) {
    intents.push('visited', 'traveled_to');
  }

  // Family & Other explicit relations
  if (/\b(brother|brothers)\b/i.test(q)) intents.push('brother');
  if (/\b(sister|sisters)\b/i.test(q)) intents.push('sister');
  if (/\b(father|dad)\b/i.test(q)) intents.push('father');
  if (/\b(mother|mom)\b/i.test(q)) intents.push('mother');
  if (/\b(roommate|roommates)\b/i.test(q)) intents.push('roommate');
  if (/\b(manager|lead|boss)\b/i.test(q)) intents.push('manager');
  if (/\b(mentor|mentors)\b/i.test(q)) intents.push('mentor');

  return intents;
}

/**
 * Core Graph Retrieval Service for A9.2.
 * Identifies relevant entities and relationships, gathers provenance memory IDs,
 * resolves supporting memories from Firestore, and constructs structured GraphEvidence.
 *
 * GUARANTEES:
 * 1. STRICTLY READ-ONLY: Never writes or alters graph documents.
 * 2. USER ISOLATION: All Firestore queries are strictly scoped to the authenticated userId.
 * 3. ANTI-INFERENCE: Only retrieves explicit graph edges. Never infers friendships from "met" or "worked_with".
 * 4. RELATIONSHIP DIRECTION: Respects sourceEntityId and targetEntityId semantics.
 * 5. PROVENANCE-GROUNDED: Returns actual confirmed Memories supporting the graph edges.
 */
export async function retrieveGraphEvidence(params: {
  adminDb: Firestore;
  userId: string;
  query: string;
  conversationHistory?: { role: string; content: string }[];
  options?: GraphRetrievalOptions;
}): Promise<GraphRetrievalResult> {
  const { adminDb, userId, query, conversationHistory, options } = params;

  const maxEntities = options?.maxEntities ?? DEFAULT_OPTIONS.maxEntities;
  const maxRelationships = options?.maxRelationships ?? DEFAULT_OPTIONS.maxRelationships;
  const maxSupportingMemories = options?.maxSupportingMemories ?? DEFAULT_OPTIONS.maxSupportingMemories;

  const emptyResult: GraphRetrievalResult = {
    query,
    entities: [],
    relationships: [],
    evidence: [],
    supportingMemories: [],
    isGraphRelevant: false
  };

  if (!query || typeof query !== 'string' || !userId) {
    return emptyResult;
  }

  // Stage 1: Relevance Gating for Graph Retrieval
  // General technical questions (e.g. "What is Python?", "Explain recursion") do NOT trigger graph retrieval.
  const isPersonal = isPersonalQuery(query, conversationHistory);
  if (!isPersonal) {
    return emptyResult;
  }

  try {
    // Stage 2: Fetch all user's knowledge entities and relationships (bounded to this user)
    let allEntities: KnowledgeEntity[] = [];
    let allRelationships: KnowledgeRelationship[] = [];
    try {
      const results = await Promise.all([
        getUserEntities(adminDb, userId),
        getUserRelationships(adminDb, userId)
      ]);
      allEntities = results[0] || [];
      allRelationships = results[1] || [];
    } catch (fetchErr: any) {
      allEntities = [];
      allRelationships = [];
    }

    if (allEntities.length === 0 && allRelationships.length === 0) {
      return { ...emptyResult, isGraphRelevant: true };
    }

    // Build entity lookup map
    const entityMap = new Map<string, KnowledgeEntity>();
    for (const ent of allEntities) {
      entityMap.set(ent.entityId, ent);
    }

    // Stage 3: Entity Resolution
    const { matchedEntities, detectedPronounContext } = resolveEntitiesFromQuery(
      query,
      allEntities,
      conversationHistory
    );

    const relationIntents = extractRelationIntents(query);

    // Identify if this query is a relationship query without specific entity (e.g. "Who did I meet?", "Who are my college friends?")
    const isGenericRelationshipQuery =
      relationIntents.length > 0 &&
      /\b(who|whom|what people|anyone|everyone|which people|where)\b/i.test(query);

    // If no entities matched and no relationship intent found, return empty
    if (matchedEntities.length === 0 && !isGenericRelationshipQuery) {
      return { ...emptyResult, isGraphRelevant: true };
    }

    const matchedEntityIds = new Set(matchedEntities.map(e => e.entityId));

    // Stage 4: Filter Relationships based on Query Patterns
    const candidateRelationships: KnowledgeRelationship[] = [];
    const lowerQuery = query.toLowerCase();

    // Check specific directional patterns
    const isAskingAboutCompanyOrPlaceWorksAt = /\b(where does|where do|who works at|what company does)\b/i.test(lowerQuery);
    const isAskingWhoWorksWith = /\b(who works with|who worked with|who is working with)\b/i.test(lowerQuery);

    for (const rel of allRelationships) {
      if (candidateRelationships.length >= maxRelationships) break;

      const sourceMatches = matchedEntityIds.has(rel.sourceEntityId);
      const targetMatches = matchedEntityIds.has(rel.targetEntityId);
      const relNormalized = rel.relation.toLowerCase();

      // Pattern 1: Entity Lookup ("What do I know about Ravi?")
      if (matchedEntityIds.size > 0 && (sourceMatches || targetMatches)) {
        // If relation intents were also specified (e.g. "Who works with Ravi?"), enforce relation filter
        if (relationIntents.length > 0) {
          const matchesIntent = relationIntents.some(intent =>
            relNormalized === intent || relNormalized.includes(intent) || intent.includes(relNormalized)
          );
          if (matchesIntent) {
            candidateRelationships.push(rel);
            continue;
          }
        } else {
          // General entity query -> include relationships involving the entity
          candidateRelationships.push(rel);
          continue;
        }
      }

      // Pattern 2 & 4: Relationship lookup & Relationship-specific lookup
      // E.g. "Who did I meet?" (relation == 'met', source == 'self')
      // E.g. "Who are my college friends?" (relation == 'college_friend', source == 'self')
      if (rel.sourceEntityId === SELF_ENTITY_ID && relationIntents.length > 0) {
        const matchesIntent = relationIntents.some(intent =>
          relNormalized === intent || relNormalized.includes(intent) || intent.includes(relNormalized)
        );
        if (matchesIntent) {
          candidateRelationships.push(rel);
          continue;
        }
      }

      // Pattern 3: Reverse relationship lookup
      // E.g. "Who works at Google?" where Google is the targetEntityId and relation is 'works_at'
      if (isAskingAboutCompanyOrPlaceWorksAt && targetMatches && (relNormalized === 'works_at' || relNormalized === 'worked_at')) {
        candidateRelationships.push(rel);
        continue;
      }

      // Pattern 5: Place / entity relationship (e.g. "Who did I meet in Hyderabad?")
      // If a place entity matches, and this relationship is linked to the same memory provenance
      if (matchedEntities.some(e => e.type === 'place' && (e.entityId === rel.targetEntityId || e.entityId === rel.sourceEntityId))) {
        candidateRelationships.push(rel);
        continue;
      }
    }

    // Deduplicate candidate relationships by relationshipId
    const dedupedRelationshipsMap = new Map<string, KnowledgeRelationship>();
    for (const rel of candidateRelationships) {
      dedupedRelationshipsMap.set(rel.relationshipId, rel);
    }
    const finalRelationships = Array.from(dedupedRelationshipsMap.values()).slice(0, maxRelationships);

    // Also include any newly referenced entities from relationships into finalEntities list
    const finalEntitiesMap = new Map<string, KnowledgeEntity>();
    for (const ent of matchedEntities.slice(0, maxEntities)) {
      finalEntitiesMap.set(ent.entityId, ent);
    }
    for (const rel of finalRelationships) {
      if (rel.sourceEntityId !== SELF_ENTITY_ID && entityMap.has(rel.sourceEntityId)) {
        finalEntitiesMap.set(rel.sourceEntityId, entityMap.get(rel.sourceEntityId)!);
      }
      if (rel.targetEntityId !== SELF_ENTITY_ID && entityMap.has(rel.targetEntityId)) {
        finalEntitiesMap.set(rel.targetEntityId, entityMap.get(rel.targetEntityId)!);
      }
    }
    const finalEntities = Array.from(finalEntitiesMap.values()).slice(0, maxEntities);

    // Stage 5: Recover Memory Provenance (Graph -> Memory)
    // Collect all source memory IDs
    const memoryIdsSet = new Set<string>();
    for (const rel of finalRelationships) {
      if (Array.isArray(rel.sourceMemoryIds)) {
        for (const mid of rel.sourceMemoryIds) {
          if (mid) memoryIdsSet.add(mid);
        }
      }
    }

    const supportingMemories: SemanticMemoryResult[] = [];
    const memoryDocMap = new Map<string, any>();

    // Fetch supporting memories from Firestore with strict user isolation
    const memoryIdsToFetch = Array.from(memoryIdsSet).slice(0, maxSupportingMemories);
    if (memoryIdsToFetch.length > 0) {
      const memorySnaps = await Promise.all(
        memoryIdsToFetch.map(mid => adminDb.collection('memories').doc(mid).get())
      );

      for (const snap of memorySnaps) {
        if (!snap.exists) continue;
        const data = snap.data();
        // Strict ownership check: ensure this memory belongs to authenticated user
        if (!data || data.userId !== userId) continue;

        const content = (data.content || data.title || '').trim();
        if (!content) continue;

        memoryDocMap.set(snap.id, data);

        supportingMemories.push({
          memoryId: snap.id,
          text: content,
          score: 0.88, // Confident score for structured graph-verified memories
          category: data.category || 'Personal',
          date: data.date || '',
          createdAt: data.created_at || data.createdAt || '',
          updatedAt: data.updated_at || data.updatedAt || ''
        });
      }
    }

    // Stage 6: Build Structured Graph Evidence
    const evidence: GraphEvidence[] = [];
    for (const rel of finalRelationships) {
      // Only include relationships that have at least one valid supporting memory
      const validMemIds = rel.sourceMemoryIds.filter(mid => memoryDocMap.has(mid));
      if (validMemIds.length === 0 && memoryDocMap.size > 0) {
        // If supporting memories were deleted from Firestore, do not present orphaned edges
        continue;
      }

      const sourceName = rel.sourceEntityId === SELF_ENTITY_ID
        ? 'You'
        : (entityMap.get(rel.sourceEntityId)?.name || rel.sourceEntityId);

      const targetName = rel.targetEntityId === SELF_ENTITY_ID
        ? 'You'
        : (entityMap.get(rel.targetEntityId)?.name || rel.targetEntityId);

      evidence.push({
        sourceEntityId: rel.sourceEntityId,
        sourceEntityName: sourceName,
        targetEntityId: rel.targetEntityId,
        targetEntityName: targetName,
        relation: rel.relation,
        sourceMemoryIds: validMemIds.length > 0 ? validMemIds : rel.sourceMemoryIds,
        relevanceReason: `Explicit relationship: ${sourceName} → ${rel.relation.replace(/_/g, ' ')} → ${targetName}`
      });
    }

    return {
      query,
      entities: finalEntities,
      relationships: finalRelationships,
      evidence,
      supportingMemories,
      isGraphRelevant: true
    };
  } catch (err: any) {
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.warn(`[GraphRetrieval] Error retrieving graph evidence for user ${userId}:`, err?.message || err);
    }
    // Silent degradation: graph errors must never crash chat
    return {
      ...emptyResult,
      isGraphRelevant: true
    };
  }
}
