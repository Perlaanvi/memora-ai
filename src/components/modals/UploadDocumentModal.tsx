import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Textarea, Select } from '../common/Input';
import { UploadCloud, FileText, Check, AlertCircle, FileCode } from 'lucide-react';
import { DocumentType } from '../../types';

export const UploadDocumentModal: React.FC = () => {
  const { isUploadDocOpen, setIsUploadDocOpen, uploadDocument } = useApp();

  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('Generative AI');
  const [docType, setDocType] = useState<DocumentType>('PDF');
  const [tagsInput, setTagsInput] = useState('RAG, Architecture');
  const [excerpt, setExcerpt] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      setFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      await uploadDocument({
        title,
        type: docType,
        topic,
        tags,
        excerpt: excerpt.trim() || 'Uploaded personal research document for semantic indexing and retrieval.',
        size: fileSize || '2.4 MB',
        fullContent: `# ${title}\n\nDocument ingested into Personal Second Brain for vector indexing.\n\n### Summary\n${excerpt || 'Synthesized document notes ready for future RAG retrieval and question answering.'}`
      });

      // Reset form & close
      setTitle('');
      setExcerpt('');
      setFileName('');
      setFileSize('');
      setIsUploadDocOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isUploadDocOpen}
      onClose={() => setIsUploadDocOpen(false)}
      title="Upload Knowledge Document"
      subtitle="Add files or notes to your Second Brain knowledge base"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/5'
              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt,.md"
          />

          {fileName ? (
            <div className="flex items-center justify-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-xs">
                  {fileName}
                </p>
                <p className="text-xs text-neutral-400">{fileSize} • Ready to index</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  PDF, Markdown, Notes, or TXT (up to 25MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <Input
          label="Document Title *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g., RAG Architecture & Vector Indexing"
          required
        />

        {/* Type & Topic in Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Document Format"
            value={docType}
            onChange={e => setDocType(e.target.value as DocumentType)}
            options={[
              { label: 'PDF Document', value: 'PDF' },
              { label: 'Notes', value: 'Notes' },
              { label: 'Markdown (.md)', value: 'Markdown' },
              { label: 'Web Article', value: 'Web' },
              { label: 'Word Document', value: 'Doc' }
            ]}
          />

          <Select
            label="Domain Topic"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            options={[
              { label: 'Generative AI', value: 'Generative AI' },
              { label: 'Vector Search', value: 'Vector Search' },
              { label: 'Machine Learning', value: 'Machine Learning' },
              { label: 'Programming', value: 'Programming' },
              { label: 'Software Engineering', value: 'Software Engineering' },
              { label: 'Research & Science', value: 'Research & Science' }
            ]}
          />
        </div>

        {/* Tags */}
        <Input
          label="Tags (comma-separated)"
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          placeholder="RAG, Embeddings, Evaluation"
        />

        {/* Excerpt / Summary */}
        <Textarea
          label="Summary or Study Notes"
          rows={3}
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          placeholder="Key concepts covered in this document..."
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsUploadDocOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isSubmitting}
            disabled={!title.trim()}
          >
            Save to Second Brain
          </Button>
        </div>
      </form>
    </Modal>
  );
};
