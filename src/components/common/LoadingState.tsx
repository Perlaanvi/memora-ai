import React from 'react';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading Second Brain data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-neutral-200 dark:border-neutral-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
        <div className="w-4 h-4 rounded-full bg-indigo-500/20 absolute animate-ping" />
      </div>
      <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{message}</p>
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-1/3 h-4 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
        <div className="w-16 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
      </div>
      <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800/60 rounded-md" />
      <div className="w-4/5 h-3 bg-neutral-100 dark:bg-neutral-800/60 rounded-md" />
      <div className="flex gap-2 pt-2">
        <div className="w-12 h-4 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
        <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
      </div>
    </div>
  );
};
