import React from 'react';
import { SourceCitation, MemoryItem } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  X,
  Brain,
  Calendar,
  Tag,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface MemorySourceEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: SourceCitation | null;
  memory: MemoryItem | null;
  isDeleted?: boolean;
  isLoading?: boolean;
  onNavigateToVault: () => void;
}

export const MemorySourceEvidenceModal: React.FC<MemorySourceEvidenceModalProps> = ({
  isOpen,
  onClose,
  source,
  memory,
  isDeleted,
  isLoading,
  onNavigateToVault
}) => {
  if (!isOpen || !source) return null;

  const isEdited = Boolean(
    memory && source.snippet && memory.content.trim() !== source.snippet.trim()
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/40">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold">
              {source.sourceId || '[M1]'}
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Source Attribution & Evidence
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Grounding reference retrieved from your Personal Second Brain
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Verifying memory record with your Second Brain vault...
              </p>
            </div>
          ) : isDeleted ? (
            /* Deleted / Unavailable State */
            <div className="p-4 sm:p-5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>This memory is no longer available.</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed">
                The Memory document that previously supported this response was removed or deleted from your Second Brain. Stale content is not shown.
              </p>
              <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Strict privacy enforcement: Deleted memories are purged and cannot be inspected.</span>
              </div>
            </div>
          ) : memory ? (
            /* Live Verified Memory State */
            <div className="space-y-4">
              {/* Badges and metadata */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary" size="sm" className="font-semibold">
                  {memory.category || source.category || 'Personal'} Memory
                </Badge>

                {source.relevanceLabel && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {source.relevanceLabel}
                  </span>
                )}

                {isEdited && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Current Memory (Live Vault)
                  </span>
                )}

                {(source.displayDate || memory.date || source.date) && (
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 ml-auto">
                    <Calendar className="w-3 h-3" />
                    <span>{source.displayDate || memory.date || source.date}</span>
                    {source.formattedPrecision && source.formattedPrecision !== 'unknown' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-mono">
                        {source.formattedPrecision}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Edited notice if applicable */}
              {isEdited && (
                <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>Notice:</strong> This memory record was updated after the conversation occurred. Displaying the current memory from your vault.
                </div>
              )}

              {/* Memory Full Text Content */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                  <Brain className="w-3 h-3 text-indigo-500" />
                  <span>Recorded Memory Content</span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {memory.content}
                </p>
              </div>

              {/* Memory Tags */}
              {Array.isArray(memory.tags) && memory.tags.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {memory.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Grounding guarantee */}
              <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300/90 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Factual Grounding Attribution: </span>
                  This confirmed memory was supplied directly to MEMORA's RAG answering pipeline to ground personal facts in the response. Any general advice or recommendations in the response were generated to complement these facts.
                </div>
              </div>
            </div>
          ) : (
            /* Snippet fallback if direct memory record lookup failed */
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  <span>Referenced Memory Evidence</span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                  "{source.snippet}"
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">
            Source ID: <code className="font-mono text-neutral-600 dark:text-neutral-300">{source.sourceId || '[M1]'}</code>
          </span>

          <div className="flex items-center gap-2">
            {!isDeleted && memory && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onNavigateToVault();
                }}
                icon={<ExternalLink className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Jump to Memories
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
