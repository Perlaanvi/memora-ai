import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
          info: <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />,
          warning: <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
          error: <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200"
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {toast.title}
              </p>
              {toast.description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
