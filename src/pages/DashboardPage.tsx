import React from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import {
  FileText,
  Brain,
  Target,
  FolderKanban,
  Lightbulb,
  Plus,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    setActiveTab,
    setIsAddMemoryOpen,
    setIsCreateGoalOpen,
    setIsCreateProjectOpen,
    setIsCaptureIdeaOpen,
    documents,
    memories,
    goals,
    projects,
    ideas
  } = useApp();

  // Dynamic greeting based on actual user time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning 👋';
    if (hour < 18) return 'Good afternoon 👋';
    return 'Good evening 👋';
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* 1. Wide Horizontal Welcome Banner */}
      <div className="bg-gradient-to-r from-sky-50/80 via-indigo-50/60 to-purple-50/70 dark:from-neutral-900 dark:via-neutral-900/90 dark:to-neutral-900 border border-indigo-100/70 dark:border-neutral-800 rounded-xl px-5 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {getGreeting()}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
            MEMORA — Your personal life-memory assistant. All your thoughts, milestones, and moments in one unified vault.
          </p>
        </div>

        {/* Right side status pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 text-xs text-neutral-700 dark:text-neutral-300 font-medium self-start sm:self-auto shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Unified Second Brain</span>
        </div>
      </div>

      {/* 2. Statistics Row (5 Cards - strictly real authenticated counts) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          title="Memories"
          count={memories.length}
          subtitle={memories.length === 1 ? '1 memory saved' : `${memories.length} memories saved`}
          statusBadge={memories.length > 0 ? 'Active' : 'Empty'}
          statusColor="bg-purple-500"
          icon={<Brain className="w-4 h-4 text-purple-500" />}
          onClick={() => setActiveTab('memories')}
        />
        <StatCard
          title="Goals"
          count={goals.length}
          subtitle={goals.length === 1 ? '1 active goal' : `${goals.length} active goals`}
          statusBadge={goals.length > 0 ? 'Tracking' : 'Empty'}
          statusColor="bg-indigo-500"
          icon={<Target className="w-4 h-4 text-indigo-500" />}
          onClick={() => setActiveTab('goals')}
        />
        <StatCard
          title="Projects"
          count={projects.length}
          subtitle={projects.length === 1 ? '1 initiative' : `${projects.length} initiatives`}
          statusBadge={projects.length > 0 ? 'Active' : 'Empty'}
          statusColor="bg-emerald-500"
          icon={<FolderKanban className="w-4 h-4 text-emerald-500" />}
          onClick={() => setActiveTab('projects')}
        />
        <StatCard
          title="Ideas"
          count={ideas.length}
          subtitle={ideas.length === 1 ? '1 idea captured' : `${ideas.length} ideas captured`}
          statusBadge={ideas.length > 0 ? 'Saved' : 'Empty'}
          statusColor="bg-amber-500"
          icon={<Lightbulb className="w-4 h-4 text-amber-500" />}
          onClick={() => setActiveTab('ideas')}
        />
        <StatCard
          title="Documents"
          count={documents.length}
          subtitle={documents.length === 1 ? '1 file in vault' : `${documents.length} files in vault`}
          statusBadge={documents.length > 0 ? 'Indexed' : 'Empty'}
          statusColor="bg-blue-500"
          icon={<FileText className="w-4 h-4 text-blue-500" />}
          onClick={() => setActiveTab('knowledge')}
        />
      </div>

      {/* 3. Quick Actions Bar */}
      <Card padded={false} className="overflow-hidden">
        <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Quick Actions
          </span>
          <span className="text-[11px] text-neutral-400">Add to your second brain</span>
        </div>
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddMemoryOpen(true)}
            icon={<Brain className="w-3.5 h-3.5 text-white" />}
            className="w-full justify-start text-xs font-semibold py-2 bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
          >
            Record Memory
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCreateGoalOpen(true)}
            icon={<Target className="w-3.5 h-3.5 text-indigo-500" />}
            className="w-full justify-start text-xs font-semibold py-2"
          >
            Create Goal
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCaptureIdeaOpen(true)}
            icon={<Lightbulb className="w-3.5 h-3.5 text-amber-500" />}
            className="w-full justify-start text-xs font-semibold py-2"
          >
            Capture Idea
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCreateProjectOpen(true)}
            icon={<FolderKanban className="w-3.5 h-3.5 text-emerald-500" />}
            className="w-full justify-start text-xs font-semibold py-2"
          >
            Add Project
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveTab('chat')}
            icon={<Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
            className="w-full justify-start text-xs font-semibold py-2"
          >
            Ask MEMORA
          </Button>
        </div>
      </Card>

      {/* 4. Core Personal Modules Grid 1: Recent Memories & Active Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        
        {/* Module A: Recent Memories */}
        <Card padded={false} className="flex flex-col justify-between overflow-hidden">
          <div>
            <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Recent Memories
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('memories')}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 font-medium transition-colors cursor-pointer"
              >
                View all ({memories.length}) →
              </button>
            </div>

            {memories.length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                {memories.slice(0, 4).map(mem => (
                  <div
                    key={mem.id}
                    onClick={() => setActiveTab('memories')}
                    className="p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                        {mem.category}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {mem.date}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-relaxed">
                      {mem.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-500 mb-2">
                  <Brain className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">No memories recorded yet</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 max-w-[240px] mx-auto">
                  Record life events, conversations, and reflections to preserve them in your second brain.
                </p>
                <button
                  onClick={() => setIsAddMemoryOpen(true)}
                  className="mt-3 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Record a memory
                </button>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800/70 text-center">
            <button
              onClick={() => setActiveTab('memories')}
              className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Explore memories vault</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        {/* Module B: Active Goals */}
        <Card padded={false} className="flex flex-col justify-between overflow-hidden">
          <div>
            <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Active Goals
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('goals')}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 font-medium transition-colors cursor-pointer"
              >
                View all ({goals.length}) →
              </button>
            </div>

            {goals.length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                {goals.slice(0, 4).map(goal => (
                  <div
                    key={goal.id}
                    onClick={() => setActiveTab('goals')}
                    className="p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                          {goal.title}
                        </h4>
                        {goal.description && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                            {goal.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="primary" size="sm" className="shrink-0 text-[10px] py-0 px-1.5">
                        {goal.status}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span>Target: {goal.targetDate}</span>
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {goal.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500 mb-2">
                  <Target className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">No active goals yet</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 max-w-[240px] mx-auto">
                  Establish targets and track milestones to measure your personal progress.
                </p>
                <button
                  onClick={() => setIsCreateGoalOpen(true)}
                  className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Create a goal
                </button>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800/70 text-center">
            <button
              onClick={() => setActiveTab('goals')}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage all goals</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </Card>
      </div>

      {/* 5. Core Personal Modules Grid 2: Recent Ideas & Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        
        {/* Module C: Recent Ideas */}
        <Card padded={false} className="flex flex-col justify-between overflow-hidden">
          <div>
            <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Recent Ideas
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('ideas')}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 font-medium transition-colors cursor-pointer"
              >
                View all ({ideas.length}) →
              </button>
            </div>

            {ideas.length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                {ideas.slice(0, 4).map(idea => (
                  <div
                    key={idea.id}
                    onClick={() => setActiveTab('ideas')}
                    className="p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                        {idea.title}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/50">
                          {idea.priority}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {idea.status}
                        </span>
                      </div>
                    </div>
                    {idea.description && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                        {idea.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500 mb-2">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">No ideas captured yet</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 max-w-[240px] mx-auto">
                  Capture fleeting thoughts, creative sparks, and brainstorms before they slip away.
                </p>
                <button
                  onClick={() => setIsCaptureIdeaOpen(true)}
                  className="mt-3 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Capture an idea
                </button>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800/70 text-center">
            <button
              onClick={() => setActiveTab('ideas')}
              className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Explore idea backlog</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        {/* Module D: Active Projects */}
        <Card padded={false} className="flex flex-col justify-between overflow-hidden">
          <div>
            <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Active Projects
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('projects')}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 font-medium transition-colors cursor-pointer"
              >
                View all ({projects.length}) →
              </button>
            </div>

            {projects.length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                {projects.slice(0, 4).map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => setActiveTab('projects')}
                    className="p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                          {proj.name}
                        </h4>
                        {proj.description && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                            {proj.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="neutral" size="sm" className="shrink-0 text-[10px] py-0 px-1.5">
                        {proj.status}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span>Updated: {proj.lastUpdated}</span>
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {proj.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500 mb-2">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">No projects yet</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 max-w-[240px] mx-auto">
                  Organize your initiatives, side projects, and roadmaps in your second brain.
                </p>
                <button
                  onClick={() => setIsCreateProjectOpen(true)}
                  className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add a project
                </button>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800/70 text-center">
            <button
              onClick={() => setActiveTab('projects')}
              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage all projects</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </Card>
      </div>

      {/* 6. Unified MEMORA AI Assistant Banner */}
      <Card className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900 border-indigo-100 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Query Your Entire Second Brain with MEMORA AI
            </h3>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            All your memories, goals, ideas, and projects are connected. Ask MEMORA questions like <span className="italic font-medium text-neutral-800 dark:text-neutral-200">"What goals am I currently working on?"</span> or <span className="italic font-medium text-neutral-800 dark:text-neutral-200">"When did I meet Ravi?"</span> to retrieve grounded answers from your real records.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setActiveTab('chat')}
          icon={<Sparkles className="w-3.5 h-3.5" />}
          className="shrink-0 text-xs py-2 px-4 shadow-xs"
        >
          <span>Ask MEMORA</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </Card>
    </div>
  );
};
