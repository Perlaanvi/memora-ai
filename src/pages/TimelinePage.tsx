import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import {
  Calendar,
  CalendarDays,
  Clock,
  Sparkles,
  ArrowRightLeft,
  RotateCw,
  Search,
  Filter,
  HelpCircle,
  Brain,
  History,
  Tag,
  CheckCircle2,
  CalendarRange
} from 'lucide-react';
import { TimelineItem, TimelineResponse, TemporalPrecision } from '../types';
import { api } from '../services/api';

export const TimelinePage: React.FC = () => {
  const { memories, showToast } = useApp();
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrecision, setSelectedPrecision] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeView, setActiveView] = useState<'timeline' | 'undated'>('timeline');

  const fetchTimeline = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getTimeline({
        start: startDate || undefined,
        end: endDate || undefined,
        limit: 200
      });
      setTimelineData(res);
    } catch (err: any) {
      console.error('Failed to load timeline:', err);
      showToast('error', 'Failed to retrieve timeline data');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, showToast]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline, memories.length]);

  const handleBackfill = async () => {
    setIsBackfilling(true);
    try {
      const res = await api.backfillTimeline();
      if (res.success) {
        showToast('success', res.message || 'Timeline backfilled successfully');
        await fetchTimeline();
      } else {
        showToast('error', res.message || 'Backfill failed');
      }
    } catch (err: any) {
      console.error('Backfill error:', err);
      showToast('error', 'Timeline backfill error');
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedPrecision('all');
    setStartDate('');
    setEndDate('');
  };

  // Filtered timeline items
  const filteredTimeline = useMemo(() => {
    if (!timelineData) return [];
    return timelineData.timeline.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesContent = item.content.toLowerCase().includes(q);
        const matchesTags = item.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesContent && !matchesTags) return false;
      }
      if (selectedPrecision !== 'all' && item.precision !== selectedPrecision) {
        return false;
      }
      return true;
    });
  }, [timelineData, searchQuery, selectedPrecision]);

  // Filtered undated items
  const filteredUndated = useMemo(() => {
    if (!timelineData) return [];
    return timelineData.unknownDateItems.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesContent = item.content.toLowerCase().includes(q);
        const matchesTags = item.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesContent && !matchesTags) return false;
      }
      return true;
    });
  }, [timelineData, searchQuery]);

  // Group timeline items by Month & Year for a clean chronological feed
  const groupedTimeline = useMemo(() => {
    const groups: { [key: string]: { label: string; items: TimelineItem[] } } = {};

    filteredTimeline.forEach(item => {
      let groupKey = 'Other';
      let groupLabel = 'Other Dates';

      if (item.eventStartAt) {
        const m = item.eventStartAt.match(/^(\d{4})-(\d{2})/);
        if (m) {
          const year = m[1];
          const monthNum = parseInt(m[2], 10);
          const monthNames = [
            '', 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          groupKey = `${year}-${m[2]}`;
          groupLabel = `${monthNames[monthNum] || ''} ${year}`;
        }
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { label: groupLabel, items: [] };
      }
      groups[groupKey].items.push(item);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(key => ({
        key,
        label: groups[key].label,
        items: groups[key].items
      }));
  }, [filteredTimeline]);

  const renderPrecisionIcon = (precision: TemporalPrecision) => {
    switch (precision) {
      case 'range':
        return <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />;
      case 'month':
        return <CalendarDays className="w-3.5 h-3.5 text-blue-500" />;
      case 'year':
        return <Clock className="w-3.5 h-3.5 text-purple-500" />;
      case 'approximate':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-500" />;
      case 'exact':
      case 'day':
      default:
        return <Calendar className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12" id="timeline-container">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Personal Timeline
            </h1>
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Chronological journey of your confirmed memories, life events, and insights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            id="backfill-timeline-btn"
            variant="outline"
            size="sm"
            onClick={handleBackfill}
            disabled={isBackfilling}
            icon={<RotateCw className={`w-4 h-4 ${isBackfilling ? 'animate-spin' : ''}`} />}
          >
            {isBackfilling ? 'Syncing Timeline...' : 'Backfill Timeline'}
          </Button>
        </div>
      </div>

      {/* View Switcher: Dated Timeline vs Undated Memories */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <button
            id="timeline-view-btn"
            onClick={() => setActiveView('timeline')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
              activeView === 'timeline'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Chronological Timeline</span>
            {timelineData && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                {timelineData.timeline.length}
              </span>
            )}
          </button>

          <button
            id="undated-view-btn"
            onClick={() => setActiveView('undated')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
              activeView === 'undated'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Undated Memories</span>
            {timelineData && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                {timelineData.hasUnknownCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick stats pills */}
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Stable Historical Dates</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700">
            <Brain className="w-3.5 h-3.5 text-indigo-500" />
            <span>User Isolated</span>
          </span>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Text search */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="timeline-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search timeline content or tags..."
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Precision Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
            <select
              id="precision-filter-select"
              value={selectedPrecision}
              onChange={e => setSelectedPrecision(e.target.value)}
              disabled={activeView === 'undated'}
              className="w-full py-1.5 px-3 text-sm rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50"
            >
              <option value="all">All Precisions</option>
              <option value="day">Day / Exact</option>
              <option value="range">Date Range</option>
              <option value="month">Month-level</option>
              <option value="year">Year-level</option>
              <option value="approximate">Approximate</option>
            </select>
          </div>

          {/* Date range: Start Date */}
          <div>
            <input
              type="date"
              id="timeline-start-date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              placeholder="Start date"
              disabled={activeView === 'undated'}
              className="w-full py-1.5 px-3 text-sm rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* Date range: End Date */}
          <div>
            <input
              type="date"
              id="timeline-end-date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              placeholder="End date"
              disabled={activeView === 'undated'}
              className="w-full py-1.5 px-3 text-sm rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50"
            />
          </div>
        </div>

        {(searchQuery || selectedPrecision !== 'all' || startDate || endDate) && (
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
            <span className="text-neutral-500 dark:text-neutral-400">
              Active filters applied
            </span>
            <button
              onClick={handleClearFilters}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingState message="Loading your personal timeline..." />
      ) : activeView === 'undated' ? (
        /* Undated Memories View */
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            These memories do not have explicit or implicit event timestamps (e.g. general facts, evergreen principles, or untimed notes). They remain fully preserved as memories.
          </div>

          {filteredUndated.length === 0 ? (
            <EmptyState
              title="No undated memories"
              description={searchQuery ? 'No undated memories matched your search.' : 'All your memories currently have temporal references.'}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredUndated.map(item => (
                <div
                  key={item.id}
                  id={`undated-card-${item.id}`}
                  className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs space-y-2 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <Badge variant="neutral" size="sm">
                      {item.category}
                    </Badge>
                    <span>Created: {item.createdAt ? item.createdAt.slice(0, 10) : 'Unknown'}</span>
                  </div>
                  <p className="text-sm text-neutral-800 dark:text-neutral-200 line-clamp-3">
                    {item.content}
                  </p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                          <Tag className="w-2.5 h-2.5" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Chronological Timeline View */
        <div>
          {groupedTimeline.length === 0 ? (
            <EmptyState
              title="No timeline events found"
              description={
                searchQuery || startDate || endDate
                  ? 'No memories with temporal references match your active filters.'
                  : 'Start adding memories with dates or relative times (e.g., "Yesterday I met Ravi") to view your timeline.'
              }
              actionLabel={memories.length > 0 ? 'Backfill Existing Memories' : undefined}
              onAction={memories.length > 0 ? handleBackfill : undefined}
            />
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-10 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
              {groupedTimeline.map(group => (
                <div key={group.key} className="space-y-4">
                  {/* Period Header */}
                  <div className="relative -left-6 sm:-left-8 flex items-center gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs text-xs font-semibold shrink-0 ring-4 ring-neutral-50 dark:ring-neutral-950">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {group.label}
                    </h2>
                    <span className="text-xs text-neutral-400 font-normal">
                      ({group.items.length} {group.items.length === 1 ? 'event' : 'events'})
                    </span>
                  </div>

                  {/* Items in period */}
                  <div className="space-y-3.5">
                    {group.items.map(item => (
                      <div
                        key={item.id}
                        id={`timeline-item-${item.id}`}
                        className="relative bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all group"
                      >
                        {/* Event marker dot on timeline spine */}
                        <div className="absolute -left-[31px] sm:-left-[39px] top-6 w-3 h-3 rounded-full bg-white dark:bg-neutral-900 border-2 border-indigo-500 dark:border-indigo-400 group-hover:scale-125 transition-transform" />

                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                              {item.displayDate}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700">
                              {renderPrecisionIcon(item.precision)}
                              <span>{item.formattedPrecision}</span>
                            </span>
                            {item.isEstimated && (
                              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                (Resolved from {item.sourceText ? `"${item.sourceText}"` : 'relative reference'})
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-neutral-400 shrink-0">
                            Logged: {item.createdAt ? item.createdAt.slice(0, 10) : 'Historical'}
                          </div>
                        </div>

                        {/* Content */}
                        <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed pt-1">
                          {item.content}
                        </p>

                        {/* Category & Tags Footer */}
                        <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="neutral" size="sm">
                              {item.category}
                            </Badge>
                            {item.tags && item.tags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/60 px-2 py-0.5 rounded border border-neutral-200/40 dark:border-neutral-700/50"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>

                          {item.eventEndAt && item.precision === 'range' && (
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Through {item.eventEndAt}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
