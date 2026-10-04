import React from 'react';
import { GlobalSearchResult } from '../../types';
import { Badge } from '../common/Badge';
import {
  FileText,
  Brain,
  FolderKanban,
  GraduationCap,
  Lightbulb,
  Target,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface SearchResultItemProps {
  result: GlobalSearchResult;
  onClick: (result: GlobalSearchResult) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  Documents: <FileText className="w-3.5 h-3.5 text-blue-500" />,
  Memories: <Brain className="w-3.5 h-3.5 text-purple-500" />,
  Projects: <FolderKanban className="w-3.5 h-3.5 text-emerald-500" />,
  Learnings: <GraduationCap className="w-3.5 h-3.5 text-amber-500" />,
  Ideas: <Lightbulb className="w-3.5 h-3.5 text-orange-500" />,
  Goals: <Target className="w-3.5 h-3.5 text-indigo-500" />
};

export const SearchResultItem: React.FC<SearchResultItemProps> = ({ result, onClick }) => {
  return (
    <div
      onClick={() => onClick(result)}
      className="group flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700/70 shadow-2xs shrink-0 mt-0.5">
          {typeIcons[result.type] || <Sparkles className="w-3.5 h-3.5 text-neutral-500" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
              {result.title}
            </h4>
            <Badge size="sm" variant="neutral" className="text-[10px]">
              {result.type}
            </Badge>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
            {result.snippet}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {result.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
            <span className="text-[10px] text-neutral-400 ml-auto">
              {result.updatedOrDate}
            </span>
          </div>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 my-auto" />
    </div>
  );
};
