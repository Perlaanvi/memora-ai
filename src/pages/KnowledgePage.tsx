import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import {
  Upload,
  Search,
  FileText,
  Clock,
  Layers,
  LayoutGrid,
  List as ListIcon,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  HardDrive,
  CheckCircle2,
  FileCode,
  Globe,
  StickyNote,
  Network,
  Users,
  MapPin,
  Building,
  Briefcase,
  Calendar,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Brain,
  X,
  Info
} from 'lucide-react';
import {
  DocumentItem,
  KnowledgeEntity,
  KnowledgeRelationship,
  KnowledgeEntityType,
  MemoryItem
} from '../types';
import { api } from '../services/api';

export const KnowledgePage: React.FC = () => {
  const {
    documents,
    memories,
    setIsUploadDocOpen,
    setViewingDocument,
    userSettings,
    setActiveTab
  } = useApp();

  // Top-level section switcher: 'graph' (Knowledge Graph) | 'vault' (Document Vault)
  const [sectionMode, setSectionMode] = useState<'graph' | 'vault'>('graph');

  // Knowledge Graph State
  const [graphTab, setGraphTab] = useState<'entities' | 'relationships'>('entities');
  const [entities, setEntities] = useState<KnowledgeEntity[]>([]);
  const [relationships, setRelationships] = useState<KnowledgeRelationship[]>([]);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);

  // Filters & Search
  const [graphSearchQuery, setGraphSearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('All');

  // Modals
  const [selectedEntity, setSelectedEntity] = useState<KnowledgeEntity | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<KnowledgeRelationship | null>(null);

  // Document Vault State
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docSelectedFilter, setDocSelectedFilter] = useState<string>('All');
  const [docViewMode, setDocViewMode] = useState<'grid' | 'list'>(
    userSettings.defaultKnowledgeView || 'grid'
  );

  // Fetch Knowledge Graph Data
  const loadKnowledgeGraph = async () => {
    setLoadingGraph(true);
    try {
      const [ents, rels] = await Promise.all([
        api.getKnowledgeEntities(),
        api.getKnowledgeRelationships()
      ]);
      setEntities(ents || []);
      setRelationships(rels || []);
    } catch (err) {
      console.warn('Failed to load knowledge graph:', err);
    } finally {
      setLoadingGraph(false);
    }
  };

  useEffect(() => {
    loadKnowledgeGraph();
  }, []);

  // Handle Rebuild
  const handleRebuildGraph = async () => {
    setRebuilding(true);
    setRebuildStatus(null);
    try {
      const res = await api.rebuildKnowledgeGraph();
      await loadKnowledgeGraph();
      setRebuildStatus(`Rebuilt: ${res.entitiesCount} entities, ${res.relationshipsCount} relationships from ${res.processedMemoriesCount} memories.`);
      setTimeout(() => setRebuildStatus(null), 5000);
    } catch (err: any) {
      setRebuildStatus(`Rebuild failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setRebuilding(false);
    }
  };

  // Helper: map memoryId to MemoryItem
  const getMemoryById = (memoryId: string): MemoryItem | undefined => {
    return memories.find(m => m.id === memoryId);
  };

  // Entity Type Icons & Badges
  const getEntityTypeIcon = (type: KnowledgeEntityType) => {
    switch (type) {
      case 'person':
        return <Users className="w-3.5 h-3.5 text-indigo-500" />;
      case 'place':
        return <MapPin className="w-3.5 h-3.5 text-emerald-500" />;
      case 'organization':
        return <Building className="w-3.5 h-3.5 text-blue-500" />;
      case 'project':
        return <Briefcase className="w-3.5 h-3.5 text-amber-500" />;
      case 'event':
        return <Calendar className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-neutral-500" />;
    }
  };

  const getEntityTypeBadgeVariant = (type: KnowledgeEntityType) => {
    switch (type) {
      case 'person':
        return 'primary';
      case 'place':
        return 'success';
      case 'organization':
        return 'blue';
      case 'project':
        return 'amber';
      case 'event':
        return 'purple';
      default:
        return 'neutral';
    }
  };

  // Filtered Entities
  const filteredEntities = entities.filter(ent => {
    if (ent.entityId === 'self') return false; // Do not show internal SELF as a standard card
    if (entityTypeFilter !== 'All' && ent.type.toLowerCase() !== entityTypeFilter.toLowerCase()) {
      return false;
    }
    if (graphSearchQuery.trim()) {
      const q = graphSearchQuery.toLowerCase();
      const matchName = ent.name.toLowerCase().includes(q);
      const matchAliases = Array.isArray(ent.aliases) && ent.aliases.some(a => a.toLowerCase().includes(q));
      return matchName || matchAliases;
    }
    return true;
  });

  // Filtered Relationships
  const entityNameMap = new Map<string, string>();
  entityNameMap.set('self', 'You');
  entities.forEach(e => entityNameMap.set(e.entityId, e.name));

  const filteredRelationships = relationships.filter(rel => {
    const sName = entityNameMap.get(rel.sourceEntityId) || rel.sourceEntityId;
    const tName = entityNameMap.get(rel.targetEntityId) || rel.targetEntityId;
    const rName = rel.relation.replace(/_/g, ' ');

    if (graphSearchQuery.trim()) {
      const q = graphSearchQuery.toLowerCase();
      return (
        sName.toLowerCase().includes(q) ||
        tName.toLowerCase().includes(q) ||
        rName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Document Vault filtering
  const filteredDocs = documents.filter(doc => {
    if (docSelectedFilter === 'Documents') {
      if (doc.type !== 'PDF' && doc.type !== 'Doc') return false;
    } else if (docSelectedFilter === 'Notes') {
      if (doc.type !== 'Notes' && doc.type !== 'Markdown') return false;
    } else if (docSelectedFilter === 'Projects') {
      const isProject =
        doc.tags.some(t => t.toLowerCase().includes('project') || t.toLowerCase().includes('architecture')) ||
        doc.topic === 'Software Engineering';
      if (!isProject) return false;
    } else if (docSelectedFilter === 'Learnings') {
      const isLearning =
        doc.tags.some(t => t.toLowerCase().includes('learning')) || doc.topic.toLowerCase().includes('learning');
      if (!isLearning) return false;
    }

    if (docSearchQuery.trim()) {
      const q = docSearchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchTopic = doc.topic.toLowerCase().includes(q);
      const matchExcerpt = doc.excerpt.toLowerCase().includes(q);
      const matchTags = doc.tags.some(t => t.toLowerCase().includes(q));
      return matchTitle || matchTopic || matchExcerpt || matchTags;
    }

    return true;
  });

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Knowledge
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              Second Brain Knowledge Layer
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Structured personal knowledge graph & reference vault.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sectionMode === 'graph' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRebuildGraph}
              disabled={rebuilding}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${rebuilding ? 'animate-spin text-indigo-600' : ''}`} />}
              className="text-xs font-semibold"
            >
              {rebuilding ? 'Rebuilding Graph...' : 'Rebuild Graph'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsUploadDocOpen(true)}
              icon={<Upload className="w-3.5 h-3.5" />}
              className="shadow-2xs py-2 px-3.5 text-xs font-semibold"
            >
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Rebuild notification banner */}
      {rebuildStatus && (
        <div className="flex items-center gap-2 p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-800 dark:text-indigo-200 animate-in fade-in">
          <Info className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>{rebuildStatus}</span>
        </div>
      )}

      {/* Top Segmented Navigation: Knowledge Graph vs Document Vault */}
      <div className="flex items-center gap-2 border-b border-neutral-200/80 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setSectionMode('graph')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            sectionMode === 'graph'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Knowledge Graph</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
            sectionMode === 'graph'
              ? 'bg-neutral-800 dark:bg-neutral-200 text-neutral-200 dark:text-neutral-800'
              : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}>
            {entities.filter(e => e.entityId !== 'self').length} ents • {relationships.length} rels
          </span>
        </button>

        <button
          onClick={() => setSectionMode('vault')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            sectionMode === 'vault'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Document Vault</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
            sectionMode === 'vault'
              ? 'bg-neutral-800 dark:bg-neutral-200 text-neutral-200 dark:text-neutral-800'
              : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}>
            {documents.length}
          </span>
        </button>
      </div>

      {/* ================================= SECTION 1: KNOWLEDGE GRAPH ================================= */}
      {sectionMode === 'graph' && (
        <div className="space-y-4">
          {/* Sub-controls: Entities vs Relationships switcher, Search, and Type Filter */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={graphSearchQuery}
                onChange={e => setGraphSearchQuery(e.target.value)}
                placeholder={graphTab === 'entities' ? "Search entities (e.g. Ravi, Hyderabad)..." : "Search relationships (e.g. college friend, met)..."}
                className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs"
              />
            </div>

            {/* Filter Pills + Sub Tabs */}
            <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                <button
                  onClick={() => setGraphTab('entities')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap text-xs ${
                    graphTab === 'entities'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Entities ({filteredEntities.length})
                </button>
                <button
                  onClick={() => setGraphTab('relationships')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap text-xs ${
                    graphTab === 'relationships'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Relationships ({filteredRelationships.length})
                </button>
              </div>

              {graphTab === 'entities' && (
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                  {['All', 'Person', 'Place', 'Organization', 'Project'].map(f => (
                    <button
                      key={f}
                      onClick={() => setEntityTypeFilter(f)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap text-xs ${
                        entityTypeFilter === f
                          ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loadingGraph && (
            <div className="py-12 text-center text-xs text-neutral-500 dark:text-neutral-400">
              Loading knowledge graph...
            </div>
          )}

          {/* Entities Grid */}
          {!loadingGraph && graphTab === 'entities' && (
            filteredEntities.length === 0 ? (
              <EmptyState
                icon={<Network className="w-6 h-6 text-neutral-400" />}
                title={graphSearchQuery ? "No entities found" : "No entities extracted yet"}
                description={
                  graphSearchQuery
                    ? `No entities matching "${graphSearchQuery}". Try clearing search.`
                    : "Confirm memories in Memora to extract entities and discover structured relationships."
                }
                actionLabel={graphSearchQuery ? "Clear Search" : "Rebuild Graph"}
                onAction={() => graphSearchQuery ? setGraphSearchQuery('') : handleRebuildGraph()}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredEntities.map(ent => {
                  // Count connected relationships
                  const connectedRels = relationships.filter(
                    r => r.sourceEntityId === ent.entityId || r.targetEntityId === ent.entityId
                  );

                  return (
                    <div
                      key={ent.entityId}
                      onClick={() => setSelectedEntity(ent)}
                      className="group bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-2xs transition-all duration-150 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Type icon & Badge */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0">
                            {getEntityTypeIcon(ent.type)}
                          </div>
                          <Badge variant={getEntityTypeBadgeVariant(ent.type)} size="sm">
                            {ent.type}
                          </Badge>
                        </div>

                        {/* Entity Name */}
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {ent.name}
                        </h4>

                        {/* Aliases */}
                        {Array.isArray(ent.aliases) && ent.aliases.length > 0 && (
                          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 line-clamp-1">
                            aka: {ent.aliases.join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Footer: Connected Relationships Count */}
                      <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span>{connectedRels.length} {connectedRels.length === 1 ? 'connection' : 'connections'}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Inspect <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Relationships List */}
          {!loadingGraph && graphTab === 'relationships' && (
            filteredRelationships.length === 0 ? (
              <EmptyState
                icon={<Network className="w-6 h-6 text-neutral-400" />}
                title={graphSearchQuery ? "No relationships found" : "No relationships recorded"}
                description={
                  graphSearchQuery
                    ? `No relationships matching "${graphSearchQuery}". Try clearing search.`
                    : "Confirm memories in Memora to extract personal relationships."
                }
                actionLabel={graphSearchQuery ? "Clear Search" : "Rebuild Graph"}
                onAction={() => graphSearchQuery ? setGraphSearchQuery('') : handleRebuildGraph()}
              />
            ) : (
              <div className="space-y-2">
                {filteredRelationships.map(rel => {
                  const sourceName = entityNameMap.get(rel.sourceEntityId) || rel.sourceEntityId;
                  const targetName = entityNameMap.get(rel.targetEntityId) || rel.targetEntityId;
                  const cleanRelation = rel.relation.replace(/_/g, ' ');

                  // First supporting memory preview
                  const firstMem = rel.sourceMemoryIds && rel.sourceMemoryIds.length > 0
                    ? getMemoryById(rel.sourceMemoryIds[0])
                    : undefined;

                  return (
                    <div
                      key={rel.relationshipId}
                      onClick={() => setSelectedRelationship(rel)}
                      className="group bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-3.5 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-2xs transition-all duration-150 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                        {/* Source entity */}
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          rel.sourceEntityId === 'self'
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50'
                        }`}>
                          {sourceName}
                        </span>

                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />

                        {/* Relation badge */}
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60 lowercase">
                          {cleanRelation}
                        </span>

                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />

                        {/* Target entity */}
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                          {targetName}
                        </span>
                      </div>

                      {/* Supporting memory count badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/60 px-2 py-1 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60">
                          <Brain className="w-3 h-3 text-indigo-500" />
                          <span>{rel.sourceMemoryIds?.length || 0} supporting {rel.sourceMemoryIds?.length === 1 ? 'memory' : 'memories'}</span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* ================================= SECTION 2: DOCUMENT VAULT ================================= */}
      {sectionMode === 'vault' && (
        <div className="space-y-4">
          {/* Controls Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={docSearchQuery}
                onChange={e => setDocSearchQuery(e.target.value)}
                placeholder="Search your document vault..."
                className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                {['All', 'Documents', 'Notes', 'Projects', 'Learnings'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setDocSelectedFilter(filter)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap text-xs ${
                      docSelectedFilter === filter
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
                <button
                  onClick={() => setDocViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    docViewMode === 'grid'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                      : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDocViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    docViewMode === 'list'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                      : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`}
                  title="List view"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Document Content */}
          {documents.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-6 h-6" />}
              title="No documents in your vault"
              description="Upload personal notes, articles, or PDF documents to search and reference them anytime."
              actionLabel="Upload Document"
              onAction={() => setIsUploadDocOpen(true)}
            />
          ) : filteredDocs.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-6 h-6" />}
              title="No documents match your query"
              description={`No results found for "${docSearchQuery}". Try changing your search query or active filter.`}
              actionLabel="Clear Filters"
              onAction={() => {
                setDocSearchQuery('');
                setDocSelectedFilter('All');
              }}
            />
          ) : docViewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredDocs.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setViewingDocument(doc)}
                  className="group bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-4 sm:p-5 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-2xs transition-all duration-150 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0">
                          {doc.type === 'PDF' ? <FileText className="w-4 h-4 text-indigo-500" /> : <StickyNote className="w-4 h-4 text-amber-500" />}
                        </div>
                        <Badge variant="neutral" size="sm">
                          {doc.type}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {doc.status || 'Indexed'}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                      {doc.title}
                    </h3>

                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {doc.excerpt}
                    </p>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300 truncate max-w-[140px]">
                        {doc.topic}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
                        <span>{doc.size || '2.4 MB'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-neutral-400">
                          <Clock className="w-3 h-3" />
                          {doc.updated}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl overflow-hidden shadow-2xs divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredDocs.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setViewingDocument(doc)}
                  className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0">
                      {doc.type === 'PDF' ? <FileText className="w-4 h-4 text-indigo-500" /> : <StickyNote className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {doc.title}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        {doc.excerpt}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs text-neutral-400">
                    <span>{doc.topic}</span>
                    <span>{doc.updated}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================= ENTITY DETAIL MODAL ================================= */}
      {selectedEntity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedEntity(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  {getEntityTypeIcon(selectedEntity.type)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {selectedEntity.name}
                  </h3>
                  <Badge variant={getEntityTypeBadgeVariant(selectedEntity.type)} size="sm">
                    {selectedEntity.type}
                  </Badge>
                </div>
              </div>

              <button
                onClick={() => setSelectedEntity(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Aliases */}
              {Array.isArray(selectedEntity.aliases) && selectedEntity.aliases.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                    Aliases / Alternate Names
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntity.aliases.map(alias => (
                      <span
                        key={alias}
                        className="px-2 py-0.5 rounded-md text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Known Relationships */}
              <div>
                <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                  Known Relationships
                </h4>
                {(() => {
                  const connected = relationships.filter(
                    r => r.sourceEntityId === selectedEntity.entityId || r.targetEntityId === selectedEntity.entityId
                  );

                  if (connected.length === 0) {
                    return (
                      <p className="text-xs text-neutral-400 italic">No explicit relationships recorded for this entity.</p>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {connected.map(rel => {
                        const sName = entityNameMap.get(rel.sourceEntityId) || rel.sourceEntityId;
                        const tName = entityNameMap.get(rel.targetEntityId) || rel.targetEntityId;
                        const rName = rel.relation.replace(/_/g, ' ');

                        return (
                          <div
                            key={rel.relationshipId}
                            className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/70 rounded-xl space-y-2"
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              <span className="text-neutral-900 dark:text-neutral-100">{sName}</span>
                              <span className="px-1.5 py-0.5 bg-neutral-200/70 dark:bg-neutral-700 rounded text-[11px] font-mono text-neutral-700 dark:text-neutral-300">
                                {rName}
                              </span>
                              <span className="text-neutral-900 dark:text-neutral-100">{tName}</span>
                            </div>

                            {/* Supporting memories for this relationship */}
                            {rel.sourceMemoryIds && rel.sourceMemoryIds.length > 0 && (
                              <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                                  Supporting Memories:
                                </span>
                                {rel.sourceMemoryIds.map(mid => {
                                  const mem = getMemoryById(mid);
                                  return (
                                    <div
                                      key={mid}
                                      onClick={() => {
                                        setSelectedEntity(null);
                                        setActiveTab('memories');
                                      }}
                                      className="text-xs text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-900 p-2 rounded-lg border border-neutral-200/60 dark:border-neutral-800 flex items-start justify-between gap-2 hover:border-indigo-400 cursor-pointer transition-colors"
                                    >
                                      <p className="line-clamp-2 leading-relaxed">
                                        "{mem ? mem.content : 'Memory record ' + mid}"
                                      </p>
                                      <ExternalLink className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEntity(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================= RELATIONSHIP DETAIL MODAL ================================= */}
      {selectedRelationship && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedRelationship(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/40">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Relationship Details
                </h3>
              </div>

              <button
                onClick={() => setSelectedRelationship(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Directional Connection Banner */}
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/70 rounded-xl flex items-center justify-center gap-3 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                <span className="px-2.5 py-1 bg-white dark:bg-neutral-900 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  {entityNameMap.get(selectedRelationship.sourceEntityId) || selectedRelationship.sourceEntityId}
                </span>
                <ArrowRight className="w-4 h-4 text-indigo-500" />
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded font-mono text-xs lowercase">
                  {selectedRelationship.relation.replace(/_/g, ' ')}
                </span>
                <ArrowRight className="w-4 h-4 text-indigo-500" />
                <span className="px-2.5 py-1 bg-white dark:bg-neutral-900 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  {entityNameMap.get(selectedRelationship.targetEntityId) || selectedRelationship.targetEntityId}
                </span>
              </div>

              {/* Supporting Memories (Provenance) */}
              <div>
                <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-indigo-500" />
                  Supporting Memories (A8 Provenance)
                </h4>

                {(!selectedRelationship.sourceMemoryIds || selectedRelationship.sourceMemoryIds.length === 0) ? (
                  <p className="text-xs text-neutral-400 italic">No supporting memories recorded for this relationship.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedRelationship.sourceMemoryIds.map(mid => {
                      const mem = getMemoryById(mid);
                      return (
                        <div
                          key={mid}
                          className="p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/70 rounded-xl space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px] text-neutral-400">
                            <span className="font-mono">Memory ID: {mid}</span>
                            {mem && <span>{mem.date}</span>}
                          </div>

                          <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-serif italic">
                            "{mem ? mem.content : 'Memory record in database'}"
                          </p>

                          <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex justify-end">
                            <button
                              onClick={() => {
                                setSelectedRelationship(null);
                                setActiveTab('memories');
                              }}
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>View in Memories Vault</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRelationship(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
