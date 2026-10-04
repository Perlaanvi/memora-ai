/**
 * FRONTEND SERVICES LAYER
 * 
 * Current Stage: Frontend-only prototype with mock client-side services & localStorage persistence.
 * Note: No live backend, Hugging Face, Gemini, OpenAI, or vector databases are connected.
 * 
 * Future Architecture:
 * Frontend -> Frontend services (this layer) -> FastAPI backend -> AI/RAG system
 */

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
  GlobalSearchResult,
  UserProfile,
  UserSettings
} from '../types';
import {
  INITIAL_DOCUMENTS,
  INITIAL_MEMORIES,
  INITIAL_GOALS,
  INITIAL_PROJECTS,
  INITIAL_IDEAS,
  INITIAL_LEARNINGS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_ACTIVITIES,
  INITIAL_AI_INSIGHTS,
  INITIAL_USER_PROFILE,
  INITIAL_USER_SETTINGS
} from './mockData';
import { auth } from './firebase';

const STORAGE_KEYS = {
  DOCUMENTS: 'memora_documents_v2',
  MEMORIES: 'memora_memories_v2',
  GOALS: 'memora_goals_v2',
  PROJECTS: 'memora_projects_v2',
  IDEAS: 'memora_ideas_v2',
  LEARNINGS: 'memora_learnings_v2',
  CHAT: 'memora_chat_messages_v2',
  ACTIVITIES: 'memora_activities_v2',
  PROFILE: 'memora_user_profile_v2',
  SETTINGS: 'memora_user_settings_v2'
};

function getScopedKey(baseKey: string): string {
  const uid = auth.currentUser?.uid;
  return uid ? `${baseKey}_${uid}` : `${baseKey}_anon`;
}

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const scopedKey = getScopedKey(key);
    const item = localStorage.getItem(scopedKey);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    const scopedKey = getScopedKey(key);
    localStorage.setItem(scopedKey, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to persist ${key} to localStorage:`, e);
  }
}

// Simulated network latency for realistic feel
const delay = (ms: number = 200) => new Promise(resolve => setTimeout(resolve, ms));

export const apiService = {
  // ================= DOCUMENTS =================
  async getDocuments(): Promise<DocumentItem[]> {
    await delay(150);
    return loadStorage<DocumentItem[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
  },

  async uploadDocument(docData: Omit<DocumentItem, 'id' | 'updated'>): Promise<DocumentItem> {
    await delay(300);
    const existing = loadStorage<DocumentItem[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    const newDoc: DocumentItem = {
      ...docData,
      id: `doc-${Date.now()}`,
      updated: 'Just now',
      chunksCount: docData.chunksCount || Math.floor(Math.random() * 30) + 12,
      tokenCount: docData.tokenCount || Math.floor(Math.random() * 12000) + 3000
    };
    const updatedList = [newDoc, ...existing];
    saveStorage(STORAGE_KEYS.DOCUMENTS, updatedList);

    // Record activity
    await this.recordActivity({
      type: 'document',
      title: `Uploaded ${newDoc.title}`,
      description: `Added ${newDoc.type} file with ${newDoc.tags.join(', ')} tags.`,
      targetTab: 'knowledge'
    });

    return newDoc;
  },

  // ================= MEMORIES =================
  async getMemories(): Promise<MemoryItem[]> {
    await delay(150);
    return loadStorage<MemoryItem[]>(STORAGE_KEYS.MEMORIES, INITIAL_MEMORIES);
  },

  async addMemory(memoryData: Omit<MemoryItem, 'id' | 'date'>): Promise<MemoryItem> {
    await delay(200);
    const existing = loadStorage<MemoryItem[]>(STORAGE_KEYS.MEMORIES, INITIAL_MEMORIES);
    const today = new Date().toISOString().split('T')[0];
    const newMemory: MemoryItem = {
      ...memoryData,
      id: `mem-${Date.now()}`,
      date: today
    };
    const updatedList = [newMemory, ...existing];
    saveStorage(STORAGE_KEYS.MEMORIES, updatedList);

    await this.recordActivity({
      type: 'memory',
      title: 'Captured a new memory',
      description: `"${newMemory.content.slice(0, 45)}..."`,
      targetTab: 'memories'
    });

    return newMemory;
  },

  async updateMemory(memory: MemoryItem): Promise<MemoryItem> {
    await delay(200);
    const existing = loadStorage<MemoryItem[]>(STORAGE_KEYS.MEMORIES, INITIAL_MEMORIES);
    const updatedList = existing.map(m => m.id === memory.id ? memory : m);
    saveStorage(STORAGE_KEYS.MEMORIES, updatedList);
    return memory;
  },

  async deleteMemory(id: string): Promise<boolean> {
    await delay(150);
    const existing = loadStorage<MemoryItem[]>(STORAGE_KEYS.MEMORIES, INITIAL_MEMORIES);
    const updatedList = existing.filter(m => m.id !== id);
    saveStorage(STORAGE_KEYS.MEMORIES, updatedList);
    return true;
  },

  // ================= GOALS =================
  async getGoals(): Promise<GoalItem[]> {
    await delay(150);
    return loadStorage<GoalItem[]>(STORAGE_KEYS.GOALS, INITIAL_GOALS);
  },

  async createGoal(goalData: Omit<GoalItem, 'id'>): Promise<GoalItem> {
    await delay(250);
    const existing = loadStorage<GoalItem[]>(STORAGE_KEYS.GOALS, INITIAL_GOALS);
    const newGoal: GoalItem = {
      ...goalData,
      id: `goal-${Date.now()}`
    };
    const updatedList = [newGoal, ...existing];
    saveStorage(STORAGE_KEYS.GOALS, updatedList);

    await this.recordActivity({
      type: 'goal',
      title: `Created goal: ${newGoal.title}`,
      description: `Set target date for ${newGoal.targetDate}.`,
      targetTab: 'goals'
    });

    return newGoal;
  },

  async updateGoal(goal: GoalItem): Promise<GoalItem> {
    await delay(200);
    const existing = loadStorage<GoalItem[]>(STORAGE_KEYS.GOALS, INITIAL_GOALS);
    const updatedList = existing.map(g => g.id === goal.id ? goal : g);
    saveStorage(STORAGE_KEYS.GOALS, updatedList);
    return goal;
  },

  // ================= PROJECTS =================
  async getProjects(): Promise<ProjectItem[]> {
    await delay(150);
    return loadStorage<ProjectItem[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
  },

  async createProject(projectData: Omit<ProjectItem, 'id' | 'lastUpdated'>): Promise<ProjectItem> {
    await delay(250);
    const existing = loadStorage<ProjectItem[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
    const newProject: ProjectItem = {
      ...projectData,
      id: `proj-${Date.now()}`,
      lastUpdated: 'Just now'
    };
    const updatedList = [newProject, ...existing];
    saveStorage(STORAGE_KEYS.PROJECTS, updatedList);

    await this.recordActivity({
      type: 'project',
      title: `Started project: ${newProject.name}`,
      description: `${newProject.description.slice(0, 50)}...`,
      targetTab: 'projects'
    });

    return newProject;
  },

  async updateProject(project: ProjectItem): Promise<ProjectItem> {
    await delay(150);
    const existing = loadStorage<ProjectItem[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
    const updatedList = existing.map(p => p.id === project.id ? { ...project, lastUpdated: 'Just now' } : p);
    saveStorage(STORAGE_KEYS.PROJECTS, updatedList);
    return project;
  },

  async deleteProject(id: string): Promise<boolean> {
    await delay(150);
    const existing = loadStorage<ProjectItem[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
    const updatedList = existing.filter(p => p.id !== id);
    saveStorage(STORAGE_KEYS.PROJECTS, updatedList);
    return true;
  },

  // ================= IDEAS =================
  async getIdeas(): Promise<IdeaItem[]> {
    await delay(150);
    return loadStorage<IdeaItem[]>(STORAGE_KEYS.IDEAS, INITIAL_IDEAS);
  },

  async captureIdea(ideaData: Omit<IdeaItem, 'id' | 'createdDate'>): Promise<IdeaItem> {
    await delay(200);
    const existing = loadStorage<IdeaItem[]>(STORAGE_KEYS.IDEAS, INITIAL_IDEAS);
    const today = new Date().toISOString().split('T')[0];
    const newIdea: IdeaItem = {
      ...ideaData,
      id: `idea-${Date.now()}`,
      createdDate: today,
      impactScore: Math.floor(Math.random() * 30) + 70
    };
    const updatedList = [newIdea, ...existing];
    saveStorage(STORAGE_KEYS.IDEAS, updatedList);

    await this.recordActivity({
      type: 'learning',
      title: `Captured idea: ${newIdea.title}`,
      description: `Priority: ${newIdea.priority} | Status: ${newIdea.status}`,
      targetTab: 'ideas'
    });

    return newIdea;
  },

  async updateIdea(idea: IdeaItem): Promise<IdeaItem> {
    await delay(150);
    const existing = loadStorage<IdeaItem[]>(STORAGE_KEYS.IDEAS, INITIAL_IDEAS);
    const updatedList = existing.map(i => i.id === idea.id ? idea : i);
    saveStorage(STORAGE_KEYS.IDEAS, updatedList);
    return idea;
  },

  async deleteIdea(id: string): Promise<boolean> {
    await delay(150);
    const existing = loadStorage<IdeaItem[]>(STORAGE_KEYS.IDEAS, INITIAL_IDEAS);
    const updatedList = existing.filter(i => i.id !== id);
    saveStorage(STORAGE_KEYS.IDEAS, updatedList);
    return true;
  },

  // ================= LEARNINGS =================
  async getLearnings(): Promise<LearningItem[]> {
    await delay(150);
    return loadStorage<LearningItem[]>(STORAGE_KEYS.LEARNINGS, INITIAL_LEARNINGS);
  },

  async addLearning(data: Omit<LearningItem, 'id' | 'dateLearned'>): Promise<LearningItem> {
    await delay(200);
    const existing = loadStorage<LearningItem[]>(STORAGE_KEYS.LEARNINGS, INITIAL_LEARNINGS);
    const today = new Date().toISOString().split('T')[0];
    const newLearning: LearningItem = {
      ...data,
      id: `learn-${Date.now()}`,
      dateLearned: today
    };
    const updatedList = [newLearning, ...existing];
    saveStorage(STORAGE_KEYS.LEARNINGS, updatedList);

    await this.recordActivity({
      type: 'learning',
      title: `Saved learning: ${newLearning.topic}`,
      description: newLearning.explanation.slice(0, 50) + '...',
      targetTab: 'learnings'
    });

    return newLearning;
  },

  async deleteLearning(id: string): Promise<boolean> {
    await delay(150);
    const existing = loadStorage<LearningItem[]>(STORAGE_KEYS.LEARNINGS, INITIAL_LEARNINGS);
    const updatedList = existing.filter(l => l.id !== id);
    saveStorage(STORAGE_KEYS.LEARNINGS, updatedList);
    return true;
  },

  // ================= CHAT =================
  async getChatHistory(): Promise<ChatMessage[]> {
    await delay(100);
    return loadStorage<ChatMessage[]>(STORAGE_KEYS.CHAT, INITIAL_CHAT_MESSAGES);
  },

  async sendChatMessage(userText: string, attachmentName?: string): Promise<{ userMsg: ChatMessage; assistantMsg: ChatMessage }> {
    const existing = loadStorage<ChatMessage[]>(STORAGE_KEYS.CHAT, INITIAL_CHAT_MESSAGES);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: `Today at ${nowStr}`,
      attachmentName
    };

    // Realistic mock response logic matching knowledge queries
    await delay(600); // Simulate model thought process

    const lower = userText.toLowerCase();
    let replyContent = '';
    let sources: ChatMessage['sources'] = [];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          replyContent = data.reply;
        }
      }
    } catch {
      // Fall through to local synthesis
    }

    if (!replyContent) {
      if (lower.includes('memory') || lower.includes('memories') || lower.includes('remember')) {
        replyContent = `I searched your MEMORA vault. You currently don't have any memories saved for that query yet.\n\nTo record a memory, click "+ Add Memory" from the Memories tab, or write what you'd like to remember here and I'll help you capture it.`;
      } else if (lower.includes('goal') || lower.includes('progress') || lower.includes('milestone')) {
        replyContent = `You don't have any active goals matching that query yet. Head over to the Goals tab to define personal goals and track milestones.`;
      } else if (lower.includes('project') || lower.includes('initiative')) {
        replyContent = `No project entries found in your vault matching that query. You can track personal projects and roadmaps under the Projects tab.`;
      } else if (lower.includes('idea') || lower.includes('thought') || lower.includes('spark')) {
        replyContent = `No ideas captured matching that query yet. Use the Ideas tab to quickly save thoughts, reflections, and creative sparks.`;
      } else if (lower.includes('plan') || lower.includes('week') || lower.includes('today')) {
        replyContent = `You have no active plans or reminders logged for this week yet. You can log tasks and reminders through your memories or goals.`;
      } else {
        replyContent = `I am MEMORA, your personal life-memory assistant.\n\nI help you remember important events, record daily memories, store conversations, track personal goals and projects, and capture ideas. Ask me questions about anything you've stored in MEMORA, and I will retrieve your actual records!`;
      }
      sources = [];
    }

    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: replyContent,
      timestamp: `Today at ${nowStr}`,
      sources
    };

    const updated = [...existing, userMsg, assistantMsg];
    saveStorage(STORAGE_KEYS.CHAT, updated);

    return { userMsg, assistantMsg };
  },

  async clearChat(): Promise<void> {
    saveStorage(STORAGE_KEYS.CHAT, []);
  },

  // ================= ACTIVITIES & INSIGHTS =================
  async getActivities(): Promise<ActivityItem[]> {
    await delay(100);
    return loadStorage<ActivityItem[]>(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
  },

  async recordActivity(activityData: Omit<ActivityItem, 'id' | 'timestamp'>): Promise<ActivityItem> {
    const existing = loadStorage<ActivityItem[]>(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
    const newActivity: ActivityItem = {
      ...activityData,
      id: `act-${Date.now()}`,
      timestamp: 'Just now'
    };
    const updated = [newActivity, ...existing.slice(0, 19)];
    saveStorage(STORAGE_KEYS.ACTIVITIES, updated);
    return newActivity;
  },

  async getInsights(): Promise<AIInsight[]> {
    await delay(100);
    return INITIAL_AI_INSIGHTS;
  },

  // ================= GLOBAL SEARCH =================
  async globalSearch(query: string): Promise<GlobalSearchResult[]> {
    await delay(120);
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const results: GlobalSearchResult[] = [];

    // Search Documents
    const docs = loadStorage<DocumentItem[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    docs.forEach(d => {
      if (
        d.title.toLowerCase().includes(q) ||
        d.topic.toLowerCase().includes(q) ||
        d.excerpt.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q))
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

    // Search Memories
    const memories = loadStorage<MemoryItem[]>(STORAGE_KEYS.MEMORIES, INITIAL_MEMORIES);
    memories.forEach(m => {
      if (
        m.content.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q))
      ) {
        results.push({
          id: m.id,
          title: `Memory: ${m.category}`,
          snippet: m.content,
          type: 'Memories',
          targetTab: 'memories',
          tags: m.tags,
          updatedOrDate: m.date
        });
      }
    });

    // Search Projects
    const projects = loadStorage<ProjectItem[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
    projects.forEach(p => {
      if (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.technologies.some(t => t.toLowerCase().includes(q))
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

    // Search Learnings
    const learnings = loadStorage<LearningItem[]>(STORAGE_KEYS.LEARNINGS, INITIAL_LEARNINGS);
    learnings.forEach(l => {
      if (
        l.topic.toLowerCase().includes(q) ||
        l.explanation.toLowerCase().includes(q) ||
        l.tags.some(t => t.toLowerCase().includes(q))
      ) {
        results.push({
          id: l.id,
          title: `Learning: ${l.topic}`,
          snippet: l.explanation,
          type: 'Learnings',
          targetTab: 'learnings',
          tags: l.tags,
          updatedOrDate: l.dateLearned
        });
      }
    });

    // Search Ideas
    const ideas = loadStorage<IdeaItem[]>(STORAGE_KEYS.IDEAS, INITIAL_IDEAS);
    ideas.forEach(i => {
      if (
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      ) {
        results.push({
          id: i.id,
          title: `Idea: ${i.title}`,
          snippet: i.description,
          type: 'Ideas',
          targetTab: 'ideas',
          tags: i.tags,
          updatedOrDate: i.createdDate
        });
      }
    });

    // Search Goals
    const goals = loadStorage<GoalItem[]>(STORAGE_KEYS.GOALS, INITIAL_GOALS);
    goals.forEach(g => {
      if (
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
      ) {
        results.push({
          id: g.id,
          title: `Goal: ${g.title}`,
          snippet: g.description,
          type: 'Goals',
          targetTab: 'goals',
          tags: [g.status, `${g.progress}%`],
          updatedOrDate: g.targetDate
        });
      }
    });

    return results;
  },

  // ================= PROFILE & SETTINGS =================
  async getProfile(): Promise<UserProfile> {
    await delay(50);
    return loadStorage<UserProfile>(STORAGE_KEYS.PROFILE, INITIAL_USER_PROFILE);
  },

  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    await delay(100);
    saveStorage(STORAGE_KEYS.PROFILE, profile);
    return profile;
  },

  async getSettings(): Promise<UserSettings> {
    await delay(50);
    return loadStorage<UserSettings>(STORAGE_KEYS.SETTINGS, INITIAL_USER_SETTINGS);
  },

  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    await delay(100);
    saveStorage(STORAGE_KEYS.SETTINGS, settings);
    return settings;
  },

  async resetAllToDefaults(): Promise<void> {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  }
};

// Explicit alias designating mock implementation during frontend-only phase
export const mockApiService = apiService;
