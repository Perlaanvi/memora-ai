import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { ProgressBar } from '../components/common/ProgressBar';
import {
  FolderKanban,
  Plus,
  Search,
  ExternalLink,
  Code2,
  Clock,
  Layers,
  ArrowRight,
  Edit3,
  Trash2
} from 'lucide-react';
import { ProjectItem, ProjectStatus } from '../types';

export const ProjectsPage: React.FC = () => {
  const {
    projects,
    isLoading,
    dataError,
    reloadData,
    setIsCreateProjectOpen,
    setEditingProject,
    deleteProject,
    setActiveTab
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filteredProjects = projects.filter(p => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchTech = p.technologies.some(t => t.toLowerCase().includes(q));
      return matchName || matchDesc || matchTech;
    }
    return true;
  });

  const getStatusBadgeVariant = (status: ProjectStatus) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'primary';
      case 'Planning':
        return 'amber';
      case 'Review':
        return 'purple';
      default:
        return 'neutral';
    }
  };

  const handleEdit = (project: ProjectItem) => {
    setEditingProject(project);
    setIsCreateProjectOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteProject(id);
  };

  if (isLoading) return <LoadingState message="Loading projects..." />;
  if (dataError) {
    return (
      <EmptyState
        icon={<FolderKanban className="w-6 h-6" />}
        title="Unable to load projects"
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
            Projects
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Active technical systems, architecture prototypes, and research applications.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingProject(null);
            setIsCreateProjectOpen(true);
          }}
          icon={<Plus className="w-3.5 h-3.5" />}
          className="shadow-2xs py-2 px-3.5 text-xs font-semibold"
        >
          New Project
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
            placeholder="Search projects by name, stack, or description..."
            className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 w-fit text-xs overflow-x-auto">
          {['All', 'In Progress', 'Planning', 'Completed'].map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap text-xs ${
                statusFilter === tab
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-6 h-6" />}
          title={projects.length === 0 ? "No projects created yet" : "No projects match your filter"}
          description={
            projects.length === 0
              ? "Track your personal projects, initiatives, and creative ventures."
              : "Try switching to another filter tab or create a new project."
          }
          actionLabel="New Project"
          onAction={() => {
            setEditingProject(null);
            setIsCreateProjectOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredProjects.map(proj => (
            <div
              key={proj.id}
              className="group bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 sm:p-5 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-2xs transition-all duration-150 flex flex-col justify-between"
            >
              <div>
                {/* Card Header: Name, Status, Actions */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getStatusBadgeVariant(proj.status)} size="sm">
                        {proj.status}
                      </Badge>
                      <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated {proj.lastUpdated}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-snug">
                      {proj.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(proj)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                      title="Edit project"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => handleDelete(proj.id, e)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  {proj.description}
                </p>

                {/* Progress Bar */}
                <ProgressBar progress={proj.progress} showLabel className="mt-3.5" />

                {/* Technologies */}
                <div className="mt-3.5 flex flex-wrap gap-1">
                  {proj.technologies.map(tech => (
                    <span
                      key={tech}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer: Goals Linked or Repository */}
              <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                {proj.goalsLinked && proj.goalsLinked.length > 0 ? (
                  <div className="flex items-center gap-1.5 truncate text-neutral-500 dark:text-neutral-400">
                    <span className="text-[10px] font-semibold text-neutral-400">Goal:</span>
                    <button
                      onClick={() => setActiveTab('goals')}
                      className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate cursor-pointer"
                    >
                      {proj.goalsLinked[0]}
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-neutral-400">Independent Project</span>
                )}

                {proj.repositoryUrl && (
                  <a
                    href={proj.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                  >
                    <span>Repo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
