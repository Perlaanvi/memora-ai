import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Textarea, Select } from '../common/Input';
import { MemoryCategory, MemoryItem } from '../../types';

export const AddMemoryModal: React.FC = () => {
  const {
    isAddMemoryOpen,
    setIsAddMemoryOpen,
    editingMemory,
    setEditingMemory,
    addMemory,
    updateMemory
  } = useApp();

  const [content, setContent] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('Learning');
  const [tagsInput, setTagsInput] = useState('AI, RAG, Embeddings');
  const [sourceRef, setSourceRef] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingMemory) {
      setContent(editingMemory.content);
      setCategory(editingMemory.category);
      setTagsInput(editingMemory.tags.join(', '));
      setSourceRef(editingMemory.sourceRef || '');
      setIsPinned(!!editingMemory.pinned);
    } else {
      setContent('');
      setCategory('Learning');
      setTagsInput('AI, RAG, Embeddings');
      setSourceRef('');
      setIsPinned(false);
    }
  }, [editingMemory, isAddMemoryOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (editingMemory) {
        await updateMemory({
          ...editingMemory,
          content: content.trim(),
          category,
          tags,
          sourceRef: sourceRef.trim() || undefined,
          pinned: isPinned
        });
      } else {
        await addMemory({
          content: content.trim(),
          category,
          tags,
          sourceRef: sourceRef.trim() || undefined,
          pinned: isPinned
        });
      }

      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsAddMemoryOpen(false);
    setEditingMemory(null);
  };

  return (
    <Modal
      isOpen={isAddMemoryOpen}
      onClose={handleClose}
      title={editingMemory ? 'Edit Memory' : 'Store New Memory'}
      subtitle="Record an essential insight, preference, or fact for your Second Brain"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          label="Memory Content *"
          rows={4}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="e.g., I learned how semantic search can find information based on meaning rather than exact keywords."
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value as MemoryCategory)}
            options={[
              { label: 'Learning', value: 'Learning' },
              { label: 'Personal', value: 'Personal' },
              { label: 'Projects', value: 'Projects' },
              { label: 'Ideas', value: 'Ideas' },
              { label: 'Preference', value: 'Preference' },
              { label: 'Fact', value: 'Fact' },
              { label: 'Insight', value: 'Insight' },
              { label: 'Workflow', value: 'Workflow' }
            ]}
          />

          <Input
            label="Source Reference (Optional)"
            value={sourceRef}
            onChange={e => setSourceRef(e.target.value)}
            placeholder="e.g., RAG Fundamentals"
          />
        </div>

        <Input
          label="Tags (comma-separated)"
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          placeholder="AI, RAG, Embeddings"
        />

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="pin-memory"
            checked={isPinned}
            onChange={e => setIsPinned(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800"
          />
          <label htmlFor="pin-memory" className="text-xs font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">
            Pin this memory to priority context
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isSubmitting}
            disabled={!content.trim()}
          >
            {editingMemory ? 'Save Changes' : 'Store Memory'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
