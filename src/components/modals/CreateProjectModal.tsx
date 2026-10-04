import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Textarea, Select } from '../common/Input';
import { ProjectStatus } from '../../types';

export const CreateProjectModal: React.FC = () => {
  const {
    isCreateProjectOpen,
    setIsCreateProjectOpen,
    createProject,
    updateProject,
    editingProject,
    setEditingProject
  } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('In Progress');
  const [progress, setProgress] = useState(20);
  const [techInput, setTechInput] = useState('React, TypeScript, FastAPI, ChromaDB');
  const [repoUrl, setRepoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name);
      setDescription(editingProject.description);
      setStatus(editingProject.status);
      setProgress(editingProject.progress);
      setTechInput(editingProject.technologies.join(', '));
      setRepoUrl(editingProject.repositoryUrl || '');
    } else {
      setName('');
      setDescription('');
      setStatus('In Progress');
      setProgress(20);
      setTechInput('React, TypeScript, FastAPI, ChromaDB');
      setRepoUrl('');
    }
  }, [editingProject, isCreateProjectOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const technologies = techInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (editingProject) {
        await updateProject({
          ...editingProject,
          name: name.trim(),
          description: description.trim(),
          status,
          progress: Number(progress),
          technologies,
          repositoryUrl: repoUrl.trim() || undefined
        });
      } else {
        await createProject({
          name: name.trim(),
          description: description.trim(),
          status,
          progress: Number(progress),
          technologies,
          repositoryUrl: repoUrl.trim() || undefined
        });
      }

      setEditingProject(null);
      setIsCreateProjectOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEditingProject(null);
    setIsCreateProjectOpen(false);
  };

  return (
    <Modal
      isOpen={isCreateProjectOpen}
      onClose={handleClose}
      title={editingProject ? 'Edit Project' : 'Create New Project'}
      subtitle={
        editingProject
          ? 'Update status, progress, and technical stack'
          : 'Register an initiative in your technical roadmap'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Project Name *"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Semantic Code Search Engine"
          required
        />

        <Textarea
          label="Description"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What is the objective, architecture, and scope of this project?"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Status"
            value={status}
            onChange={e => setStatus(e.target.value as ProjectStatus)}
            options={[
              { label: 'Planning', value: 'Planning' },
              { label: 'In Progress', value: 'In Progress' },
              { label: 'Review', value: 'Review' },
              { label: 'Completed', value: 'Completed' }
            ]}
          />

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <span>Progress</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{progress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
            />
          </div>
        </div>

        <Input
          label="Technologies (comma-separated)"
          value={techInput}
          onChange={e => setTechInput(e.target.value)}
          placeholder="Python, FastAPI, Tree-sitter, FAISS"
        />

        <Input
          label="Repository / Link (Optional)"
          value={repoUrl}
          onChange={e => setRepoUrl(e.target.value)}
          placeholder="https://github.com/..."
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
            disabled={!name.trim()}
          >
            {editingProject ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
