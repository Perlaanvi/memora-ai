import React from 'react';

interface ProgressBarProps {
  progress: number;
  variant?: 'auto' | 'primary' | 'success' | 'amber';
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  variant = 'auto',
  size = 'sm',
  showLabel = false,
  label = 'Progress',
  className = ''
}) => {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  const getBarColor = () => {
    if (variant === 'success') return 'bg-emerald-500';
    if (variant === 'primary') return 'bg-indigo-600 dark:bg-indigo-500';
    if (variant === 'amber') return 'bg-amber-500';

    // Auto variant based on progress threshold
    if (clampedProgress === 100) return 'bg-emerald-500';
    if (clampedProgress >= 60) return 'bg-indigo-600 dark:bg-indigo-500';
    return 'bg-amber-500';
  };

  const heightClasses = {
    xs: 'h-1.5',
    sm: 'h-2',
    md: 'h-2.5'
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-neutral-500 dark:text-neutral-400 font-medium">{label}</span>
          <span className="font-bold font-mono text-neutral-900 dark:text-neutral-100">
            {clampedProgress}%
          </span>
        </div>
      )}
      <div className={`w-full ${heightClasses[size]} bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden`}>
        <div
          className={`${heightClasses[size]} rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};
