import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { ProgressBar } from '../components/common/ProgressBar';
import {
  Target,
  Plus,
  Calendar,
  FolderKanban,
  CheckCircle2,
  Clock,
  Edit3,
  CheckSquare,
  Square,
  ArrowRight,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { GoalItem, GoalStatus } from '../types';

export const GoalsPage: React.FC = () => {
  const {
    goals,
    isLoading,
    dataError,
    reloadData,
    setIsCreateGoalOpen,
    setEditingGoal,
    updateGoal,
    setActiveTab
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Status filters: All, In Progress, Planning, Completed, Paused
  const statusTabs = ['All', 'In Progress', 'Planning', 'Completed', 'Paused'];

  const filteredGoals = goals.filter(g => {
    if (statusFilter === 'All') return true;
    return g.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const getStatusBadgeVariant = (status: GoalStatus) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'primary';
      case 'Planning':
        return 'amber';
      case 'Paused':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const toggleMilestone = async (goal: GoalItem, milestoneId: string) => {
    if (!goal.milestones) return;
    const updatedMilestones = goal.milestones.map(m =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const newProgress = Math.round((completedCount / updatedMilestones.length) * 100);

    await updateGoal({
      ...goal,
      milestones: updatedMilestones,
      progress: newProgress,
      status: newProgress === 100 ? 'Completed' : goal.status
    });
  };

  const handleEdit = (goal: GoalItem) => {
    setEditingGoal(goal);
    setIsCreateGoalOpen(true);
  };

  if (isLoading) return <LoadingState message="Loading goals..." />;
  if (dataError) {
    return (
      <EmptyState
        icon={<Target className="w-6 h-6" />}
        title="Unable to load goals"
        description={dataError}
        actionLabel="Retry"
        onAction={reloadData}
      />
    );
  }

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Goals
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Track what you're working toward.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingGoal(null);
            setIsCreateGoalOpen(true);
          }}
          icon={<Plus className="w-3.5 h-3.5" />}
          className="shadow-2xs py-2 px-3.5 text-xs font-semibold"
        >
          Create Goal
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 w-fit text-xs overflow-x-auto">
        {statusTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap text-xs ${
              statusFilter === tab
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          icon={<Target className="w-6 h-6" />}
          title={goals.length === 0 ? "No goals set yet" : "No goals found"}
          description={
            goals.length === 0
              ? 'Set personal goals and milestones to track your life achievements.'
              : `No goals currently match "${statusFilter}". Click "Create Goal" to define one.`
          }
          actionLabel="Create Goal"
          onAction={() => {
            setEditingGoal(null);
            setIsCreateGoalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredGoals.map(goal => (
            <div
              key={goal.id}
              className="group bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 sm:p-5 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-2xs transition-all duration-150 flex flex-col justify-between"
            >
              <div>
                {/* Header: Title, Status Badge, Edit */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getStatusBadgeVariant(goal.status)} size="sm">
                        {goal.status}
                      </Badge>
                      <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Target: {goal.targetDate}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-snug">
                      {goal.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleEdit(goal)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Edit goal"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  {goal.description}
                </p>

                {/* Progress Bar with Percentage */}
                <ProgressBar progress={goal.progress} showLabel className="mt-3.5" />

                {/* Milestones Checklist (if present) */}
                {goal.milestones && goal.milestones.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/70 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Key Milestones ({goal.milestones.filter(m => m.completed).length}/{goal.milestones.length})
                    </span>
                    <div className="space-y-1.5">
                      {goal.milestones.map(milestone => (
                        <button
                          key={milestone.id}
                          onClick={() => toggleMilestone(goal, milestone.id)}
                          className="w-full text-left flex items-start gap-2 text-xs p-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors group/milestone cursor-pointer"
                        >
                          {milestone.completed ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                          )}
                          <span
                            className={`leading-tight ${
                              milestone.completed
                                ? 'line-through text-neutral-400 dark:text-neutral-500'
                                : 'text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            {milestone.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Related Projects */}
              {goal.relatedProjects.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-neutral-400">Related Projects:</span>
                    {goal.relatedProjects.map(proj => (
                      <button
                        key={proj}
                        onClick={() => setActiveTab('projects')}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        title="View project"
                      >
                        <FolderKanban className="w-3 h-3" />
                        <span>{proj}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
