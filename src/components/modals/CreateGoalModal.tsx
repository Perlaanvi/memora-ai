import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Textarea, Select } from '../common/Input';
import { GoalStatus, GoalItem } from '../../types';

export const CreateGoalModal: React.FC = () => {
  const {
    isCreateGoalOpen,
    setIsCreateGoalOpen,
    editingGoal,
    setEditingGoal,
    createGoal,
    updateGoal,
    projects
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState(50);
  const [status, setStatus] = useState<GoalStatus>('In Progress');
  const [targetDate, setTargetDate] = useState('December 2026');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description);
      setProgress(editingGoal.progress);
      setStatus(editingGoal.status);
      setTargetDate(editingGoal.targetDate);
      setSelectedProjects(editingGoal.relatedProjects);
    } else {
      setTitle('');
      setDescription('');
      setProgress(25);
      setStatus('In Progress');
      setTargetDate('December 2026');
      setSelectedProjects(projects.slice(0, 1).map(p => p.name));
    }
  }, [editingGoal, isCreateGoalOpen, projects]);

  const handleClose = () => {
    setIsCreateGoalOpen(false);
    setEditingGoal(null);
  };

  const toggleProject = (name: string) => {
    setSelectedProjects(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingGoal) {
        await updateGoal({
          ...editingGoal,
          title: title.trim(),
          description: description.trim(),
          progress: Number(progress),
          status,
          targetDate,
          relatedProjects: selectedProjects
        });
      } else {
        await createGoal({
          title: title.trim(),
          description: description.trim(),
          progress: Number(progress),
          status,
          targetDate,
          relatedProjects: selectedProjects,
          milestones: [
            { id: `m-${Date.now()}-1`, title: 'Define scope and core syllabus', completed: true },
            { id: `m-${Date.now()}-2`, title: 'Complete hands-on implementation', completed: false }
          ]
        });
      }
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isCreateGoalOpen}
      onClose={handleClose}
      title={editingGoal ? 'Edit Goal' : 'Establish New Goal'}
      subtitle="Track what you're working toward with measurable milestones"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Goal Title *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g., Become an AI/ML Engineer"
          required
        />

        <Textarea
          label="Description"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe your desired outcome and learning curriculum..."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Status"
            value={status}
            onChange={e => setStatus(e.target.value as GoalStatus)}
            options={[
              { label: 'In Progress', value: 'In Progress' },
              { label: 'Planning', value: 'Planning' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Paused', value: 'Paused' }
            ]}
          />

          <Input
            label="Target Date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            placeholder="e.g., December 2026"
          />
        </div>

        {/* Progress Slider */}
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
            className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Related Projects */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Link Related Projects
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {projects.map(proj => {
              const isSelected = selectedProjects.includes(proj.name);
              return (
                <button
                  type="button"
                  key={proj.id}
                  onClick={() => toggleProject(proj.name)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-2xs'
                      : 'bg-neutral-50 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {proj.name}
                </button>
              );
            })}
          </div>
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
            disabled={!title.trim()}
          >
            {editingGoal ? 'Save Goal' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
