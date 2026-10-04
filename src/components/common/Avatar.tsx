import React, { useState } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showStatus?: boolean;
  status?: 'online' | 'offline';
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg'
};

const statusSizeClasses = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5'
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
  showStatus = false,
  status = 'online'
}) => {
  const [imgError, setImgError] = useState(false);

  const getInitials = (n?: string) => {
    if (!n) return '';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src && !imgError ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          onError={() => setImgError(true)}
          className={`${sizeClasses[size]} rounded-xl object-cover border border-neutral-200/80 dark:border-neutral-700`}
        />
      ) : initials ? (
        <div
          className={`${sizeClasses[size]} rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold flex items-center justify-center border border-neutral-200/80 dark:border-neutral-700`}
        >
          {initials}
        </div>
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center border border-neutral-200/80 dark:border-neutral-700`}
        >
          <User className="w-1/2 h-1/2" />
        </div>
      )}

      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 ${statusSizeClasses[size]} rounded-full ring-2 ring-white dark:ring-neutral-900 ${
            status === 'online' ? 'bg-emerald-500' : 'bg-neutral-400'
          }`}
        />
      )}
    </div>
  );
};
