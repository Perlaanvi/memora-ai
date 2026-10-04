export type NavigationTab = 
  | 'dashboard' 
  | 'chat' 
  | 'knowledge' 
  | 'memories' 
  | 'timeline'
  | 'goals' 
  | 'projects' 
  | 'ideas' 
  | 'learnings' 
  | 'settings';

export type DocumentType = 'PDF' | 'Notes' | 'Markdown' | 'Web' | 'Doc';

export interface DocumentItem {
  id: string;
  userId?: string;
  title: string;
  type: DocumentType;
  topic: string;
  updated: string;
  size?: string;
  status?: string;
  tags: string[];
  excerpt: string;
  fullContent?: string;
  chunksCount?: number;
  tokenCount?: number;
  author?: string;
}

export type MemoryCategory = 'Personal' | 'Learning' | 'Projects' | 'Ideas' | 'Preference' | 'Fact' | 'Insight' | 'Workflow';

export interface MemoryItem {
  id: string;
  userId?: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  date: string;
  sourceRef?: string;
  sourceType?: 'manual' | 'chat';
  sourceThreadId?: string;
  sourceMessageId?: string;
  pinned?: boolean;
  created_at?: string;
  updated_at?: string;
  temporal?: MemoryTemporalMetadata;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  temporalPrecision?: TemporalPrecision;
  temporalStatus?: TemporalStatus;
}

export interface MemoryVector {
  id: string;
  memoryId: string;
  userId: string;
  embedding?: number[];
  model: string;
  dimensions: number;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface SemanticSearchResult {
  memoryId: string;
  score: number;
  memory: MemoryItem;
}

export interface SemanticMemoryResult {
  memoryId: string;
  text: string;
  score: number;
  originalScore?: number;
  category?: MemoryCategory;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RagRetrievalMethod =
  | 'semantic'
  | 'hybrid'
  | 'graph'
  | 'hybrid_graph'
  | 'temporal'
  | 'hybrid_temporal'
  | 'hybrid_temporal_graph'
  | 'none';

export interface TemporalEvidence {
  memoryId: string;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  precision: TemporalPrecision;
  status?: TemporalStatus;
  isEstimated?: boolean;
  sourceText?: string;
  displayDate: string;
  formattedPrecision: string;
  timeframeDescription?: string;
}

export interface RetrievalContext {
  memories: SemanticMemoryResult[];
  retrievalMethod: RagRetrievalMethod;
  graphEvidence?: GraphEvidence[];
  temporalEvidence?: TemporalEvidence[];
  temporalScope?: {
    startDate?: string;
    endDate?: string;
    description?: string;
    isTemporalQuery: boolean;
  };
}

export interface RagSource {
  memoryId: string;
  sourceId: string; // e.g. "[M1]", "[M2]"
  score: number;
  originalScore?: number;
  text: string;
  category?: MemoryCategory;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  relevanceLabel?: string;
  isUnavailable?: boolean;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  temporalPrecision?: TemporalPrecision;
  displayDate?: string;
  formattedPrecision?: string;
}

export type SourceAttribution = RagSource;

export interface RagResult {
  answer: string;
  retrievalContext: RetrievalContext;
  grounded: boolean;
  retrievalMethod: RagRetrievalMethod;
  sources: RagSource[];
  graphEvidence?: GraphEvidence[];
  temporalEvidence?: TemporalEvidence[];
  temporalScope?: {
    startDate?: string;
    endDate?: string;
    description?: string;
    isTemporalQuery: boolean;
  };
}

export interface SemanticSearchResponse {
  query: string;
  results: SemanticSearchResult[];
}

export interface BackfillEmbeddingsResponse {
  totalMemories: number;
  alreadyIndexed: number;
  indexedNow: number;
  failed: number;
  model: string;
  dimensions: number;
}

export interface MemoryCandidate {
  id: string;
  text: string;
  category?: MemoryCategory;
  confidence?: number;
  sourceMessageId?: string;
  threadId?: string;
  detectedAt?: string;
  status?: 'pending' | 'saved' | 'dismissed';
}

export type GoalStatus = 'In Progress' | 'Planning' | 'Completed' | 'Paused';

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface GoalItem {
  id: string;
  userId?: string;
  title: string;
  description: string;
  progress: number; // 0 to 100
  status: GoalStatus;
  targetDate: string;
  relatedProjects: string[];
  milestones?: GoalMilestone[];
  category?: string;
}

export type ProjectStatus = 'In Progress' | 'Planning' | 'Completed' | 'Review';

export interface ProjectItem {
  id: string;
  userId?: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number; // 0 to 100
  technologies: string[];
  lastUpdated: string;
  repositoryUrl?: string;
  goalsLinked?: string[];
}

export type IdeaPriority = 'High' | 'Medium' | 'Low';
export type IdeaStatus = 'Raw' | 'Exploring' | 'Planned' | 'Archived';

export interface IdeaItem {
  id: string;
  userId?: string;
  title: string;
  description: string;
  tags: string[];
  priority: IdeaPriority;
  createdDate: string;
  status: IdeaStatus;
  impactScore?: number;
}

export interface LearningItem {
  id: string;
  userId?: string;
  topic: string;
  explanation: string;
  relatedKnowledge: string[];
  tags: string[];
  dateLearned: string;
  category: string;
}

export interface SourceCitation {
  title: string;
  type: DocumentType;
  snippet: string;
  relevanceScore?: number;
  sourceId?: string;
  memoryId?: string;
  category?: MemoryCategory;
  date?: string;
  relevanceLabel?: string;
  isUnavailable?: boolean;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  temporalPrecision?: TemporalPrecision;
  displayDate?: string;
  formattedPrecision?: string;
}

export interface ChatThread {
  id: string;
  userId?: string;
  title: string;
  snippet?: string;
  created_at: string;
  updated_at: string;
  messageCount?: number;
}

export interface ChatMessage {
  id: string;
  threadId?: string;
  userId?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  created_at?: string;
  sources?: SourceCitation[];
  ragSources?: RagSource[];
  grounded?: boolean;
  attachmentName?: string;
  retrievalContext?: RetrievalContext;
  graphEvidence?: GraphEvidence[];
  temporalEvidence?: TemporalEvidence[];
  temporalScope?: {
    startDate?: string;
    endDate?: string;
    description?: string;
    isTemporalQuery: boolean;
  };
}

export interface ActivityItem {
  id: string;
  type: 'document' | 'goal' | 'project' | 'learning' | 'memory' | 'chat';
  title: string;
  description: string;
  timestamp: string;
  targetTab?: NavigationTab;
}

export interface AIInsight {
  id: string;
  type: 'trend' | 'suggestion' | 'connection';
  title: string;
  content: string;
  tag: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  uid?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  joinedDate: string;
}

export interface UserSettings {
  theme: ThemeMode;
  notifications: boolean;
  aiResponseStyle: 'concise' | 'detailed' | 'socratic';
  defaultKnowledgeView: 'grid' | 'list';
  futureAi: {
    embeddingModel: string;
    llmModel: string;
    vectorDb: string;
  };
}

export interface GlobalSearchResult {
  id: string;
  title: string;
  snippet: string;
  type: 'Documents' | 'Memories' | 'Projects' | 'Learnings' | 'Ideas' | 'Goals';
  targetTab: NavigationTab;
  tags: string[];
  updatedOrDate: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

// Convenient type aliases matching core domain entities
export type Document = DocumentItem;
export type Memory = MemoryItem;
export type Goal = GoalItem;
export type Project = ProjectItem;
export type Idea = IdeaItem;
export type Learning = LearningItem;
export type SearchResult = GlobalSearchResult;

// ======================= A9.1 KNOWLEDGE GRAPH =======================
export type KnowledgeEntityType =
  | 'person'
  | 'place'
  | 'organization'
  | 'project'
  | 'event'
  | 'other';

export interface KnowledgeEntity {
  entityId: string;
  userId: string;
  name: string;
  type: KnowledgeEntityType;
  aliases?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeRelationship {
  relationshipId: string;
  userId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relation: string;
  sourceMemoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedEntity {
  name: string;
  type: KnowledgeEntityType;
  aliases?: string[];
}

export interface ExtractedRelationship {
  source: string; // "SELF" or entity name
  target: string; // entity name
  relation: string;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
}

export interface KnowledgeRebuildResult {
  success: boolean;
  entitiesCount: number;
  relationshipsCount: number;
  processedMemoriesCount: number;
  message?: string;
}

// ======================= A9.2 KNOWLEDGE RETRIEVAL & INTELLIGENCE =======================
export interface GraphEvidence {
  entityId?: string;
  sourceEntityId: string;
  sourceEntityName: string;
  targetEntityId: string;
  targetEntityName: string;
  relation: string;
  sourceMemoryIds: string[];
  relevanceReason?: string;
}

export interface GraphRetrievalResult {
  query: string;
  entities: KnowledgeEntity[];
  relationships: KnowledgeRelationship[];
  evidence: GraphEvidence[];
  supportingMemories: SemanticMemoryResult[];
  isGraphRelevant: boolean;
}

export interface KnowledgeQueryResponse {
  query: string;
  entities: KnowledgeEntity[];
  relationships: KnowledgeRelationship[];
  evidence: GraphEvidence[];
  supportingMemories: SemanticMemoryResult[];
}

// ======================= A10.1 PERSONAL TIMELINE FOUNDATION =======================
export type TemporalPrecision =
  | 'exact'
  | 'day'
  | 'month'
  | 'year'
  | 'range'
  | 'approximate'
  | 'unknown';

export type TemporalStatus =
  | 'past'
  | 'present'
  | 'future'
  | 'unknown';

export interface MemoryTemporalMetadata {
  hasTemporalReference: boolean;
  eventStartAt?: string | null; // ISO 8601 YYYY-MM-DD or full timestamp
  eventEndAt?: string | null;   // ISO 8601 YYYY-MM-DD or full timestamp for ranges
  precision: TemporalPrecision;
  timezone?: string;
  sourceText?: string;
  confidence?: number;
  isEstimated?: boolean;
  status?: TemporalStatus;
}

export interface TimelineItem {
  id: string;
  memoryId: string;
  userId: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  precision: TemporalPrecision;
  status?: TemporalStatus;
  isEstimated?: boolean;
  sourceText?: string;
  confidence?: number;
  displayDate: string;
  formattedPrecision: string;
  pinned?: boolean;
}

export interface TimelineGroup {
  periodKey: string;
  periodLabel: string;
  items: TimelineItem[];
}

export interface TimelineResponse {
  timeline: TimelineItem[];
  unknownDateItems: TimelineItem[];
  totalCount: number;
  hasUnknownCount: number;
}

export interface TimelineBackfillResult {
  success: boolean;
  totalProcessed: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  message?: string;
}


