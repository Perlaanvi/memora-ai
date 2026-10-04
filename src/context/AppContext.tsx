import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  NavigationTab,
  DocumentItem,
  MemoryItem,
  MemoryCandidate,
  GoalItem,
  ProjectItem,
  IdeaItem,
  LearningItem,
  ChatMessage,
  ChatThread,
  ActivityItem,
  AIInsight,
  UserProfile,
  UserSettings,
  ThemeMode,
  ToastMessage
} from '../types';
import { apiService } from '../services/apiService';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { INITIAL_USER_PROFILE, INITIAL_USER_SETTINGS } from '../services/mockData';

interface AppContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  // Modals
  isUploadDocOpen: boolean;
  setIsUploadDocOpen: (open: boolean) => void;
  isAddMemoryOpen: boolean;
  setIsAddMemoryOpen: (open: boolean) => void;
  isCreateGoalOpen: boolean;
  setIsCreateGoalOpen: (open: boolean) => void;
  isCreateProjectOpen: boolean;
  setIsCreateProjectOpen: (open: boolean) => void;
  isCaptureIdeaOpen: boolean;
  setIsCaptureIdeaOpen: (open: boolean) => void;
  viewingDocument: DocumentItem | null;
  setViewingDocument: (doc: DocumentItem | null) => void;
  viewingLearning: LearningItem | null;
  setViewingLearning: (learning: LearningItem | null) => void;
  editingMemory: MemoryItem | null;
  setEditingMemory: (mem: MemoryItem | null) => void;
  editingGoal: GoalItem | null;
  setEditingGoal: (goal: GoalItem | null) => void;
  editingProject: ProjectItem | null;
  setEditingProject: (proj: ProjectItem | null) => void;
  editingIdea: IdeaItem | null;
  setEditingIdea: (idea: IdeaItem | null) => void;

  // Data
  documents: DocumentItem[];
  memories: MemoryItem[];
  goals: GoalItem[];
  projects: ProjectItem[];
  ideas: IdeaItem[];
  learnings: LearningItem[];
  chatThreads: ChatThread[];
  activeThreadId: string | null;
  chatMessages: ChatMessage[];
  memoryCandidates: MemoryCandidate[];
  activities: ActivityItem[];
  insights: AIInsight[];
  userProfile: UserProfile;
  userSettings: UserSettings;
  isAiTyping: boolean;
  isLoading: boolean;
  dataError: string | null;
  reloadData: () => Promise<void>;
  refreshData: () => Promise<void>;

  // Actions
  uploadDocument: (doc: Omit<DocumentItem, 'id' | 'updated'>) => Promise<DocumentItem>;
  addMemory: (memory: Omit<MemoryItem, 'id' | 'date'>) => Promise<MemoryItem>;
  updateMemory: (memory: MemoryItem) => Promise<MemoryItem>;
  deleteMemory: (id: string) => Promise<void>;
  saveMemoryCandidate: (candidateId: string, customText?: string) => Promise<void>;
  dismissMemoryCandidate: (candidateId: string) => void;
  updateMemoryCandidateText: (candidateId: string, text: string) => void;
  createGoal: (goal: Omit<GoalItem, 'id'>) => Promise<GoalItem>;
  updateGoal: (goal: GoalItem) => Promise<GoalItem>;
  createProject: (project: Omit<ProjectItem, 'id' | 'lastUpdated'>) => Promise<ProjectItem>;
  updateProject: (project: ProjectItem) => Promise<ProjectItem>;
  deleteProject: (id: string) => Promise<void>;
  captureIdea: (idea: Omit<IdeaItem, 'id' | 'createdDate'>) => Promise<IdeaItem>;
  updateIdea: (idea: IdeaItem) => Promise<IdeaItem>;
  deleteIdea: (id: string) => Promise<void>;
  addLearning: (learning: Omit<LearningItem, 'id' | 'dateLearned'>) => Promise<LearningItem>;
  deleteLearning: (id: string) => Promise<void>;
  setActiveThreadId: (id: string | null) => Promise<void>;
  createChatThread: (title?: string) => Promise<ChatThread>;
  deleteChatThread: (id: string) => Promise<void>;
  sendChatMessage: (content: string, attachmentName?: string, threadId?: string) => Promise<void>;
  clearChat: (threadId?: string) => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  updateSettings: (settings: UserSettings) => Promise<void>;
  updateUserSettings: (settings: UserSettings) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  resetToDefaultData: () => Promise<void>;
  handleSignOut: () => Promise<void>;

  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut: authSignOut } = useAuth();

  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('psb_theme') as ThemeMode;
    return saved || 'dark';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Modals state
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [isAddMemoryOpen, setIsAddMemoryOpen] = useState(false);
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCaptureIdeaOpen, setIsCaptureIdeaOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentItem | null>(null);
  const [viewingLearning, setViewingLearning] = useState<LearningItem | null>(null);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [editingIdea, setEditingIdea] = useState<IdeaItem | null>(null);

  // Data states
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [learnings, setLearnings] = useState<LearningItem[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [memoryCandidates, setMemoryCandidates] = useState<MemoryCandidate[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [userSettings, setUserSettings] = useState<UserSettings>(INITIAL_USER_SETTINGS);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Theme synchronization
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('psb_theme', newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const nextTheme: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('psb_theme', nextTheme);
      return nextTheme;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const applyDark = () => {
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };
    applyDark();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyDark();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsUploadDocOpen(false);
        setIsAddMemoryOpen(false);
        setIsCreateGoalOpen(false);
        setIsCreateProjectOpen(false);
        setIsCaptureIdeaOpen(false);
        setViewingDocument(null);
        setViewingLearning(null);
        setEditingMemory(null);
        setEditingGoal(null);
        setEditingProject(null);
        setEditingIdea(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const autoRetryCountRef = React.useRef(0);

  // Initial data load from Express API (backed by Firestore and isolated by user)
  const loadInitialData = useCallback(async () => {
    if (!user) {
      setDocuments([]);
      setMemories([]);
      setGoals([]);
      setProjects([]);
      setIdeas([]);
      setLearnings([]);
      setChatThreads([]);
      setActiveThreadIdState(null);
      setChatMessages([]);
      setMemoryCandidates([]);
      setActivities([]);
      setInsights([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let permissionDeniedCaught = false;

      const [
        apiDocs,
        apiMems,
        apiGoals,
        apiProjs,
        apiIdeas,
        apiLearnings,
        prof,
        threads,
        acts,
        ins,
        settings
      ] = await Promise.all([
        api.getDocuments().catch(err => {
          if (String(err).includes('Missing or insufficient permissions') || String(err).includes('permission-denied')) {
            permissionDeniedCaught = true;
          }
          return [];
        }),
        api.getMemories().catch(err => {
          if (String(err).includes('Missing or insufficient permissions') || String(err).includes('permission-denied')) {
            permissionDeniedCaught = true;
          }
          return [];
        }),
        api.getGoals().catch(err => {
          if (String(err).includes('Missing or insufficient permissions') || String(err).includes('permission-denied')) {
            permissionDeniedCaught = true;
          }
          return [];
        }),
        api.getProjects().catch(err => {
          if (String(err).includes('Missing or insufficient permissions') || String(err).includes('permission-denied')) {
            permissionDeniedCaught = true;
          }
          return [];
        }),
        api.getIdeas().catch(err => {
          if (String(err).includes('Missing or insufficient permissions') || String(err).includes('permission-denied')) {
            permissionDeniedCaught = true;
          }
          return [];
        }),
        api.getLearnings().catch(err => {
          if (String(err).includes('Missing or insufficient permissions') || String(err).includes('permission-denied')) {
            permissionDeniedCaught = true;
          }
          return [];
        }),
        api.getUserProfile().catch(() => ({
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role: 'Knowledge Architect',
          joinedDate: 'Active'
        })),
        api.getChatThreads().catch(() => []),
        apiService.getActivities(),
        apiService.getInsights(),
        apiService.getSettings()
      ]);

      if (permissionDeniedCaught) {
        setDataError('Firestore security rules are locked. Publish your firestore.rules in Firebase Console to enable read/write.');
        // If rules deployment was just performed, allow edge cache to settle and automatically retry once
        if (autoRetryCountRef.current < 2) {
          autoRetryCountRef.current += 1;
          setTimeout(() => {
            loadInitialData();
          }, 2000);
        }
      } else {
        autoRetryCountRef.current = 0;
        setDataError(null);
      }

      setDocuments(apiDocs);
      setMemories(apiMems);
      setGoals(apiGoals);
      setProjects(apiProjs);
      setIdeas(apiIdeas);
      setLearnings(apiLearnings);
      setUserProfile(prof);
      setChatThreads(threads);

      let initialMessages: ChatMessage[] = [];
      if (threads.length > 0) {
        const firstThreadId = threads[0].id;
        setActiveThreadIdState(firstThreadId);
        initialMessages = await api.getChatMessages(firstThreadId).catch(() => []);
      } else {
        setActiveThreadIdState(null);
      }
      setChatMessages(initialMessages);

      setActivities(acts);
      setInsights(ins);
      setUserSettings(settings);
    } catch (err: any) {
      console.error('Error loading second brain state:', err?.message || err);
      setDataError('Unable to load data from Second Brain.');
      addToast({
        type: 'error',
        title: 'Connection Notice',
        description: 'Failed to load second brain data from Firestore.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSignOut = async () => {
    try {
      await authSignOut();
      setDocuments([]);
      setMemories([]);
      setGoals([]);
      setProjects([]);
      setIdeas([]);
      setLearnings([]);
      setChatThreads([]);
      setActiveThreadIdState(null);
      setChatMessages([]);
      setMemoryCandidates([]);
      setActivities([]);
      setInsights([]);
      addToast({
        type: 'info',
        title: 'Signed Out',
        description: 'Your second brain session has ended securely.'
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Sign Out Error',
        description: err?.message || 'Failed to sign out.'
      });
    }
  };

  // Actions routing through src/services/api.ts -> Express API -> Firestore
  const uploadDocument = async (docData: Omit<DocumentItem, 'id' | 'updated'>) => {
    const created = await api.createDocument({
      title: docData.title,
      type: docData.type,
      topic: docData.topic,
      size: docData.size,
      status: docData.status,
      tags: docData.tags,
      excerpt: docData.excerpt,
      fullContent: docData.fullContent,
      chunksCount: docData.chunksCount,
      tokenCount: docData.tokenCount,
      author: docData.author
    });
    setDocuments(prev => [created, ...prev.filter(d => d.id !== created.id)]);
    await apiService.recordActivity({
      type: 'document',
      title: `Uploaded ${created.title}`,
      description: `Added ${created.type} file with ${created.tags.join(', ')} tags.`,
      targetTab: 'knowledge'
    });
    const refreshedActs = await apiService.getActivities();
    setActivities(refreshedActs);
    addToast({
      type: 'success',
      title: 'Document Saved',
      description: `"${created.title}" stored and indexed.`
    });
    return created;
  };

  const addMemory = async (memData: Omit<MemoryItem, 'id' | 'date'>) => {
    const created = await api.createMemory({
      content: memData.content,
      category: memData.category,
      tags: memData.tags,
      sourceRef: memData.sourceRef,
      pinned: memData.pinned
    });
    setMemories(prev => [created, ...prev.filter(m => m.id !== created.id)]);
    addToast({
      type: 'success',
      title: 'Memory Stored',
      description: 'Your Second Brain updated successfully.'
    });
    return created;
  };

  const updateMemory = async (mem: MemoryItem) => {
    const updated = await api.updateMemory(mem.id, {
      content: mem.content,
      category: mem.category,
      tags: mem.tags,
      sourceRef: mem.sourceRef,
      pinned: mem.pinned
    });
    setMemories(prev => prev.map(m => (m.id === mem.id ? updated : m)));
    addToast({
      type: 'info',
      title: 'Memory Updated',
      description: 'Changes saved successfully.'
    });
    return updated;
  };

  const deleteMemory = async (id: string) => {
    await api.deleteMemory(id);
    setMemories(prev => prev.filter(m => m.id !== id));
    addToast({
      type: 'info',
      title: 'Memory Removed',
      description: 'Memory removed from Second Brain.'
    });
  };

  const saveMemoryCandidate = async (candidateId: string, customText?: string) => {
    const candidate = memoryCandidates.find(c => c.id === candidateId);
    if (!candidate) return;

    const contentToSave = (customText || candidate.text).trim();
    if (!contentToSave) return;

    try {
      const created = await api.createMemory({
        content: contentToSave,
        category: candidate.category || 'Personal',
        tags: ['chat-extracted'],
        sourceRef: 'Chat Conversation',
        sourceType: 'chat',
        sourceThreadId: candidate.threadId,
        sourceMessageId: candidate.sourceMessageId
      });

      setMemories(prev => [created, ...prev.filter(m => m.id !== created.id)]);
      setMemoryCandidates(prev =>
        prev.map(c => (c.id === candidateId ? { ...c, status: 'saved' as const, text: contentToSave } : c))
      );

      addToast({
        type: 'success',
        title: 'Memory Confirmed & Saved',
        description: `Stored in your permanent Second Brain memories.`
      });
    } catch (err: any) {
      console.error('Failed to save memory candidate:', err);
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: err?.message || 'Could not save memory.'
      });
    }
  };

  const dismissMemoryCandidate = (candidateId: string) => {
    setMemoryCandidates(prev => prev.filter(c => c.id !== candidateId));
  };

  const updateMemoryCandidateText = (candidateId: string, text: string) => {
    setMemoryCandidates(prev => prev.map(c => (c.id === candidateId ? { ...c, text } : c)));
  };

  const createGoal = async (goalData: Omit<GoalItem, 'id'>) => {
    const created = await api.createGoal({
      title: goalData.title,
      description: goalData.description,
      progress: goalData.progress || 0,
      status: goalData.status,
      targetDate: goalData.targetDate,
      relatedProjects: goalData.relatedProjects || [],
      milestones: goalData.milestones || []
    });
    setGoals(prev => [created, ...prev.filter(g => g.id !== created.id)]);
    addToast({
      type: 'success',
      title: 'Goal Established',
      description: `Tracking target: ${created.title}`
    });
    return created;
  };

  const updateGoal = async (goal: GoalItem) => {
    const updated = await api.updateGoal(goal.id, {
      title: goal.title,
      description: goal.description,
      progress: goal.progress,
      status: goal.status,
      targetDate: goal.targetDate,
      relatedProjects: goal.relatedProjects,
      milestones: goal.milestones
    });
    setGoals(prev => prev.map(g => (g.id === goal.id ? updated : g)));
    addToast({
      type: 'info',
      title: 'Goal Updated',
      description: 'Milestones and progress refreshed.'
    });
    return updated;
  };

  const createProject = async (projData: Omit<ProjectItem, 'id' | 'lastUpdated'>) => {
    const created = await api.createProject({
      name: projData.name,
      description: projData.description,
      status: projData.status,
      progress: projData.progress || 0,
      technologies: projData.technologies || [],
      repositoryUrl: projData.repositoryUrl,
      goalsLinked: projData.goalsLinked || []
    });
    setProjects(prev => [created, ...prev.filter(p => p.id !== created.id)]);
    addToast({
      type: 'success',
      title: 'Project Initiated',
      description: `${created.name} created.`
    });
    return created;
  };

  const updateProject = async (project: ProjectItem) => {
    const updated = await api.updateProject(project.id, {
      name: project.name,
      description: project.description,
      status: project.status,
      progress: project.progress,
      technologies: project.technologies,
      repositoryUrl: project.repositoryUrl,
      goalsLinked: project.goalsLinked
    });
    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)));
    addToast({
      type: 'info',
      title: 'Project Updated',
      description: `${project.name} has been updated.`
    });
    return updated;
  };

  const deleteProject = async (id: string) => {
    await api.deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    addToast({
      type: 'info',
      title: 'Project Removed',
      description: 'Project archived from roadmap.'
    });
  };

  const captureIdea = async (ideaData: Omit<IdeaItem, 'id' | 'createdDate'>) => {
    const created = await api.createIdea({
      title: ideaData.title,
      description: ideaData.description,
      tags: ideaData.tags || [],
      priority: ideaData.priority,
      status: ideaData.status
    });
    setIdeas(prev => [created, ...prev.filter(i => i.id !== created.id)]);
    addToast({
      type: 'success',
      title: 'Idea Captured',
      description: `"${created.title}" saved to your backlog.`
    });
    return created;
  };

  const updateIdea = async (idea: IdeaItem) => {
    const updated = await api.updateIdea(idea.id, {
      title: idea.title,
      description: idea.description,
      tags: idea.tags,
      priority: idea.priority,
      status: idea.status
    });
    setIdeas(prev => prev.map(i => (i.id === idea.id ? updated : i)));
    addToast({
      type: 'info',
      title: 'Idea Updated',
      description: 'Priority and status updated.'
    });
    return updated;
  };

  const deleteIdea = async (id: string) => {
    await api.deleteIdea(id);
    setIdeas(prev => prev.filter(i => i.id !== id));
    addToast({
      type: 'info',
      title: 'Idea Removed',
      description: 'Idea removed from backlog.'
    });
  };

  const addLearning = async (data: Omit<LearningItem, 'id' | 'dateLearned'>) => {
    const created = await api.createLearning({
      topic: data.topic,
      explanation: data.explanation,
      relatedKnowledge: data.relatedKnowledge || [],
      tags: data.tags || [],
      category: data.category
    });
    setLearnings(prev => [created, ...prev.filter(l => l.id !== created.id)]);
    addToast({
      type: 'success',
      title: 'Learning Recorded',
      description: `Added "${created.topic}" to knowledge library.`
    });
    return created;
  };

  const deleteLearning = async (id: string) => {
    await api.deleteLearning(id);
    setLearnings(prev => prev.filter(l => l.id !== id));
    addToast({
      type: 'info',
      title: 'Learning Removed',
      description: 'Concept removed from library.'
    });
  };

  const setActiveThreadId = async (id: string | null) => {
    setActiveThreadIdState(id);
    if (id) {
      try {
        const msgs = await api.getChatMessages(id);
        setChatMessages(msgs);
      } catch (e) {
        console.warn('Failed to load thread messages:', e);
        setChatMessages([]);
      }
    } else {
      setChatMessages([]);
    }
  };

  const createChatThread = async (title = 'New Conversation'): Promise<ChatThread> => {
    const newThread = await api.createChatThread({ title });
    setChatThreads(prev => [newThread, ...prev.filter(t => t.id !== newThread.id)]);
    setActiveThreadIdState(newThread.id);
    setChatMessages([]);
    return newThread;
  };

  const deleteChatThread = async (id: string): Promise<void> => {
    try {
      await api.deleteChatThread(id);
      let remainingThreads: ChatThread[] = [];
      setChatThreads(prev => {
        remainingThreads = prev.filter(t => t.id !== id);
        return remainingThreads;
      });

      if (activeThreadId === id) {
        if (remainingThreads.length > 0) {
          const nextId = remainingThreads[0].id;
          setActiveThreadIdState(nextId);
          const msgs = await api.getChatMessages(nextId).catch(() => []);
          setChatMessages(msgs);
        } else {
          setActiveThreadIdState(null);
          setChatMessages([]);
        }
      }

      addToast({
        type: 'info',
        title: 'Conversation Deleted',
        description: 'Conversation and its messages permanently removed.'
      });
    } catch (err: any) {
      console.error('Failed to delete chat thread:', err);
      addToast({
        type: 'error',
        title: 'Delete Failed',
        description: err?.message || 'Could not delete conversation.'
      });
    }
  };

  const sendChatMessage = async (content: string, attachmentName?: string, threadId?: string) => {
    setIsAiTyping(true);
    try {
      let currentThreadId = threadId || activeThreadId;

      // If no active thread exists, create one now with a title safely derived from user's message
      if (!currentThreadId) {
        const derivedTitle = content.slice(0, 36).trim() + (content.length > 36 ? '...' : '');
        const created = await api.createChatThread({
          title: derivedTitle || 'Conversation',
          snippet: content.slice(0, 80)
        });
        currentThreadId = created.id;
        setActiveThreadIdState(created.id);
        setChatThreads(prev => [created, ...prev.filter(t => t.id !== created.id)]);
      } else {
        // Check if this thread has default title and update if it's the first message
        const existingThread = chatThreads.find(t => t.id === currentThreadId);
        if (existingThread && (existingThread.title === 'New Conversation' || !existingThread.title)) {
          const derivedTitle = content.slice(0, 36).trim() + (content.length > 36 ? '...' : '');
          api.updateChatThread(currentThreadId, { title: derivedTitle, snippet: content.slice(0, 80) })
            .then(updated => {
              setChatThreads(prev => prev.map(t => t.id === currentThreadId ? updated : t));
            })
            .catch(() => {});
        }
      }

      const now = new Date().toISOString();
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        threadId: currentThreadId,
        role: 'user',
        content,
        timestamp: 'Just now',
        created_at: now,
        ...(attachmentName ? { attachmentName } : {})
      };

      setChatMessages(prev => [...prev, userMsg]);
      // Persist user message to Firestore
      await api.saveChatMessage(userMsg);

      // Build grounded personal context from authenticated user's records
      const chatContext = {
        documents: documents.slice(0, 10).map(d => ({ title: d.title, excerpt: d.excerpt || d.fullContent })),
        memories: memories.slice(0, 50).map(m => ({
          id: m.id,
          category: m.category,
          content: m.content,
          date: m.date,
          created_at: m.created_at,
          eventStartAt: m.eventStartAt || (m as any).temporal?.eventStartAt,
          eventEndAt: m.eventEndAt || (m as any).temporal?.eventEndAt,
          temporal: (m as any).temporal
        })),
        goals: goals.slice(0, 15).map(g => ({ title: g.title, progress: g.progress, status: g.status, targetDate: g.targetDate })),
        ideas: ideas.slice(0, 15).map(i => ({ title: i.title, description: i.description, priority: i.priority, status: i.status })),
        projects: projects.slice(0, 15).map(p => ({ name: p.name, description: p.description, status: p.status, progress: p.progress }))
      };

      // Prepare multi-turn history from current thread for conversation continuity
      const historyTurns = chatMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      let assistantContent = '';
      let chatRetrievalContext: any = undefined;
      let ragSources: any[] = [];
      let chatResponse: any = null;
      try {
        const res = await api.chat(content, chatContext, historyTurns, currentThreadId);
        chatResponse = res;
        if (res && res.reply) {
          assistantContent = res.reply;
        }
        if (res && res.retrievalContext) {
          chatRetrievalContext = res.retrievalContext;
        }
        if (res && res.sources) {
          ragSources = res.sources;
        }
      } catch (chatErr: any) {
        console.warn('Backend AI chat error:', chatErr);
        assistantContent = "I couldn't generate a response right now. Please try again.";
      }

      if (!assistantContent) {
        assistantContent = "I couldn't generate a response right now. Please try again.";
      }

      const memorySources = ragSources.length > 0
        ? ragSources.map((s: any) => {
            const item: any = {
              sourceId: s.sourceId || '',
              memoryId: s.memoryId || '',
              title: `${s.sourceId ? s.sourceId + ' ' : ''}${s.category || 'Personal'} Memory`,
              type: 'Notes' as const,
              snippet: s.text || '',
              category: s.category || 'Personal',
              date: s.displayDate || s.date || 'Recorded memory',
              relevanceScore: typeof s.score === 'number' ? s.score : 0.7,
              relevanceLabel: s.relevanceLabel || (s.score >= 0.75 ? 'Highly relevant' : s.score >= 0.60 ? 'Relevant' : 'Related evidence')
            };
            if (s.eventStartAt) item.eventStartAt = s.eventStartAt;
            if (s.eventEndAt) item.eventEndAt = s.eventEndAt;
            if (s.temporalPrecision) item.temporalPrecision = s.temporalPrecision;
            if (s.displayDate) item.displayDate = s.displayDate;
            if (s.formattedPrecision) item.formattedPrecision = s.formattedPrecision;
            return item;
          })
        : (chatRetrievalContext?.memories || []).map((m: any, idx: number) => ({
            sourceId: `[M${idx + 1}]`,
            memoryId: m.memoryId || m.id || '',
            title: `[M${idx + 1}] ${m.category || 'Personal'} Memory`,
            type: 'Notes' as const,
            snippet: m.text || '',
            category: m.category || 'Personal',
            date: m.date || 'Recorded memory',
            relevanceScore: typeof m.score === 'number' ? m.score : 0.75,
            relevanceLabel: (m.score || 0) >= 0.75 ? 'Highly relevant' : 'Relevant'
          }));

      const isGroundedResponse = Boolean(
        (chatResponse && typeof chatResponse.grounded === 'boolean') ? chatResponse.grounded : memorySources.length > 0
      );

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        threadId: currentThreadId,
        role: 'assistant',
        content: assistantContent,
        timestamp: 'Just now',
        created_at: new Date().toISOString(),
        grounded: isGroundedResponse,
        ...(chatRetrievalContext ? { retrievalContext: chatRetrievalContext } : {}),
        ...(memorySources.length > 0 ? { sources: memorySources } : {}),
        ...(ragSources.length > 0 ? { ragSources } : {}),
        ...(chatResponse?.graphEvidence ? { graphEvidence: chatResponse.graphEvidence } : {}),
        ...(chatResponse?.temporalEvidence ? { temporalEvidence: chatResponse.temporalEvidence } : {}),
        ...(chatResponse?.temporalScope ? {
          temporalScope: {
            isTemporalQuery: Boolean(chatResponse.temporalScope.isTemporalQuery),
            ...(chatResponse.temporalScope.startDate ? { startDate: chatResponse.temporalScope.startDate } : {}),
            ...(chatResponse.temporalScope.endDate ? { endDate: chatResponse.temporalScope.endDate } : {}),
            ...(chatResponse.temporalScope.description ? { description: chatResponse.temporalScope.description } : {})
          }
        } : {})
      };

      setChatMessages(prev => [...prev, assistantMsg]);
      // Persist assistant response to Firestore
      await api.saveChatMessage(assistantMsg);

      // Update thread snippet in state
      setChatThreads(prev => prev.map(t => {
        if (t.id === currentThreadId) {
          return {
            ...t,
            snippet: assistantContent.slice(0, 80),
            updated_at: new Date().toISOString()
          };
        }
        return t;
      }));

      // Asynchronously trigger memory candidate extraction (strictly non-blocking & failsafe)
      api.extractMemoryCandidates({
        message: content,
        history: historyTurns.slice(-2),
        existingMemories: memories.map(m => m.content),
        threadId: currentThreadId,
        sourceMessageId: userMsg.id
      }).then(res => {
        if (res && Array.isArray(res.candidates) && res.candidates.length > 0) {
          setMemoryCandidates(prev => {
            const existingTexts = new Set(prev.map(c => c.text.toLowerCase().trim()));
            const newUnique = res.candidates.filter(c => !existingTexts.has(c.text.toLowerCase().trim()));
            return [...prev, ...newUnique];
          });
        }
      }).catch(err => {
        console.warn('Silent memory extraction fallback:', err);
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      addToast({
        type: 'error',
        title: 'Chat Notice',
        description: 'Failed to generate or save chat message.'
      });
    } finally {
      setIsAiTyping(false);
    }
  };

  const clearChat = async (threadId?: string) => {
    const targetId = threadId || activeThreadId;
    if (targetId) {
      try {
        await api.clearChatMessages(targetId);
      } catch (e) {
        console.warn('Failed to clear Firestore chat:', e);
      }
    }
    setChatMessages([]);
    addToast({
      type: 'info',
      title: 'Chat Reset',
      description: 'Conversation context cleared.'
    });
  };

  const updateProfile = async (profile: UserProfile) => {
    try {
      const updated = await api.updateUserProfile(profile);
      setUserProfile(updated);
      addToast({
        type: 'success',
        title: 'Profile Updated',
        description: 'Personal details saved.'
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Profile Update Failed',
        description: err?.message || 'Failed to save profile'
      });
    }
  };

  const updateSettings = async (settings: UserSettings) => {
    await apiService.updateSettings(settings);
    setUserSettings(settings);
    addToast({
      type: 'success',
      title: 'Preferences Saved',
      description: 'Configuration updated.'
    });
  };

  const resetToDefaults = async () => {
    await apiService.resetAllToDefaults();
    await loadInitialData();
    addToast({
      type: 'info',
      title: 'Data Reset',
      description: 'Restored realistic mock dataset.'
    });
  };

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        theme,
        setTheme,
        toggleTheme,
        isSidebarCollapsed,
        toggleSidebar,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        isSearchOpen,
        setIsSearchOpen,
        isUploadDocOpen,
        setIsUploadDocOpen,
        isAddMemoryOpen,
        setIsAddMemoryOpen,
        isCreateGoalOpen,
        setIsCreateGoalOpen,
        isCreateProjectOpen,
        setIsCreateProjectOpen,
        isCaptureIdeaOpen,
        setIsCaptureIdeaOpen,
        viewingDocument,
        setViewingDocument,
        viewingLearning,
        setViewingLearning,
        editingMemory,
        setEditingMemory,
        editingGoal,
        setEditingGoal,
        editingProject,
        setEditingProject,
        editingIdea,
        setEditingIdea,
        documents,
        memories,
        goals,
        projects,
        ideas,
        learnings,
        chatThreads,
        activeThreadId,
        chatMessages,
        memoryCandidates,
        activities,
        insights,
        userProfile,
        userSettings,
        isAiTyping,
        isLoading,
        dataError,
        reloadData: loadInitialData,
        refreshData: loadInitialData,
        uploadDocument,
        addMemory,
        updateMemory,
        deleteMemory,
        saveMemoryCandidate,
        dismissMemoryCandidate,
        updateMemoryCandidateText,
        createGoal,
        updateGoal,
        createProject,
        updateProject,
        deleteProject,
        captureIdea,
        updateIdea,
        deleteIdea,
        addLearning,
        deleteLearning,
        setActiveThreadId,
        createChatThread,
        deleteChatThread,
        sendChatMessage,
        clearChat,
        updateProfile,
        updateSettings,
        updateUserSettings: updateSettings,
        resetToDefaults,
        resetToDefaultData: resetToDefaults,
        handleSignOut,
        toasts,
        addToast,
        removeToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
