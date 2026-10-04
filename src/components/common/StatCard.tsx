import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  count: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  statusBadge?: string;
  statusColor?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  count,
  subtitle,
  icon,
  statusBadge,
  statusColor = 'bg-emerald-500',
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-3.5 sm:p-4 transition-all duration-150 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-2xs' : ''
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60 shrink-0">
              {icon}
            </div>
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 truncate">
              {title}
            </p>
          </div>
          {statusBadge ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/50 dark:border-neutral-700/50 shrink-0">
              {statusBadge}
            </span>
          ) : onClick ? (
            <span className="text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
          ) : null}
        </div>

        <div className="mt-2.5 flex items-baseline justify-between">
          <h3 className="text-2xl font-bold tracking-tight font-mono text-neutral-900 dark:text-neutral-50">
            {count}
          </h3>
        </div>
      </div>

      {subtitle && (
        <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/70 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
          <span className="truncate">{subtitle}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor} shrink-0 ml-1.5`} />
        </div>
      )}
    </div>
  );
};
