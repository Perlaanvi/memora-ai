import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import {
  DocumentItem,
  MemoryItem,
  GoalItem,
  ProjectItem,
  IdeaItem,
  LearningItem,
  UserProfile,
  GlobalSearchResult,
  DocumentType,
  IdeaPriority,
  IdeaStatus,
  ChatMessage,
  ChatThread,
  KnowledgeEntity,
  KnowledgeRelationship,
  KnowledgeEntityType,
  TimelineItem,
  TimelineResponse,
  KnowledgeRebuildResult,
  TemporalPrecision
} from '../types';

export const COLLECTIONS = {
  USERS: 'users',
  DOCUMENTS: 'documents',
  MEMORIES: 'memories',
  GOALS: 'goals',
  PROJECTS: 'projects',
  IDEAS: 'ideas',
  LEARNINGS: 'learnings',
  CHAT_THREADS: 'chat_threads',
  CHAT_MESSAGES: 'chat_messages'
} as const;

export function sanitizeDocId(rawId: string | number): string {
  const sanitized = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return sanitized || `doc_${Date.now()}`;
}

/**
 * Recursively cleans an object or array to ensure no `undefined` values are ever passed to Firestore.
 * Firestore setDoc/updateDoc strictly rejects any `undefined` values at any nesting level.
 */
export function cleanForFirestore<T>(input: T): T {
  if (input === undefined) {
    return null as any;
  }
  if (input === null || typeof input !== 'object') {
    return input;
  }
  if (input instanceof Date) {
    return input.toISOString() as any;
  }
  if (Array.isArray(input)) {
    return input
      .filter(item => item !== undefined)
      .map(item => cleanForFirestore(item)) as any;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(input as any)) {
    if (value !== undefined) {
      result[key] = cleanForFirestore(value);
    }
  }
  return result;
}

/**
 * Safely calls Firestore setDoc after recursively sanitizing any `undefined` properties.
 */
export async function safeSetDoc(docRef: any, data: any, options?: any) {
  const cleaned = cleanForFirestore(data);
  if (options) {
    return await setDoc(docRef, cleaned, options);
  }
  return await setDoc(docRef, cleaned);
}

function getEffectiveUserId(explicitUid?: string): string {
  const uid = explicitUid || auth.currentUser?.uid;
  if (!uid) {
    throw new Error('User must be signed in to perform this operation.');
  }
  return uid;
}

// ======================= DOCUMENTS =======================
export async function getFirestoreDocuments(uid?: string): Promise<DocumentItem[]> {
  const userId = getEffectiveUserId(uid);
  const path = COLLECTIONS.DOCUMENTS;
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      const title = data.title || 'Untitled Document';
      const type = (data.type || (data.file_type ? data.file_type.toUpperCase() : 'PDF')) as DocumentType;
      const fullContent = data.fullContent || data.content || '';
      return {
        id: d.id,
        userId,
        title,
        type,
        topic: data.topic || 'General',
        updated: data.updated || (data.updated_at ? data.updated_at.slice(0, 10) : 'Recently'),
        size: data.size || '15 KB',
        status: data.status || 'Indexed',
        tags: Array.isArray(data.tags) ? data.tags : [],
        excerpt: data.excerpt || (fullContent ? fullContent.slice(0, 160) : 'Document content'),
        fullContent,
        chunksCount: typeof data.chunksCount === 'number' ? data.chunksCount : 12,
        tokenCount: typeof data.tokenCount === 'number' ? data.tokenCount : 3500,
        author: data.author || 'User'
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreDocument(
  docData: Partial<DocumentItem>,
  uid?: string
): Promise<DocumentItem> {
  const userId = getEffectiveUserId(uid);
  const rawId = docData.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docId = sanitizeDocId(rawId);
  const path = `${COLLECTIONS.DOCUMENTS}/${docId}`;
  const now = new Date().toISOString();

  const title = docData.title || 'Untitled Document';
  const type = docData.type || 'PDF';
  const fullContent = docData.fullContent || '';
  const excerpt = docData.excerpt || (fullContent ? fullContent.slice(0, 160) : '');

  const payload = {
    id: docId,
    userId,
    title,
    filename: `${title.replace(/\s+/g, '_')}.txt`,
    file_type: type.toLowerCase(),
    content: fullContent,
    type,
    topic: docData.topic || 'General',
    updated: 'Just now',
    size: docData.size || '15 KB',
    status: docData.status || 'Indexed',
    tags: Array.isArray(docData.tags) ? docData.tags : [],
    excerpt,
    fullContent,
    chunksCount: typeof docData.chunksCount === 'number' ? docData.chunksCount : 12,
    tokenCount: typeof docData.tokenCount === 'number' ? docData.tokenCount : 3500,
    author: docData.author || 'User',
    created_at: now,
    updated_at: now
  };

  try {
    await safeSetDoc(doc(db, COLLECTIONS.DOCUMENTS, docId), payload, { merge: true });
    return {
      id: docId,
      userId,
      title: payload.title,
      type: payload.type as DocumentType,
      topic: payload.topic,
      updated: payload.updated,
      size: payload.size,
      status: payload.status,
      tags: payload.tags,
      excerpt: payload.excerpt,
      fullContent: payload.fullContent,
      chunksCount: payload.chunksCount,
      tokenCount: payload.tokenCount,
      author: payload.author
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteFirestoreDocument(id: string | number, uid?: string): Promise<void> {
  getEffectiveUserId(uid);
  const docId = sanitizeDocId(id);
  const path = `${COLLECTIONS.DOCUMENTS}/${docId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.DOCUMENTS, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ======================= MEMORIES =======================
export async function getFirestoreMemories(uid?: string): Promise<MemoryItem[]> {
  const userId = getEffectiveUserId(uid);
  const path = COLLECTIONS.MEMORIES;
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      const content = data.content || data.title || '';
      return {
        id: d.id,
        userId,
        content,
        category: data.category || 'Personal',
        tags: Array.isArray(data.tags) ? data.tags : [],
        date: data.date || (data.created_at ? data.created_at.slice(0, 10) : 'Today'),
        sourceRef: data.sourceRef || '',
        sourceType: data.sourceType || 'manual',
        sourceThreadId: data.sourceThreadId || undefined,
        sourceMessageId: data.sourceMessageId || undefined,
        pinned: Boolean(data.pinned),
        created_at: data.created_at || data.createdAt || data.date,
        updated_at: data.updated_at || data.updatedAt,
        eventStartAt: data.eventStartAt || data.temporal?.eventStartAt || null,
        eventEndAt: data.eventEndAt || data.temporal?.eventEndAt || null,
        temporalPrecision: data.temporalPrecision || data.temporal?.precision || undefined,
        temporalStatus: data.temporalStatus || data.temporal?.status || undefined,
        temporal: data.temporal || undefined
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreMemory(
  memData: Partial<MemoryItem>,
  uid?: string
): Promise<MemoryItem> {
  const userId = getEffectiveUserId(uid);
  const rawId = memData.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docId = sanitizeDocId(rawId);
  const path = `${COLLECTIONS.MEMORIES}/${docId}`;
  const now = new Date().toISOString();

  const content = memData.content || '';
  const title = memData.sourceRef || content.slice(0, 60) || 'Memory';
  const category = memData.category || 'Personal';

  const payload: any = {
    id: docId,
    userId,
    title,
    content,
    category,
    importance: memData.pinned ? 5 : 3,
    tags: Array.isArray(memData.tags) ? memData.tags : [],
    date: memData.date || now.slice(0, 10),
    sourceRef: memData.sourceRef || '',
    sourceType: memData.sourceType || 'manual',
    pinned: Boolean(memData.pinned),
    updated_at: now
  };

  // Only assign created_at if it's a new memory or explicitly provided
  if (memData.created_at) {
    payload.created_at = memData.created_at;
  } else if (!memData.id) {
    payload.created_at = now;
  }

  if (memData.eventStartAt !== undefined) payload.eventStartAt = memData.eventStartAt;
  if (memData.eventEndAt !== undefined) payload.eventEndAt = memData.eventEndAt;
  if (memData.temporalPrecision !== undefined) payload.temporalPrecision = memData.temporalPrecision;
  if (memData.temporalStatus !== undefined) payload.temporalStatus = memData.temporalStatus;
  if (memData.temporal !== undefined) payload.temporal = memData.temporal;

  if (memData.sourceThreadId) {
    payload.sourceThreadId = memData.sourceThreadId;
  }
  if (memData.sourceMessageId) {
    payload.sourceMessageId = memData.sourceMessageId;
  }

  try {
    await safeSetDoc(doc(db, COLLECTIONS.MEMORIES, docId), payload, { merge: true });
    return {
      id: docId,
      userId,
      content: payload.content,
      category: payload.category,
      tags: payload.tags,
      date: payload.date,
      sourceRef: payload.sourceRef,
      sourceType: payload.sourceType,
      sourceThreadId: payload.sourceThreadId,
      sourceMessageId: payload.sourceMessageId,
      pinned: payload.pinned,
      created_at: payload.created_at || memData.created_at || now,
      updated_at: payload.updated_at,
      eventStartAt: payload.eventStartAt,
      eventEndAt: payload.eventEndAt,
      temporalPrecision: payload.temporalPrecision,
      temporalStatus: payload.temporalStatus,
      temporal: payload.temporal
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteFirestoreMemory(id: string | number, uid?: string): Promise<void> {
  getEffectiveUserId(uid);
  const docId = sanitizeDocId(id);
  const path = `${COLLECTIONS.MEMORIES}/${docId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.MEMORIES, docId));
    // Clean up any associated vector document
    try {
      await deleteDoc(doc(db, 'memory_vectors', docId));
    } catch {
      // Ignore if vector document didn't exist or already removed
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ======================= GOALS =======================
export async function getFirestoreGoals(uid?: string): Promise<GoalItem[]> {
  const userId = getEffectiveUserId(uid);
  const path = COLLECTIONS.GOALS;
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        userId,
        title: data.title || 'Untitled Goal',
        description: data.description || '',
        progress: typeof data.progress === 'number' ? data.progress : 0,
        status: data.status || 'In Progress',
        targetDate: data.targetDate || data.target_date || 'December 2026',
        relatedProjects: Array.isArray(data.relatedProjects) ? data.relatedProjects : [],
        milestones: Array.isArray(data.milestones) ? data.milestones : [],
        category: data.category || 'Engineering'
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreGoal(
  goalData: Partial<GoalItem>,
  uid?: string
): Promise<GoalItem> {
  const userId = getEffectiveUserId(uid);
  const rawId = goalData.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docId = sanitizeDocId(rawId);
  const path = `${COLLECTIONS.GOALS}/${docId}`;
  const now = new Date().toISOString();

  const title = goalData.title || 'Untitled Goal';
  const status = goalData.status || 'In Progress';
  const targetDate = goalData.targetDate || 'December 2026';

  const payload = {
    id: docId,
    userId,
    title,
    description: goalData.description || '',
    status,
    priority: 4,
    progress: typeof goalData.progress === 'number' ? goalData.progress : 0,
    target_date: targetDate,
    targetDate,
    category: goalData.category || 'Engineering',
    relatedProjects: Array.isArray(goalData.relatedProjects) ? goalData.relatedProjects : [],
    milestones: Array.isArray(goalData.milestones) ? goalData.milestones : [],
    created_at: now,
    updated_at: now
  };

  try {
    await safeSetDoc(doc(db, COLLECTIONS.GOALS, docId), payload, { merge: true });
    return {
      id: docId,
      userId,
      title: payload.title,
      description: payload.description,
      progress: payload.progress,
      status: payload.status,
      targetDate: payload.targetDate,
      relatedProjects: payload.relatedProjects,
      milestones: payload.milestones,
      category: payload.category
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteFirestoreGoal(id: string | number, uid?: string): Promise<void> {
  getEffectiveUserId(uid);
  const docId = sanitizeDocId(id);
  const path = `${COLLECTIONS.GOALS}/${docId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.GOALS, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ======================= PROJECTS =======================
export async function getFirestoreProjects(uid?: string): Promise<ProjectItem[]> {
  const userId = getEffectiveUserId(uid);
  const path = COLLECTIONS.PROJECTS;
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        userId,
        name: data.name || data.title || 'Untitled Project',
        description: data.description || '',
        status: data.status || 'In Progress',
        progress: typeof data.progress === 'number' ? data.progress : 0,
        technologies: Array.isArray(data.technologies) ? data.technologies : [],
        lastUpdated: data.lastUpdated || (data.updated_at ? data.updated_at.slice(0, 10) : 'Today'),
        repositoryUrl: data.repositoryUrl || '',
        goalsLinked: Array.isArray(data.goalsLinked) ? data.goalsLinked : []
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreProject(
  projData: Partial<ProjectItem>,
  uid?: string
): Promise<ProjectItem> {
  const userId = getEffectiveUserId(uid);
  const rawId = projData.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docId = sanitizeDocId(rawId);
  const path = `${COLLECTIONS.PROJECTS}/${docId}`;
  const now = new Date().toISOString();

  const name = projData.name || 'Untitled Project';
  const status = projData.status || 'In Progress';

  const payload = {
    id: docId,
    userId,
    name,
    title: name,
    description: projData.description || '',
    status,
    priority: 4,
    progress: typeof projData.progress === 'number' ? projData.progress : 0,
    technologies: Array.isArray(projData.technologies) ? projData.technologies : [],
    repositoryUrl: projData.repositoryUrl || '',
    goalsLinked: Array.isArray(projData.goalsLinked) ? projData.goalsLinked : [],
    lastUpdated: 'Today',
    start_date: now.slice(0, 10),
    target_date: '2026-12-31',
    created_at: now,
    updated_at: now
  };

  try {
    await safeSetDoc(doc(db, COLLECTIONS.PROJECTS, docId), payload, { merge: true });
    return {
      id: docId,
      userId,
      name: payload.name,
      description: payload.description,
      status: payload.status,
      progress: payload.progress,
      technologies: payload.technologies,
      lastUpdated: payload.lastUpdated,
      repositoryUrl: payload.repositoryUrl,
      goalsLinked: payload.goalsLinked
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteFirestoreProject(id: string | number, uid?: string): Promise<void> {
  getEffectiveUserId(uid);
  const docId = sanitizeDocId(id);
  const path = `${COLLECTIONS.PROJECTS}/${docId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.PROJECTS, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ======================= IDEAS =======================
export async function getFirestoreIdeas(uid?: string): Promise<IdeaItem[]> {
  const userId = getEffectiveUserId(uid);
  const path = COLLECTIONS.IDEAS;
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        userId,
        title: data.title || 'Untitled Idea',
        description: data.description || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        priority: (data.priority || 'Medium') as IdeaPriority,
        createdDate: data.createdDate || (data.created_at ? data.created_at.slice(0, 10) : 'Today'),
        status: (data.status || 'Exploring') as IdeaStatus,
        impactScore: typeof data.impactScore === 'number' ? data.impactScore : 80
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreIdea(
  ideaData: Partial<IdeaItem>,
  uid?: string
): Promise<IdeaItem> {
  const userId = getEffectiveUserId(uid);
  const rawId = ideaData.id || `idea_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docId = sanitizeDocId(rawId);
  const path = `${COLLECTIONS.IDEAS}/${docId}`;
  const now = new Date().toISOString();

  const title = ideaData.title || 'Untitled Idea';
  const tags = Array.isArray(ideaData.tags) ? ideaData.tags : [];
  const category = tags[0] || 'Brainstorm';

  const payload = {
    id: docId,
    userId,
    title,
    description: ideaData.description || '',
    category,
    tags,
    priority: ideaData.priority || 'Medium',
    status: ideaData.status || 'Exploring',
    impactScore: typeof ideaData.impactScore === 'number' ? ideaData.impactScore : 85,
    createdDate: ideaData.createdDate || now.slice(0, 10),
    created_at: now,
    updated_at: now
  };

  try {
    await safeSetDoc(doc(db, COLLECTIONS.IDEAS, docId), payload, { merge: true });
    return {
      id: docId,
      userId,
      title: payload.title,
      description: payload.description,
      tags: payload.tags,
      priority: payload.priority as IdeaPriority,
      createdDate: payload.createdDate,
      status: payload.status as IdeaStatus,
      impactScore: payload.impactScore
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteFirestoreIdea(id: string | number, uid?: string): Promise<void> {
  getEffectiveUserId(uid);
  const docId = sanitizeDocId(id);
  const path = `${COLLECTIONS.IDEAS}/${docId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.IDEAS, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ======================= LEARNINGS =======================
export async function getFirestoreLearnings(uid?: string): Promise<LearningItem[]> {
  const userId = getEffectiveUserId(uid);
  const path = COLLECTIONS.LEARNINGS;
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        userId,
        topic: data.topic || data.title || 'Untitled Learning',
        explanation: data.explanation || data.content || '',
        relatedKnowledge: Array.isArray(data.relatedKnowledge) ? data.relatedKnowledge : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        dateLearned: data.dateLearned || (data.created_at ? data.created_at.slice(0, 10) : 'Today'),
        category: data.category || 'Foundations'
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreLearning(
  learnData: Partial<LearningItem>,
  uid?: string
): Promise<LearningItem> {
  const userId = getEffectiveUserId(uid);
  const rawId = learnData.id || `learn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docId = sanitizeDocId(rawId);
  const path = `${COLLECTIONS.LEARNINGS}/${docId}`;
  const now = new Date().toISOString();

  const topic = learnData.topic || 'Untitled Learning';
  const explanation = learnData.explanation || '';
  const category = learnData.category || 'Foundations';

  const payload = {
    id: docId,
    userId,
    title: topic,
    topic,
    content: explanation,
    explanation,
    category,
    source: (Array.isArray(learnData.tags) && learnData.tags.join(', ')) || 'Notes',
    importance: 4,
    tags: Array.isArray(learnData.tags) ? learnData.tags : [],
    relatedKnowledge: Array.isArray(learnData.relatedKnowledge) ? learnData.relatedKnowledge : [],
    dateLearned: learnData.dateLearned || now.slice(0, 10),
    created_at: now,
    updated_at: now
  };

  try {
    await safeSetDoc(doc(db, COLLECTIONS.LEARNINGS, docId), payload, { merge: true });
    return {
      id: docId,
      userId,
      topic: payload.topic,
      explanation: payload.explanation,
      relatedKnowledge: payload.relatedKnowledge,
      tags: payload.tags,
      dateLearned: payload.dateLearned,
      category: payload.category
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteFirestoreLearning(id: string | number, uid?: string): Promise<void> {
  getEffectiveUserId(uid);
  const docId = sanitizeDocId(id);
  const path = `${COLLECTIONS.LEARNINGS}/${docId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.LEARNINGS, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ======================= USER PROFILE =======================
export async function getFirestoreUserProfile(uid?: string): Promise<UserProfile | null> {
  const userId = getEffectiveUserId(uid);
  const path = `${COLLECTIONS.USERS}/${userId}`;
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (snap.exists()) {
      const data = snap.data();
      const currentAuth = auth.currentUser;
      return {
        uid: userId,
        name: data.displayName || data.name || currentAuth?.displayName || (currentAuth?.email ? currentAuth.email.split('@')[0] : 'User'),
        email: data.email || currentAuth?.email || '',
        avatarUrl: data.photoURL || data.avatarUrl || '',
        role: data.role || 'Knowledge Architect',
        joinedDate: data.created_at ? data.created_at.slice(0, 10) : 'Recent'
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveFirestoreUserProfile(
  profile: Partial<UserProfile>,
  uid?: string
): Promise<UserProfile> {
  const userId = getEffectiveUserId(uid);
  const path = `${COLLECTIONS.USERS}/${userId}`;
  const now = new Date().toISOString();
  const currentAuth = auth.currentUser;

  const payload = {
    uid: userId,
    displayName: profile.name || currentAuth?.displayName || (currentAuth?.email ? currentAuth.email.split('@')[0] : 'User'),
    email: profile.email || currentAuth?.email || '',
    photoURL: profile.avatarUrl || '',
    role: profile.role || 'Knowledge Architect',
    updated_at: now
  };

  try {
    await safeSetDoc(doc(db, COLLECTIONS.USERS, userId), payload, { merge: true });
    return {
      uid: userId,
      name: payload.displayName,
      email: payload.email,
      avatarUrl: payload.photoURL,
      role: payload.role,
      joinedDate: profile.joinedDate || now.slice(0, 10)
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ======================= CROSS-COLLECTION SEARCH =======================
export async function searchFirestore(
  searchTerm: string,
  uid?: string
): Promise<GlobalSearchResult[]> {
  const userId = getEffectiveUserId(uid);
  const queryLower = searchTerm.trim().toLowerCase();
  if (!queryLower) return [];

  try {
    const [docs, mems, goals, projs, ideas, learnings] = await Promise.all([
      getFirestoreDocuments(userId),
      getFirestoreMemories(userId),
      getFirestoreGoals(userId),
      getFirestoreProjects(userId),
      getFirestoreIdeas(userId),
      getFirestoreLearnings(userId)
    ]);

    const results: GlobalSearchResult[] = [];

    docs.forEach(d => {
      if (
        d.title.toLowerCase().includes(queryLower) ||
        d.topic.toLowerCase().includes(queryLower) ||
        d.excerpt.toLowerCase().includes(queryLower) ||
        d.tags.some(t => t.toLowerCase().includes(queryLower))
      ) {
        results.push({
          id: d.id,
          title: d.title,
          snippet: d.excerpt,
          type: 'Documents',
          targetTab: 'knowledge',
          tags: d.tags,
          updatedOrDate: d.updated
        });
      }
    });

    mems.forEach(m => {
      if (
        m.content.toLowerCase().includes(queryLower) ||
        m.category.toLowerCase().includes(queryLower) ||
        m.tags.some(t => t.toLowerCase().includes(queryLower))
      ) {
        results.push({
          id: m.id,
          title: m.sourceRef || `${m.category} Memory`,
          snippet: m.content,
          type: 'Memories',
          targetTab: 'memories',
          tags: m.tags,
          updatedOrDate: m.date
        });
      }
    });

    goals.forEach(g => {
      if (
        g.title.toLowerCase().includes(queryLower) ||
        g.description.toLowerCase().includes(queryLower) ||
        g.category.toLowerCase().includes(queryLower)
      ) {
        results.push({
          id: g.id,
          title: g.title,
          snippet: g.description,
          type: 'Goals',
          targetTab: 'goals',
          tags: [g.category, g.status],
          updatedOrDate: g.targetDate
        });
      }
    });

    projs.forEach(p => {
      if (
        p.name.toLowerCase().includes(queryLower) ||
        p.description.toLowerCase().includes(queryLower) ||
        p.technologies.some(t => t.toLowerCase().includes(queryLower))
      ) {
        results.push({
          id: p.id,
          title: p.name,
          snippet: p.description,
          type: 'Projects',
          targetTab: 'projects',
          tags: p.technologies,
          updatedOrDate: p.lastUpdated
        });
      }
    });

    ideas.forEach(i => {
      if (
        i.title.toLowerCase().includes(queryLower) ||
        i.description.toLowerCase().includes(queryLower) ||
        i.tags.some(t => t.toLowerCase().includes(queryLower))
      ) {
        results.push({
          id: i.id,
          title: i.title,
          snippet: i.description,
          type: 'Ideas',
          targetTab: 'ideas',
          tags: i.tags,
          updatedOrDate: i.createdDate
        });
      }
    });

    learnings.forEach(l => {
      if (
        l.topic.toLowerCase().includes(queryLower) ||
        l.explanation.toLowerCase().includes(queryLower) ||
        l.category.toLowerCase().includes(queryLower) ||
        l.tags.some(t => t.toLowerCase().includes(queryLower))
      ) {
        results.push({
          id: l.id,
          title: l.topic,
          snippet: l.explanation,
          type: 'Learnings',
          targetTab: 'learnings',
          tags: l.tags,
          updatedOrDate: l.dateLearned
        });
      }
    });

    return results;
  } catch (error) {
    console.warn('Cross-collection search error:', error);
    return [];
  }
}

// ======================= CHAT THREADS & MESSAGES =======================

export async function getFirestoreChatThreads(uid?: string): Promise<ChatThread[]> {
  const userId = getEffectiveUserId(uid);
  const path = COLLECTIONS.CHAT_THREADS;
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    const threads = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId || userId,
        title: data.title || 'New Conversation',
        snippet: data.snippet || '',
        created_at: data.created_at || '',
        updated_at: data.updated_at || data.created_at || '',
        messageCount: typeof data.messageCount === 'number' ? data.messageCount : 0
      };
    });
    // Sort in descending order by updated_at
    threads.sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''));
    return threads;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createFirestoreChatThread(
  threadData: { id?: string; title: string; snippet?: string },
  uid?: string
): Promise<ChatThread> {
  const userId = getEffectiveUserId(uid);
  const rawId = threadData.id || `thread_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docId = sanitizeDocId(rawId);
  const path = `${COLLECTIONS.CHAT_THREADS}/${docId}`;
  const now = new Date().toISOString();

  const payload: ChatThread = {
    id: docId,
    userId,
    title: threadData.title || 'New Conversation',
    snippet: threadData.snippet || '',
    created_at: now,
    updated_at: now,
    messageCount: 0
  };

  try {
    await safeSetDoc(doc(db, COLLECTIONS.CHAT_THREADS, docId), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateFirestoreChatThread(
  threadId: string,
  updates: Partial<ChatThread>,
  uid?: string
): Promise<ChatThread> {
  const userId = getEffectiveUserId(uid);
  const docId = sanitizeDocId(threadId);
  const path = `${COLLECTIONS.CHAT_THREADS}/${docId}`;
  const now = new Date().toISOString();

  try {
    const payload = {
      ...updates,
      updated_at: now
    };
    await safeSetDoc(doc(db, COLLECTIONS.CHAT_THREADS, docId), payload, { merge: true });
    return {
      id: docId,
      userId,
      title: updates.title || 'Conversation',
      snippet: updates.snippet || '',
      created_at: updates.created_at || now,
      updated_at: now,
      messageCount: updates.messageCount
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteFirestoreChatThread(threadId: string, uid?: string): Promise<void> {
  const userId = getEffectiveUserId(uid);
  const docId = sanitizeDocId(threadId);
  const threadPath = `${COLLECTIONS.CHAT_THREADS}/${docId}`;

  try {
    // 1. Delete thread document
    await deleteDoc(doc(db, COLLECTIONS.CHAT_THREADS, docId));

    // 2. Cascade delete all messages associated with this thread
    const msgQuery = query(collection(db, COLLECTIONS.CHAT_MESSAGES), where('userId', '==', userId));
    const snap = await getDocs(msgQuery);
    const deletePromises = snap.docs
      .filter(d => d.data().threadId === docId)
      .map(d => deleteDoc(doc(db, COLLECTIONS.CHAT_MESSAGES, d.id)));

    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, threadPath);
    throw error;
  }
}

export async function getFirestoreChatMessages(threadId?: string, uid?: string): Promise<ChatMessage[]> {
  const userId = getEffectiveUserId(uid);
  const path = COLLECTIONS.CHAT_MESSAGES;
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    let msgs = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        threadId: data.threadId || undefined,
        userId: data.userId || userId,
        role: (data.role || 'user') as 'user' | 'assistant',
        content: data.content || '',
        timestamp: data.timestamp || (data.created_at ? data.created_at.slice(11, 16) : 'Just now'),
        created_at: data.created_at || '',
        attachmentName: data.attachmentName || undefined,
        sources: Array.isArray(data.sources) ? data.sources : undefined,
        ragSources: Array.isArray(data.ragSources) ? data.ragSources : undefined,
        grounded: typeof data.grounded === 'boolean' ? data.grounded : (Array.isArray(data.sources) && data.sources.length > 0),
        graphEvidence: Array.isArray(data.graphEvidence) ? data.graphEvidence : undefined,
        temporalEvidence: Array.isArray(data.temporalEvidence) ? data.temporalEvidence : undefined,
        temporalScope: data.temporalScope || undefined
      };
    });

    if (threadId) {
      msgs = msgs.filter(m => m.threadId === threadId);
    }

    // Sort in ascending order by created_at
    msgs.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    return msgs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreChatMessage(
  msgData: Partial<ChatMessage>,
  uid?: string
): Promise<ChatMessage> {
  const userId = getEffectiveUserId(uid);
  const rawId = msgData.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docId = sanitizeDocId(rawId);
  const path = `${COLLECTIONS.CHAT_MESSAGES}/${docId}`;
  const now = new Date().toISOString();

  const payload: any = {
    id: docId,
    threadId: msgData.threadId || null,
    userId,
    role: msgData.role || 'user',
    content: msgData.content || '',
    timestamp: msgData.timestamp || 'Just now',
    attachmentName: msgData.attachmentName || null,
    sources: Array.isArray(msgData.sources) ? cleanForFirestore(msgData.sources) : null,
    ragSources: Array.isArray(msgData.ragSources) ? cleanForFirestore(msgData.ragSources) : null,
    grounded: typeof msgData.grounded === 'boolean' ? msgData.grounded : (Array.isArray(msgData.sources) && msgData.sources.length > 0),
    created_at: msgData.created_at || now
  };

  if (msgData.graphEvidence) payload.graphEvidence = cleanForFirestore(msgData.graphEvidence);
  if (msgData.temporalEvidence) payload.temporalEvidence = cleanForFirestore(msgData.temporalEvidence);
  if (msgData.temporalScope) payload.temporalScope = cleanForFirestore(msgData.temporalScope);

  try {
    await safeSetDoc(doc(db, COLLECTIONS.CHAT_MESSAGES, docId), payload, { merge: true });

    // Update the thread's updated_at and snippet if threadId is present
    if (msgData.threadId) {
      const snippet = msgData.content ? msgData.content.slice(0, 80) : '';
      const threadRef = doc(db, COLLECTIONS.CHAT_THREADS, sanitizeDocId(msgData.threadId));
      try {
        await safeSetDoc(
          threadRef,
          {
            updated_at: now,
            ...(snippet ? { snippet } : {})
          },
          { merge: true }
        );
      } catch (threadErr) {
        console.warn('Could not update thread timestamp on message save:', threadErr);
      }
    }

    return {
      id: docId,
      threadId: payload.threadId || undefined,
      userId,
      role: payload.role as 'user' | 'assistant',
      content: payload.content,
      timestamp: payload.timestamp,
      created_at: payload.created_at,
      attachmentName: payload.attachmentName || undefined,
      sources: payload.sources || undefined,
      ragSources: payload.ragSources || undefined,
      grounded: typeof payload.grounded === 'boolean' ? payload.grounded : undefined,
      graphEvidence: payload.graphEvidence || undefined,
      temporalEvidence: payload.temporalEvidence || undefined,
      temporalScope: payload.temporalScope || undefined
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function clearFirestoreChatMessages(threadId?: string, uid?: string): Promise<void> {
  const userId = getEffectiveUserId(uid);
  const path = COLLECTIONS.CHAT_MESSAGES;
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    const deletePromises = snap.docs
      .filter(d => !threadId || d.data().threadId === threadId)
      .map(d => deleteDoc(doc(db, COLLECTIONS.CHAT_MESSAGES, d.id)));

    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ======================= KNOWLEDGE GRAPH (A9.1) =======================

export async function getFirestoreKnowledgeEntities(uid?: string): Promise<KnowledgeEntity[]> {
  const userId = getEffectiveUserId(uid);
  const path = `users/${userId}/knowledge_entities`;
  try {
    const colRef = collection(db, 'users', userId, 'knowledge_entities');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        entityId: data.entityId || d.id,
        userId,
        name: data.name || '',
        type: (data.type || 'other') as KnowledgeEntityType,
        aliases: Array.isArray(data.aliases) ? data.aliases : [],
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreKnowledgeEntity(
  entity: Partial<KnowledgeEntity>,
  uid?: string
): Promise<KnowledgeEntity> {
  const userId = getEffectiveUserId(uid);
  const entityId = sanitizeDocId(entity.entityId || `ent_${entity.type || 'other'}_${Date.now()}`);
  const path = `users/${userId}/knowledge_entities/${entityId}`;
  const now = new Date().toISOString();

  const payload: KnowledgeEntity = {
    entityId,
    userId,
    name: entity.name || 'Unnamed Entity',
    type: (entity.type || 'other') as KnowledgeEntityType,
    aliases: Array.isArray(entity.aliases) ? entity.aliases : [],
    createdAt: entity.createdAt || now,
    updatedAt: now
  };

  try {
    await safeSetDoc(doc(db, 'users', userId, 'knowledge_entities', entityId), payload, { merge: true });
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteFirestoreKnowledgeEntity(entityId: string, uid?: string): Promise<void> {
  const userId = getEffectiveUserId(uid);
  const cleanId = sanitizeDocId(entityId);
  const path = `users/${userId}/knowledge_entities/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'knowledge_entities', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function getFirestoreKnowledgeRelationships(uid?: string): Promise<KnowledgeRelationship[]> {
  const userId = getEffectiveUserId(uid);
  const path = `users/${userId}/knowledge_relationships`;
  try {
    const colRef = collection(db, 'users', userId, 'knowledge_relationships');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        relationshipId: data.relationshipId || d.id,
        userId,
        sourceEntityId: data.sourceEntityId || '',
        targetEntityId: data.targetEntityId || '',
        relation: data.relation || 'related_to',
        sourceMemoryIds: Array.isArray(data.sourceMemoryIds) ? data.sourceMemoryIds : [],
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreKnowledgeRelationship(
  rel: Partial<KnowledgeRelationship>,
  uid?: string
): Promise<KnowledgeRelationship> {
  const userId = getEffectiveUserId(uid);
  const relationshipId = sanitizeDocId(rel.relationshipId || `rel_${Date.now()}`);
  const path = `users/${userId}/knowledge_relationships/${relationshipId}`;
  const now = new Date().toISOString();

  const payload: KnowledgeRelationship = {
    relationshipId,
    userId,
    sourceEntityId: rel.sourceEntityId || 'ent_person_self',
    targetEntityId: rel.targetEntityId || '',
    relation: rel.relation || 'related_to',
    sourceMemoryIds: Array.isArray(rel.sourceMemoryIds) ? rel.sourceMemoryIds : [],
    createdAt: rel.createdAt || now,
    updatedAt: now
  };

  try {
    await safeSetDoc(doc(db, 'users', userId, 'knowledge_relationships', relationshipId), payload, { merge: true });
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteFirestoreKnowledgeRelationship(relId: string, uid?: string): Promise<void> {
  const userId = getEffectiveUserId(uid);
  const cleanId = sanitizeDocId(relId);
  const path = `users/${userId}/knowledge_relationships/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'knowledge_relationships', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ======================= PERSONAL TIMELINE (A10.1) =======================

const MONTH_NAMES_MAP: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

function formatDisplayDate(dateStr?: string | null, precision: TemporalPrecision = 'day'): { displayDate: string; formattedPrecision: string } {
  if (!dateStr) {
    return { displayDate: 'Undated', formattedPrecision: 'Unknown' };
  }

  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const monthName = MONTH_NAMES_MAP[m] || `Month ${m}`;

    if (precision === 'month') {
      return { displayDate: `${monthName} ${y}`, formattedPrecision: 'Month-level' };
    }
    if (precision === 'year') {
      return { displayDate: `${y}`, formattedPrecision: 'Year-level' };
    }
    if (precision === 'approximate') {
      return { displayDate: `Around ${monthName} ${d}, ${y}`, formattedPrecision: 'Approximate date' };
    }
    return { displayDate: `${monthName} ${d}, ${y}`, formattedPrecision: 'Exact date' };
  }

  return { displayDate: dateStr, formattedPrecision: 'Recorded date' };
}

export async function getFirestoreTimeline(
  options: { start?: string; end?: string; limit?: number } = {},
  uid?: string
): Promise<TimelineResponse> {
  const userId = getEffectiveUserId(uid);
  const memories = await getFirestoreMemories(userId);

  const datedItems: TimelineItem[] = [];
  const unknownDateItems: TimelineItem[] = [];

  for (const mem of memories) {
    const content = mem.content || '';
    const precision: TemporalPrecision = mem.temporalPrecision || (mem as any).temporal?.precision || (mem.eventStartAt ? 'day' : 'unknown');
    const eventStartAt = mem.eventStartAt || (mem as any).temporal?.eventStartAt || null;
    const eventEndAt = mem.eventEndAt || (mem as any).temporal?.eventEndAt || null;
    const createdAt = mem.created_at || mem.date || new Date().toISOString();

    const { displayDate, formattedPrecision } = formatDisplayDate(eventStartAt || mem.date || createdAt, precision);

    const item: TimelineItem = {
      id: mem.id,
      memoryId: mem.id,
      userId,
      content,
      category: mem.category || 'Personal',
      tags: Array.isArray(mem.tags) ? mem.tags : [],
      createdAt,
      eventStartAt,
      eventEndAt,
      precision,
      status: (mem as any).temporalStatus || 'past',
      displayDate,
      formattedPrecision,
      pinned: mem.pinned
    };

    if (eventStartAt || (mem.date && /^\d{4}-\d{2}-\d{2}/.test(mem.date))) {
      const compareDate = (eventStartAt || mem.date)!.slice(0, 10);
      if (options.start && compareDate < options.start) continue;
      if (options.end && compareDate > options.end) continue;
      datedItems.push(item);
    } else {
      unknownDateItems.push(item);
    }
  }

  // Sort dated items descending (newest event first)
  datedItems.sort((a, b) => {
    const dateA = (a.eventStartAt || a.createdAt).slice(0, 10);
    const dateB = (b.eventStartAt || b.createdAt).slice(0, 10);
    return dateB.localeCompare(dateA);
  });

  const limitCount = options.limit || 100;
  const paginatedDated = datedItems.slice(0, limitCount);

  return {
    timeline: paginatedDated,
    unknownDateItems,
    totalCount: datedItems.length + unknownDateItems.length,
    hasUnknownCount: unknownDateItems.length
  };
}

// Deterministic rule-based entity/relationship extractor for fast client-side graph rebuilding
function extractLocalEntitiesAndRels(content: string): {
  entities: Array<{ name: string; type: KnowledgeEntityType }>;
  relationships: Array<{ source: string; target: string; relation: string }>;
} {
  const text = content.trim();
  const entities: Array<{ name: string; type: KnowledgeEntityType }> = [];
  const relationships: Array<{ source: string; target: string; relation: string }> = [];

  // "I met <Person> and <Person>"
  const metMulti = text.match(/I\s+met\s+([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)(?:\s+(?:at|in)\s+([A-Z][a-zA-Z0-9\s]+?))?[.!]?$/i);
  if (metMulti) {
    entities.push({ name: metMulti[1], type: 'person' });
    entities.push({ name: metMulti[2], type: 'person' });
    relationships.push({ source: 'SELF', target: metMulti[1], relation: 'met' });
    relationships.push({ source: 'SELF', target: metMulti[2], relation: 'met' });
    if (metMulti[3]) {
      entities.push({ name: metMulti[3].trim(), type: 'place' });
      relationships.push({ source: 'SELF', target: metMulti[3].trim(), relation: 'visited' });
    }
    return { entities, relationships };
  }

  // "I met <Person>"
  const metSingle = text.match(/I\s+met\s+([A-Z][a-z]+)(?:\s+(?:at|in)\s+([A-Z][a-zA-Z0-9\s]+?))?[.!]?$/i);
  if (metSingle) {
    entities.push({ name: metSingle[1], type: 'person' });
    relationships.push({ source: 'SELF', target: metSingle[1], relation: 'met' });
    if (metSingle[2]) {
      entities.push({ name: metSingle[2].trim(), type: 'place' });
      relationships.push({ source: 'SELF', target: metSingle[2].trim(), relation: 'visited' });
    }
    return { entities, relationships };
  }

  // "I worked with <Person>"
  const workedWith = text.match(/I\s+worked\s+with\s+([A-Z][a-z]+)(?:\s+on\s+([a-zA-Z0-9\s]+))?[.!]?$/i);
  if (workedWith) {
    entities.push({ name: workedWith[1], type: 'person' });
    relationships.push({ source: 'SELF', target: workedWith[1], relation: 'worked_with' });
    if (workedWith[2]) {
      entities.push({ name: workedWith[2].trim(), type: 'project' });
      relationships.push({ source: 'SELF', target: workedWith[2].trim(), relation: 'worked_on' });
    }
    return { entities, relationships };
  }

  // "<Person> works at <Org>"
  const worksAt = text.match(/([A-Z][a-z]+)\s+works\s+at\s+([A-Z][a-zA-Z0-9\s]+)[.!]?$/i);
  if (worksAt) {
    entities.push({ name: worksAt[1], type: 'person' });
    entities.push({ name: worksAt[2].trim(), type: 'organization' });
    relationships.push({ source: worksAt[1], target: worksAt[2].trim(), relation: 'works_at' });
    return { entities, relationships };
  }

  // Fallback: capitalized proper nouns
  const properNouns = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  for (const word of properNouns) {
    if (!['The', 'This', 'That', 'With', 'From', 'After', 'Before', 'Today', 'Yesterday'].includes(word)) {
      entities.push({ name: word, type: 'person' });
      relationships.push({ source: 'SELF', target: word, relation: 'met' });
      break;
    }
  }

  return { entities, relationships };
}

export async function rebuildFirestoreKnowledgeGraph(uid?: string): Promise<KnowledgeRebuildResult> {
  const userId = getEffectiveUserId(uid);
  const memories = await getFirestoreMemories(userId);

  // Clear existing entities & relationships for idempotency
  try {
    const entsSnap = await getDocs(collection(db, 'users', userId, 'knowledge_entities'));
    await Promise.all(entsSnap.docs.map(d => deleteDoc(doc(db, 'users', userId, 'knowledge_entities', d.id))));

    const relsSnap = await getDocs(collection(db, 'users', userId, 'knowledge_relationships'));
    await Promise.all(relsSnap.docs.map(d => deleteDoc(doc(db, 'users', userId, 'knowledge_relationships', d.id))));
  } catch (e) {
    console.warn('Clearing graph during rebuild warning:', e);
  }

  // Ensure SELF root entity exists
  const selfEntity: KnowledgeEntity = {
    entityId: 'ent_person_self',
    userId,
    name: 'Self (You)',
    type: 'person',
    aliases: ['you', 'me', 'i', 'myself'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await safeSetDoc(doc(db, 'users', userId, 'knowledge_entities', 'ent_person_self'), selfEntity);

  let entitiesCount = 1;
  let relationshipsCount = 0;

  for (const mem of memories) {
    const { entities, relationships } = extractLocalEntitiesAndRels(mem.content || '');

    for (const ent of entities) {
      const slug = ent.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50);
      const entityId = `ent_${ent.type}_${slug}`;
      const savedEntity: KnowledgeEntity = {
        entityId,
        userId,
        name: ent.name,
        type: ent.type,
        aliases: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await safeSetDoc(doc(db, 'users', userId, 'knowledge_entities', entityId), savedEntity, { merge: true });
      entitiesCount++;

      for (const rel of relationships) {
        const targetSlug = rel.target.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50);
        const targetEntityId = `ent_${ent.type}_${targetSlug}`;
        const sourceEntityId = rel.source === 'SELF' ? 'ent_person_self' : `ent_person_${rel.source.toLowerCase()}`;
        const relId = sanitizeDocId(`rel_${sourceEntityId}_${rel.relation}_${targetEntityId}`);

        const savedRel: KnowledgeRelationship = {
          relationshipId: relId,
          userId,
          sourceEntityId,
          targetEntityId,
          relation: rel.relation,
          sourceMemoryIds: [mem.id],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await safeSetDoc(doc(db, 'users', userId, 'knowledge_relationships', relId), savedRel, { merge: true });
        relationshipsCount++;
      }
    }
  }

  return {
    success: true,
    entitiesCount,
    relationshipsCount,
    processedMemoriesCount: memories.length,
    message: `Knowledge graph rebuilt with ${entitiesCount} entities and ${relationshipsCount} relationships across ${memories.length} confirmed memories.`
  };
}

export async function syncMemoryToFirestoreKnowledgeGraph(
  memoryId: string,
  content: string,
  uid?: string
): Promise<void> {
  const userId = getEffectiveUserId(uid);
  const { entities, relationships } = extractLocalEntitiesAndRels(content);

  for (const ent of entities) {
    const slug = ent.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50);
    const entityId = `ent_${ent.type}_${slug}`;
    const savedEntity: KnowledgeEntity = {
      entityId,
      userId,
      name: ent.name,
      type: ent.type,
      aliases: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await safeSetDoc(doc(db, 'users', userId, 'knowledge_entities', entityId), savedEntity, { merge: true });

    for (const rel of relationships) {
      const targetSlug = rel.target.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50);
      const targetEntityId = `ent_${ent.type}_${targetSlug}`;
      const sourceEntityId = rel.source === 'SELF' ? 'ent_person_self' : `ent_person_${rel.source.toLowerCase()}`;
      const relId = sanitizeDocId(`rel_${sourceEntityId}_${rel.relation}_${targetEntityId}`);

      const savedRel: KnowledgeRelationship = {
        relationshipId: relId,
        userId,
        sourceEntityId,
        targetEntityId,
        relation: rel.relation,
        sourceMemoryIds: [memoryId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await safeSetDoc(doc(db, 'users', userId, 'knowledge_relationships', relId), savedRel, { merge: true });
    }
  }
}

