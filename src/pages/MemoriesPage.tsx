import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import {
  Brain,
  Plus,
  Search,
  Edit3,
  Trash2,
  Tag,
  Calendar,
  Bookmark,
  Pin,
  Sparkles,
  MessageSquare,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { MemoryCategory, MemoryItem, SemanticSearchResult } from '../types';
import { api } from '../services/api';

export const MemoriesPage: React.FC = () => {
  const {
    memories,
    isLoading,
    dataError,
    reloadData,
    setIsAddMemoryOpen,
    setEditingMemory,
    deleteMemory
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[] | null>(null);

  // As requested: All, Personal, Learning, Projects, Ideas
  const categories = ['All', 'Personal', 'Learning', 'Projects', 'Ideas'];

  // Handle semantic search trigger
  const triggerSemanticSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) {
      setSemanticResults(null);
      return;
    }
    setIsSearchingSemantic(true);
    try {
      const res = await api.semanticSearch(q, 10, 0.25);
      setSemanticResults(res.results);
    } catch (err) {
      console.warn('Semantic search error in Memories page:', err);
      setSemanticResults([]);
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  // Filter memories based on active search mode
  const displayedMemories: { memory: MemoryItem; score?: number }[] = React.useMemo(() => {
    if (searchMode === 'semantic' && searchQuery.trim() && semanticResults !== null) {
      return semanticResults.map(r => ({
        memory: r.memory,
        score: r.score
      })).filter(item => {
        if (selectedCategory !== 'All') {
          return item.memory.category === selectedCategory;
        }
        return true;
      });
    }

    return memories
      .filter(mem => {
        if (selectedCategory !== 'All') {
          if (mem.category !== selectedCategory) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchContent = mem.content.toLowerCase().includes(q);
          const matchTags = mem.tags.some(t => t.toLowerCase().includes(q));
          const matchCategory = mem.category.toLowerCase().includes(q);
          return matchContent || matchTags || matchCategory;
        }
        return true;
      })
      .map(memory => ({ memory }));
  }, [searchMode, searchQuery, semanticResults, memories, selectedCategory]);

  const getCategoryVariant = (category: MemoryCategory) => {
    switch (category) {
      case 'Learning':
        return 'primary';
      case 'Personal':
        return 'purple';
      case 'Projects':
        return 'success';
      case 'Ideas':
        return 'amber';
      case 'Preference':
        return 'blue';
      case 'Insight':
        return 'amber';
      case 'Fact':
        return 'blue';
      case 'Workflow':
        return 'success';
      default:
        return 'neutral';
    }
  };

  const handleEdit = (mem: MemoryItem) => {
    setEditingMemory(mem);
    setIsAddMemoryOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMemory(id);
  };

  if (isLoading) return <LoadingState message="Loading memories..." />;
  if (dataError) {
    return (
      <EmptyState
        icon={<Brain className="w-6 h-6" />}
        title="Unable to load memories"
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
            Memories
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Important things you want your Second Brain to remember.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingMemory(null);
            setIsAddMemoryOpen(true);
          }}
          icon={<Plus className="w-3.5 h-3.5" />}
          className="shadow-2xs py-2 px-3.5 text-xs font-semibold"
        >
          Add Memory
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Field & Mode Toggle */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <form
            onSubmit={e => {
              e.preventDefault();
              if (searchMode === 'semantic') triggerSemanticSearch(searchQuery);
            }}
            className="relative flex-1"
          >
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (searchMode === 'semantic' && !e.target.value.trim()) {
                  setSemanticResults(null);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchMode === 'semantic') {
                  triggerSemanticSearch(searchQuery);
                }
              }}
              placeholder={
                searchMode === 'semantic'
                  ? "Semantic search by meaning (e.g. 'chai with friends' or 'goals')..."
                  : "Search memories by content or tag..."
              }
              className="w-full text-xs sm:text-sm pl-9 pr-16 py-2 bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs"
            />
            {searchMode === 'semantic' && (
              <button
                type="submit"
                disabled={isSearchingSemantic || !searchQuery.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all disabled:opacity-40 cursor-pointer"
              >
                {isSearchingSemantic ? 'Probing...' : 'Probe'}
              </button>
            )}
          </form>

          {/* Search Mode Pill Switcher */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setSearchMode('keyword');
                setSemanticResults(null);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer text-xs ${
                searchMode === 'keyword'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Keyword
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMode('semantic');
                if (searchQuery.trim()) triggerSemanticSearch(searchQuery);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-all cursor-pointer text-xs ${
                searchMode === 'semantic'
                  ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Semantic
            </button>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 overflow-x-auto text-xs shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap text-xs ${
                selectedCategory === cat
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Semantic Active Notice */}
      {searchMode === 'semantic' && (
        <div className="px-3.5 py-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
            <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>
              <strong>Semantic Index Retrieval Active:</strong> Matching memories by embedding cosine similarity (768-dim vectors).
            </span>
          </div>
          {searchQuery.trim() && !isSearchingSemantic && semanticResults !== null && (
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              Found {displayedMemories.length} relevant memories
            </span>
          )}
        </div>
      )}

      {/* Memories Grid */}
      {displayedMemories.length === 0 ? (
        <EmptyState
          icon={<Brain className="w-6 h-6" />}
          title={memories.length === 0 ? "No memories recorded yet" : "No memories found"}
          description={
            searchMode === 'semantic' && searchQuery.trim()
              ? `No memories matched your semantic probe "${searchQuery}". Try synchronizing embeddings in Settings or broadening your query.`
              : searchQuery
              ? `No memories match "${searchQuery}". Try a different search term or category.`
              : selectedCategory !== 'All'
              ? `No memories in category "${selectedCategory}". Click "Add Memory" to create one.`
              : 'Record important daily events, conversations, reflections, or moments to remember them forever.'
          }
          actionLabel="Add Memory"
          onAction={() => {
            setEditingMemory(null);
            setIsAddMemoryOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayedMemories.map(({ memory: mem, score }) => (
            <div
              key={mem.id}
              className="group bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 sm:p-5 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-2xs transition-all duration-150 flex flex-col justify-between"
            >
              <div>
                {/* Header: Category Badge, Pin & Semantic Score */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant={getCategoryVariant(mem.category)} size="sm">
                      {mem.category}
                    </Badge>
                    {score !== undefined && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        score > 0.65
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      }`}>
                        <Sparkles className="w-2.5 h-2.5" />
                        {(score * 100).toFixed(0)}% match
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {mem.pinned && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                        <Pin className="w-2.5 h-2.5" />
                        Pinned
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <p className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed">
                  "{mem.content}"
                </p>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {mem.sourceRef && (
                    <div className="text-[11px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                      <Bookmark className="w-3 h-3 text-indigo-400" />
                      <span className="truncate">Ref: {mem.sourceRef}</span>
                    </div>
                  )}
                  {mem.sourceType === 'chat' && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/50">
                      <MessageSquare className="w-2.5 h-2.5" />
                      From Chat
                    </span>
                  )}
                </div>
              </div>

              {/* Footer: Date, Tags, and Action Buttons */}
              <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2.5">
                {/* Tags and Date */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {mem.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono shrink-0 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {mem.date}
                  </span>
                </div>

                {/* Action Buttons: Edit and Delete */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-neutral-100/60 dark:border-neutral-800/40">
                  <button
                    onClick={() => handleEdit(mem)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Edit memory"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={e => handleDelete(mem.id, e)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Delete memory"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
