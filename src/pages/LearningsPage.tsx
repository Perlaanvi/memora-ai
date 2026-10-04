import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { Modal } from '../components/common/Modal';
import { Input, Textarea, Select } from '../components/common/Input';
import {
  GraduationCap,
  Plus,
  Search,
  BookOpen,
  Calendar,
  Link2,
  Sparkles,
  Copy,
  Check,
  Trash2,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { LearningItem } from '../types';

export const LearningsPage: React.FC = () => {
  const {
    learnings,
    isLoading,
    dataError,
    reloadData,
    addLearning,
    deleteLearning,
    viewingLearning,
    setViewingLearning,
    setActiveTab,
    addToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New learning form state
  const [topic, setTopic] = useState('');
  const [explanation, setExplanation] = useState('');
  const [category, setCategory] = useState('Personal');
  const [relatedKnowledge, setRelatedKnowledge] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unique categories for filtering
  const allCategories = ['All', ...Array.from(new Set(learnings.map(l => l.category)))];

  const filteredLearnings = learnings.filter(l => {
    if (selectedTopicFilter !== 'All' && l.category !== selectedTopicFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTopic = l.topic.toLowerCase().includes(q);
      const matchExplanation = l.explanation.toLowerCase().includes(q);
      const matchTags = l.tags.some(t => t.toLowerCase().includes(q));
      const matchRelated = l.relatedKnowledge.some(r => r.toLowerCase().includes(q));
      return matchTopic || matchExplanation || matchTags || matchRelated;
    }
    return true;
  });

  const handleCopyExplanation = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast({
      type: 'info',
      title: 'Copied',
      description: 'Learning definition copied to clipboard.'
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateLearning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !explanation.trim()) return;

    setIsSubmitting(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const related = relatedKnowledge.split(',').map(r => r.trim()).filter(Boolean);

      await addLearning({
        topic: topic.trim(),
        explanation: explanation.trim(),
        category,
        relatedKnowledge: related,
        tags
      });

      setTopic('');
      setExplanation('');
      setRelatedKnowledge('');
      setTagsInput('');
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading learnings..." />;
  if (dataError) {
    return (
      <EmptyState
        icon={<GraduationCap className="w-6 h-6" />}
        title="Unable to load learnings"
        description={dataError}
        actionLabel="Retry"
        onAction={reloadData}
      />
    );
  }

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Learnings
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Build your personal library of knowledge.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          icon={<Plus className="w-3.5 h-3.5" />}
          className="shadow-2xs py-2 px-3.5 text-xs font-semibold"
        >
          Add Learning
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search learnings by topic, concept, or tag..."
            className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs"
          />
        </div>

        {/* Filter by Topic Chips */}
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 overflow-x-auto text-xs">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedTopicFilter(cat)}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap text-xs ${
                selectedTopicFilter === cat
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Learnings Grid */}
      {filteredLearnings.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-6 h-6" />}
          title="No learnings found"
          description="Capture your key breakthroughs, lessons learned, and personal reflections."
          actionLabel="Add Learning"
          onAction={() => setIsAddModalOpen(true)}
          actionIcon={<Plus className="w-4 h-4" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredLearnings.map(learning => (
            <div
              key={learning.id}
              onClick={() => setViewingLearning(learning)}
              className="group bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 sm:p-5 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-2xs transition-all duration-150 flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Header: Topic Category & Date & Delete */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="amber" size="sm">
                    {learning.category}
                  </Badge>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-neutral-400 flex items-center gap-1 mr-1 font-mono">
                      <Calendar className="w-3 h-3" />
                      {learning.dateLearned}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLearning(learning.id);
                      }}
                      className="p-1 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Delete learning"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Topic Title */}
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-50 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                  {learning.topic}
                </h3>

                {/* Explanation */}
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 line-clamp-3 leading-relaxed">
                  {learning.explanation}
                </p>
              </div>

              {/* Card Footer: Tags & Related Knowledge */}
              <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2.5">
                {/* Related Knowledge badges */}
                {learning.relatedKnowledge.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-neutral-400">Related:</span>
                    {learning.relatedKnowledge.map(item => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 truncate max-w-[150px]"
                      >
                        <BookOpen className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{item}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Tags & Copy Action */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100/60 dark:border-neutral-800/40">
                  <div className="flex flex-wrap gap-1">
                    {learning.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyExplanation(learning.id, learning.explanation);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer shrink-0"
                    title="Copy explanation"
                  >
                    {copiedId === learning.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Learning Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Distill New Learning"
        subtitle="Codify mental models, architectural patterns, and mathematical insights"
        maxWidth="md"
      >
        <form onSubmit={handleCreateLearning} className="space-y-4">
          <Input
            label="Learning Topic / Concept *"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g., Cosine Similarity in High-Dimensional Vector Spaces"
            required
          />

          <Textarea
            label="Explanation & Mental Model *"
            rows={4}
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            placeholder="Explain why this concept matters, how it behaves under load, and key intuition..."
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Topic Category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              options={[
                { label: 'Foundations', value: 'Foundations' },
                { label: 'Generative AI', value: 'Generative AI' },
                { label: 'Vector Search', value: 'Vector Search' },
                { label: 'Machine Learning', value: 'Machine Learning' },
                { label: 'Software Architecture', value: 'Software Architecture' }
              ]}
            />

            <Input
              label="Related Knowledge References"
              value={relatedKnowledge}
              onChange={e => setRelatedKnowledge(e.target.value)}
              placeholder="RAG Fundamentals, Python Notes"
            />
          </div>

          <Input
            label="Tags (comma separated)"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="AI, Vector DB, Math"
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
              disabled={!topic.trim() || !explanation.trim()}
            >
              Add Learning
            </Button>
          </div>
        </form>
      </Modal>

      {/* Learning Detail Modal */}
      {viewingLearning && (
        <Modal
          isOpen={!!viewingLearning}
          onClose={() => setViewingLearning(null)}
          title={viewingLearning.topic}
          subtitle={`Learned on ${viewingLearning.dateLearned} • ${viewingLearning.category}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/70">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Distilled Explanation
              </h4>
              <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                {viewingLearning.explanation}
              </p>
            </div>

            {/* Related Knowledge Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Associated Knowledge Items
              </h4>
              <div className="flex flex-wrap gap-2">
                {viewingLearning.relatedKnowledge.map(item => (
                  <div
                    key={item}
                    className="p-2.5 rounded-lg border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {viewingLearning.tags.map(tag => (
                  <Badge key={tag} variant="neutral" size="sm">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => {
                  deleteLearning(viewingLearning.id);
                  setViewingLearning(null);
                }}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
              >
                Delete Learning
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setViewingLearning(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
