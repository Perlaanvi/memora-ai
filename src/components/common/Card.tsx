import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  padded = true,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl ${
        padded ? 'p-5 sm:p-6' : ''
      } ${
        hoverable
          ? 'transition-all duration-200 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-xs hover:-translate-y-0.5'
          : 'shadow-xs'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
