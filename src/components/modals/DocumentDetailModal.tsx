import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  FileText,
  Clock,
  Layers,
  Cpu,
  Download,
  Share2,
  Copy,
  Check,
  BookOpen
} from 'lucide-react';

export const DocumentDetailModal: React.FC = () => {
  const { viewingDocument, setViewingDocument, addToast } = useApp();
  const [copied, setCopied] = React.useState(false);

  if (!viewingDocument) return null;

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(
      `[Document: ${viewingDocument.title}] (${viewingDocument.type}) - ${viewingDocument.topic}. Extracted from Personal Second Brain.`
    );
    setCopied(true);
    addToast({
      type: 'info',
      title: 'Citation Copied',
      description: 'Copied document reference to clipboard.'
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={!!viewingDocument}
      onClose={() => setViewingDocument(null)}
      title={viewingDocument.title}
      subtitle={`${viewingDocument.topic} • ${viewingDocument.type} Format`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Metadata Banner */}
        <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-xs">
          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>Updated {viewingDocument.updated}</span>
          </div>

          <div className="h-3 w-px bg-neutral-300 dark:bg-neutral-700" />

          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>{viewingDocument.chunksCount || 36} Vector Chunks</span>
          </div>

          <div className="h-3 w-px bg-neutral-300 dark:bg-neutral-700" />

          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
            <Cpu className="w-3.5 h-3.5 text-purple-500" />
            <span>{(viewingDocument.tokenCount || 14200).toLocaleString()} Tokens</span>
          </div>

          {viewingDocument.size && (
            <>
              <div className="h-3 w-px bg-neutral-300 dark:bg-neutral-700" />
              <span className="text-neutral-500">{viewingDocument.size}</span>
            </>
          )}

          <div className="ml-auto">
            <Badge variant="primary" size="sm">
              Ready for RAG
            </Badge>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {viewingDocument.tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-md font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Content Viewer */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 bg-neutral-50/40 dark:bg-neutral-950/40 font-mono text-xs leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap max-h-80 overflow-y-auto">
          {viewingDocument.fullContent || viewingDocument.excerpt}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCitation}
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied' : 'Copy Citation'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                addToast({
                  type: 'info',
                  title: 'Mock Export',
                  description: 'Exporting vector-indexed chunks format.'
                });
              }}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Export Chunks
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setViewingDocument(null)}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
