import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import {
  Lightbulb,
  Plus,
  Search,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Flame,
  CheckCircle2,
  Edit3,
  Trash2
} from 'lucide-react';
import { IdeaItem, IdeaPriority, IdeaStatus } from '../types';

export const IdeasPage: React.FC = () => {
  const {
    ideas,
    isLoading,
    dataError,
    reloadData,
    setIsCaptureIdeaOpen,
    setEditingIdea,
    deleteIdea
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');

  // Priority filters: All, High, Medium, Low
  const priorityTabs = ['All', 'High', 'Medium', 'Low'];

  const filteredIdeas = ideas.filter(idea => {
    if (priorityFilter !== 'All' && idea.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = idea.title.toLowerCase().includes(q);
      const matchDesc = idea.description.toLowerCase().includes(q);
      const matchTags = idea.tags.some(t => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchTags;
    }
    return true;
  });

  const getPriorityVariant = (priority: IdeaPriority) => {
    switch (priority) {
      case 'High':
        return 'warning';
      case 'Medium':
        return 'primary';
      case 'Low':
        return 'neutral';
    }
  };

  const getStatusVariant = (status: IdeaStatus) => {
    switch (status) {
      case 'Planned':
        return 'success';
      case 'Exploring':
        return 'purple';
      case 'Raw':
        return 'amber';
      case 'Archived':
        return 'neutral';
    }
  };

  const handleEdit = (idea: IdeaItem) => {
    setEditingIdea(idea);
    setIsCaptureIdeaOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteIdea(id);
  };

  if (isLoading) return <LoadingState message="Loading ideas..." />;
  if (dataError) {
    return (
      <EmptyState
        icon={<Lightbulb className="w-6 h-6" />}
        title="Unable to load ideas"
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
            Ideas
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Capture ideas before they disappear.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingIdea(null);
            setIsCaptureIdeaOpen(true);
          }}
          icon={<Plus className="w-3.5 h-3.5" />}
          className="shadow-2xs py-2 px-3.5 text-xs font-semibold"
        >
          Capture Idea
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search ideas by title, tag, or description..."
            className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 w-fit text-xs overflow-x-auto">
          {priorityTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setPriorityFilter(tab)}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap text-xs ${
                priorityFilter === tab
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Ideas Grid */}
      {filteredIdeas.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="w-6 h-6" />}
          title={ideas.length === 0 ? "No ideas captured yet" : "No ideas match your filter"}
          description={
            ideas.length === 0
              ? "Capture personal flashes of inspiration, future concepts, and creative sparks."
              : "Try switching to another priority filter or capture a new idea."
          }
          actionLabel="Capture Idea"
          onAction={() => {
            setEditingIdea(null);
            setIsCaptureIdeaOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredIdeas.map(idea => (
            <div
              key={idea.id}
              className="group bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 sm:p-5 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-2xs transition-all duration-150 flex flex-col justify-between"
            >
              <div>
                {/* Header: Priority & Status Badges, Edit/Delete */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant={getPriorityVariant(idea.priority)} size="sm">
                      {idea.priority} Priority
                    </Badge>
                    <Badge variant={getStatusVariant(idea.status)} size="sm">
                      {idea.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(idea)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                      title="Edit idea"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => handleDelete(idea.id, e)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Delete idea"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-snug">
                  {idea.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 line-clamp-3 leading-relaxed">
                  {idea.description}
                </p>
              </div>

              {/* Card Footer: Tags & Date */}
              <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {idea.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    {idea.createdDate}
                  </span>

                  {idea.impactScore && (
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      Impact: {idea.impactScore}/10
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
