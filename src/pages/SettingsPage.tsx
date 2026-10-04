import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input, Select } from '../components/common/Input';
import { Avatar } from '../components/common/Avatar';
import { api } from '../services/api';
import { SemanticSearchResult, BackfillEmbeddingsResponse } from '../types';
import {
  User,
  Sun,
  Moon,
  Monitor,
  Sliders,
  Sparkles,
  Bot,
  Database,
  RotateCcw,
  Check,
  Bell,
  Eye,
  Shield,
  Clock,
  Layers,
  HardDrive,
  KeyRound,
  ShieldCheck,
  LogOut,
  Search,
  Cpu,
  RefreshCw,
  Zap
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    theme,
    toggleTheme,
    userSettings,
    updateUserSettings,
    resetToDefaultData,
    userProfile,
    updateProfile,
    handleSignOut,
    documents,
    memories,
    goals,
    projects,
    learnings,
    addToast
  } = useApp();

  const { user } = useAuth();

  // Profile form state
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [role, setRole] = useState(userProfile.role);

  // Preferences form state
  const [defaultView, setDefaultView] = useState<'grid' | 'list'>(userSettings.defaultKnowledgeView || 'grid');
  const [notifications, setNotifications] = useState(userSettings.notifications);
  const [responseStyle, setResponseStyle] = useState<'concise' | 'detailed' | 'academic'>(userSettings.aiResponseStyle || 'detailed');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Semantic Memory Index State
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillEmbeddingsResponse | null>(null);
  const [testSemanticQuery, setTestSemanticQuery] = useState('');
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[] | null>(null);

  const handleRunBackfill = async () => {
    setIsBackfilling(true);
    try {
      const res = await api.backfillEmbeddings();
      setBackfillResult(res);
      addToast({
        type: 'success',
        title: 'Memory Embeddings Synced',
        description: `Successfully indexed ${res.indexedNow} memories. ${res.alreadyIndexed} already up to date.`
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Backfill Error',
        description: err?.message || 'Failed to sync memory embeddings'
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleTestSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSemanticQuery.trim()) return;
    setIsSearchingSemantic(true);
    try {
      const res = await api.semanticSearch(testSemanticQuery.trim(), 4, 0.25);
      setSemanticResults(res.results);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Search Error',
        description: err?.message || 'Semantic test query failed'
      });
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({
        ...userProfile,
        name: name.trim() || userProfile.name,
        email: email.trim() || userProfile.email,
        role: role.trim() || userProfile.role
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserSettings({
      defaultKnowledgeView: defaultView,
      notifications,
      aiResponseStyle: responseStyle
    });
    addToast({
      type: 'success',
      title: 'Preferences Saved',
      description: 'Workspace preferences updated successfully.'
    });
  };

  const handleReset = () => {
    resetToDefaultData();
    setShowConfirmReset(false);
  };

  return (
    <div className="space-y-4 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Settings
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Manage your profile, appearance, workspace preferences, and AI integration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* ================= SECTION 1: PROFILE ================= */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Profile
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Your identity across the Second Brain workspace.
                </p>
              </div>
            </div>
            <Badge variant="neutral" size="sm">Active User</Badge>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div className="flex items-center gap-3 pb-2">
              <Avatar
                src={userProfile.avatarUrl}
                name={userProfile.name}
                size="lg"
              />
              <div className="min-w-0">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block truncate">
                  {userProfile.name}
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block truncate">
                  {userProfile.email}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Joined {userProfile.joinedDate}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Jordan Miller"
              />
              <Input
                label="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. jordan@example.com"
              />
            </div>

            <Input
              label="Role / Focus"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g. Knowledge Architect & AI Researcher"
            />

            <div className="flex justify-end pt-1">
              <Button type="submit" variant="secondary" size="sm" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </div>

        {/* ================= SECTION: ACCOUNT & VAULT SECURITY ================= */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Account & Data Isolation
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Cryptographic Firebase Authentication and Firestore multi-user isolation.
                </p>
              </div>
            </div>
            <Badge variant="success" size="sm">Verified Session</Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Authenticated UID:</span>
                <span className="font-mono text-[11px] text-neutral-800 dark:text-neutral-200 bg-neutral-200/50 dark:bg-neutral-900/60 px-2 py-0.5 rounded">
                  {user?.uid || 'Not authenticated'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Account Email:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {user?.email || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Security Model:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Server-verified Bearer Token + Rule Enforced
                </span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Every document, memory, goal, project, idea, and learning you record is strictly bound to your authenticated User ID. No other user can read or modify your personal knowledge.
            </p>

            <div className="pt-2 flex justify-end">
              <Button
                id="settings-signout-btn"
                variant="danger"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Second Brain</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ================= SECTION 2: APPEARANCE ================= */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Appearance
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Interface styling, theme contrast, and layout density.
                </p>
              </div>
            </div>
            <Badge variant="primary" size="sm">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </Badge>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Theme Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (theme !== 'light') toggleTheme();
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-neutral-100/90 dark:bg-neutral-800 border-indigo-500 text-neutral-900 dark:text-neutral-50 shadow-2xs ring-1 ring-indigo-500/20'
                      : 'border-neutral-200/90 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Light Theme</span>
                  </div>
                  {theme === 'light' && <Check className="w-4 h-4 text-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (theme !== 'dark') toggleTheme();
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-neutral-800/90 border-indigo-500 text-neutral-50 shadow-2xs ring-1 ring-indigo-500/20'
                      : 'border-neutral-200/90 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Dark Theme</span>
                  </div>
                  {theme === 'dark' && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
              <span className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Layout Density
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Optimized for compact, balanced information density following the Dashboard layout rules.
              </p>
            </div>
          </div>
        </div>

        {/* ================= SECTION 3: PREFERENCES ================= */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Preferences
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Configure default document views and notifications.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Default Knowledge View"
                value={defaultView}
                onChange={e => setDefaultView(e.target.value as 'grid' | 'list')}
                options={[
                  { label: 'Compact Grid', value: 'grid' },
                  { label: 'Structured List', value: 'list' }
                ]}
              />

              <Select
                label="AI Response Tone"
                value={responseStyle}
                onChange={e => setResponseStyle(e.target.value as any)}
                options={[
                  { label: 'Detailed & Structured', value: 'detailed' },
                  { label: 'Concise & Direct', value: 'concise' },
                  { label: 'Academic & Mathematical', value: 'academic' }
                ]}
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-neutral-500" />
                <div>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
                    Goal & Milestone Notifications
                  </span>
                  <span className="text-[11px] text-neutral-400 block">
                    Show status updates and reminders for active deadlines
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications}
                onChange={e => setNotifications(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmReset(true)}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
              >
                Reset Default Data
              </button>

              <Button type="submit" variant="secondary" size="sm">
                Save Preferences
              </Button>
            </div>
          </form>
        </div>

        {/* ================= SECTION 4: SEMANTIC MEMORY INDEX (PHASE A5) ================= */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Semantic Memory Index
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Vector embeddings and semantic retrieval for confirmed personal memories.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300/70 dark:border-indigo-700/70 shadow-2xs">
              <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              Phase A5 Active
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Active Model & Architecture specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-500" />
                    Embedding Model
                  </span>
                  <Badge variant="primary" size="sm">Active</Badge>
                </div>
                <div className="text-xs font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  gemini-embedding-2-preview
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  768-dim normalized vectors with MRL truncation.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Vector Storage
                  </span>
                  <Badge variant="success" size="sm">Isolated</Badge>
                </div>
                <div className="text-xs font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  /memory_vectors/{'{memoryId}'}
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Multi-tenant isolation strictly keyed to your user ID.
                </div>
              </div>
            </div>

            {/* Backfill & Sync Action */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
                  Embedding Index Synchronization
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                  Ensure all confirmed memories have fresh semantic vectors.
                </span>
                {backfillResult && (
                  <div className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {backfillResult.totalMemories} memories checked: {backfillResult.indexedNow} indexed, {backfillResult.alreadyIndexed} up-to-date.
                    </span>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRunBackfill}
                disabled={isBackfilling}
                className="whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isBackfilling ? 'animate-spin' : ''}`} />
                {isBackfilling ? 'Syncing...' : 'Sync / Backfill Embeddings'}
              </Button>
            </div>

            {/* Test Semantic Probe Console */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2.5">
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
                Test Semantic Retrieval Probe
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Enter a conceptual query to test similarity matching against your memories without exact keywords:
              </p>

              <form onSubmit={handleTestSemanticSearch} className="flex gap-2">
                <input
                  type="text"
                  value={testSemanticQuery}
                  onChange={e => setTestSemanticQuery(e.target.value)}
                  placeholder="e.g. 'chai with friend' or 'learning roadmap'..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSearchingSemantic || !testSemanticQuery.trim()}
                >
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                  {isSearchingSemantic ? 'Probing...' : 'Test Probe'}
                </Button>
              </form>

              {semanticResults !== null && (
                <div className="mt-2 space-y-1.5">
                  <div className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                    {semanticResults.length === 0
                      ? 'No semantic matches met the similarity threshold (try syncing embeddings first).'
                      : `Found ${semanticResults.length} semantic matches:`}
                  </div>
                  {semanticResults.map((res, i) => (
                    <div
                      key={res.memoryId || i}
                      className="p-2.5 rounded-lg bg-neutral-100/60 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 text-xs flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {res.memory.content}
                        </div>
                        <div className="text-[10px] text-neutral-400 flex items-center gap-2">
                          <span className="capitalize">{res.memory.category}</span>
                          <span>•</span>
                          <span>{res.memory.date}</span>
                        </div>
                      </div>
                      <Badge variant={res.score > 0.6 ? 'success' : 'primary'} size="sm">
                        {(res.score * 100).toFixed(1)}% match
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Confirmation Dialog for Reset */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
              Reset Second Brain Data?
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              This will reset documents, memories, goals, projects, and learnings to their initial state.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmReset(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleReset}
              >
                Confirm Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
