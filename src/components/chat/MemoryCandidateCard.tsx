import React, { useState } from 'react';
import { Sparkles, Check, X, Edit3, Brain, ArrowRight } from 'lucide-react';
import { MemoryCandidate } from '../../types';

interface MemoryCandidateCardProps {
  candidate: MemoryCandidate;
  onSave: (id: string, text: string) => Promise<void> | void;
  onDismiss: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
}

export const MemoryCandidateCard: React.FC<MemoryCandidateCardProps> = ({
  candidate,
  onSave,
  onDismiss,
  onUpdateText
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(candidate.text);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editText.trim()) return;
    setIsSaving(true);
    try {
      await onSave(candidate.id, editText.trim());
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (candidate.status === 'saved') {
    return (
      <div
        id={`candidate-saved-${candidate.id}`}
        className="mt-2.5 p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/80 flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200 animate-fadeIn"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Check className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-emerald-900 dark:text-emerald-100">
              Memory saved to Second Brain
            </span>
            <p className="text-emerald-800 dark:text-emerald-300 italic text-[11px] truncate mt-0.5">
              "{editText}"
            </p>
          </div>
        </div>
        <button
          onClick={() => onDismiss(candidate.id)}
          className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 p-1 text-[11px] font-medium shrink-0 cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div
      id={`candidate-card-${candidate.id}`}
      className="mt-2.5 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs space-y-2.5 transition-all text-neutral-800 dark:text-neutral-200"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Possible memory candidate</span>
          {candidate.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-medium">
              {candidate.category}
            </span>
          )}
        </div>
        <span className="text-[10px] text-amber-700/80 dark:text-amber-400 font-mono hidden sm:inline">
          AI Suggestion • Confirmation Required
        </span>
      </div>

      {isEditing ? (
        <div className="space-y-1.5">
          <textarea
            id={`candidate-input-${candidate.id}`}
            value={editText}
            onChange={e => {
              setEditText(e.target.value);
              onUpdateText(candidate.id, e.target.value);
            }}
            rows={2}
            className="w-full text-xs p-2 rounded-lg bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
            placeholder="Edit memory candidate text..."
          />
        </div>
      ) : (
        <p className="text-xs text-neutral-800 dark:text-neutral-200 font-medium bg-white/70 dark:bg-neutral-900/70 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-800/40 leading-relaxed">
          "{editText}"
        </p>
      )}

      <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            id={`btn-save-candidate-${candidate.id}`}
            onClick={handleSave}
            disabled={isSaving || !editText.trim()}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Memory'}</span>
          </button>

          <button
            id={`btn-edit-candidate-${candidate.id}`}
            onClick={() => setIsEditing(!isEditing)}
            className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" />
            <span>{isEditing ? 'Done' : 'Edit'}</span>
          </button>
        </div>

        <button
          id={`btn-dismiss-candidate-${candidate.id}`}
          onClick={() => onDismiss(candidate.id)}
          className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 px-2 py-1 transition-colors cursor-pointer flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          <span>Dismiss</span>
        </button>
      </div>
    </div>
  );
};
