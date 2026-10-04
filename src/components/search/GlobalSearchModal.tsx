import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { GlobalSearchResult } from '../../types';
import {
  Search,
  X,
  Command
} from 'lucide-react';
import { SearchResultItem } from './SearchResultItem';

export const GlobalSearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, setActiveTab, setViewingDocument, documents } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (query) {
        runSearch(query);
      }
    }
  }, [isSearchOpen]);

  const runSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.search(searchTerm);
      setResults(res.results || []);
    } catch (err) {
      console.warn('Search query failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    runSearch(val);
  };

  const handleResultClick = (result: GlobalSearchResult) => {
    setIsSearchOpen(false);
    if (result.type === 'Documents') {
      const doc = documents.find(d => d.id === result.id);
      if (doc) setViewingDocument(doc);
    }
    setActiveTab(result.targetTab);
  };

  const filteredResults = selectedFilter === 'All'
    ? results
    : results.filter(r => r.type.toLowerCase() === selectedFilter.toLowerCase());

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => setIsSearchOpen(false)}
        aria-hidden="true"
      />

      {/* Search Modal Panel */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800">
          <Search className="w-5 h-5 text-neutral-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search documents, memories, projects, learnings..."
            className="w-full text-base bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                runSearch('');
              }}
              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-500">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-50/70 dark:bg-neutral-950/40 border-b border-neutral-200/80 dark:border-neutral-800/80 overflow-x-auto text-xs">
          <span className="text-[11px] font-medium text-neutral-400 mr-1 shrink-0">Filter:</span>
          {['All', 'Documents', 'Memories', 'Projects', 'Learnings', 'Ideas', 'Goals'].map(filter => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                selectedFilter === filter
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Suggested Queries */}
        {!query && (
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Popular Knowledge Queries
            </p>
            <div className="flex flex-wrap gap-2">
              {['RAG', 'Embeddings', 'HNSW', 'Machine Learning', 'Python', 'Goals'].map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s);
                    runSearch(s);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60 p-2">
          {isSearching ? (
            <div className="p-8 text-center text-xs text-neutral-400">Searching your knowledge base...</div>
          ) : filteredResults.length > 0 ? (
            filteredResults.map(res => (
              <SearchResultItem
                key={`${res.type}-${res.id}`}
                result={res}
                onClick={handleResultClick}
              />
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                No matching knowledge items found for "{query}"
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Try searching for "RAG", "Embeddings", "FastAPI", or "Machine Learning".
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-400">
          <span>{filteredResults.length} knowledge items found</span>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" /> Second Brain Vector Search Ready
          </span>
        </div>
      </div>
    </div>
  );
};
