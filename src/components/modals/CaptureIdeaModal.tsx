import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Textarea, Select } from '../common/Input';
import { IdeaPriority, IdeaStatus } from '../../types';

export const CaptureIdeaModal: React.FC = () => {
  const {
    isCaptureIdeaOpen,
    setIsCaptureIdeaOpen,
    captureIdea,
    updateIdea,
    editingIdea,
    setEditingIdea
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IdeaPriority>('High');
  const [status, setStatus] = useState<IdeaStatus>('Raw');
  const [tagsInput, setTagsInput] = useState('AI, Interactive, Education');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingIdea) {
      setTitle(editingIdea.title);
      setDescription(editingIdea.description);
      setPriority(editingIdea.priority);
      setStatus(editingIdea.status);
      setTagsInput(editingIdea.tags.join(', '));
    } else {
      setTitle('');
      setDescription('');
      setPriority('High');
      setStatus('Raw');
      setTagsInput('AI, Interactive, Education');
    }
  }, [editingIdea, isCaptureIdeaOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (editingIdea) {
        await updateIdea({
          ...editingIdea,
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          tags
        });
      } else {
        await captureIdea({
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          tags
        });
      }

      setEditingIdea(null);
      setIsCaptureIdeaOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEditingIdea(null);
    setIsCaptureIdeaOpen(false);
  };

  return (
    <Modal
      isOpen={isCaptureIdeaOpen}
      onClose={handleClose}
      title={editingIdea ? 'Edit Idea' : 'Capture Idea'}
      subtitle={
        editingIdea
          ? 'Refine your hypothesis, priority, and next stage'
          : 'Capture thoughts, product sparks, and experiments before they fade'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Idea Title *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g., AI Coding Tutor"
          required
        />

        <Textarea
          label="Idea Description *"
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g., Build an AI assistant that explains code and generates personalized coding exercises tailored to user's knowledge gaps."
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Priority"
            value={priority}
            onChange={e => setPriority(e.target.value as IdeaPriority)}
            options={[
              { label: 'High Priority', value: 'High' },
              { label: 'Medium Priority', value: 'Medium' },
              { label: 'Low Priority', value: 'Low' }
            ]}
          />

          <Select
            label="Stage / Status"
            value={status}
            onChange={e => setStatus(e.target.value as IdeaStatus)}
            options={[
              { label: 'Raw Spark', value: 'Raw' },
              { label: 'Exploring', value: 'Exploring' },
              { label: 'Planned Roadmap', value: 'Planned' },
              { label: 'Archived', value: 'Archived' }
            ]}
          />
        </div>

        <Input
          label="Tags (comma-separated)"
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          placeholder="AI, NLP, EdTech"
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
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
            {editingIdea ? 'Save Changes' : 'Capture Idea'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
