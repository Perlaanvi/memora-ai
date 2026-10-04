import {
  DocumentItem,
  MemoryItem,
  GoalItem,
  ProjectItem,
  IdeaItem,
  LearningItem,
  ChatMessage,
  ActivityItem,
  AIInsight,
  UserProfile,
  UserSettings
} from '../types';

export const INITIAL_USER_PROFILE: UserProfile = {
  uid: '',
  name: 'User',
  email: '',
  avatarUrl: '',
  role: 'Personal Second Brain',
  joinedDate: 'Active'
};

export const INITIAL_USER_SETTINGS: UserSettings = {
  theme: 'light',
  notifications: true,
  aiResponseStyle: 'detailed',
  defaultKnowledgeView: 'grid',
  futureAi: {
    embeddingModel: 'Multimodal Vector Index',
    llmModel: 'Gemini 2.5 Flash',
    vectorDb: 'Cloud Firestore Isolation'
  }
};

// Clean empty initial data for all collections
export const INITIAL_DOCUMENTS: DocumentItem[] = [];

export const INITIAL_MEMORIES: MemoryItem[] = [];

export const INITIAL_GOALS: GoalItem[] = [];

export const INITIAL_PROJECTS: ProjectItem[] = [];

export const INITIAL_IDEAS: IdeaItem[] = [];

export const INITIAL_LEARNINGS: LearningItem[] = [];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const INITIAL_ACTIVITIES: ActivityItem[] = [];

export const INITIAL_AI_INSIGHTS: AIInsight[] = [];

export const SUGGESTED_CHAT_PROMPTS = [
  'What did I plan for this week?',
  'What were the key takeaways from my conversations yesterday?',
  'Summarize my goals and recent progress',
  'What ideas did I write down recently?'
];
