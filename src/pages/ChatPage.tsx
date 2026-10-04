import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import {
  Send,
  Paperclip,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  FileText,
  Copy,
  Check,
  Search,
  Plus,
  X,
  BookOpen,
  MessageSquare,
  Layers,
  Cpu,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
  Trash2,
  Database,
  Brain,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Clock
} from 'lucide-react';
import { ChatMessage, DocumentItem, MemoryItem, SourceCitation } from '../types';
import { api } from '../services/api';
import { MemoryCandidateCard } from '../components/chat/MemoryCandidateCard';
import { MemorySourceEvidenceModal } from '../components/chat/MemorySourceEvidenceModal';

export const ChatPage: React.FC = () => {
  const {
    chatThreads,
    activeThreadId,
    setActiveThreadId,
    createChatThread,
    deleteChatThread,
    chatMessages,
    memoryCandidates,
    saveMemoryCandidate,
    dismissMemoryCandidate,
    updateMemoryCandidateText,
    sendChatMessage,
    clearChat,
    isAiTyping,
    isLoading,
    setActiveTab,
    setViewingDocument,
    documents,
    memories,
    goals,
    projects,
    ideas,
    addToast
  } = useApp();

  const [historySearch, setHistorySearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [showMobileSources, setShowMobileSources] = useState(false);
  const [showRightSources, setShowRightSources] = useState(true);

  // A8 Source Attribution Evidence state
  const [inspectingSource, setInspectingSource] = useState<{
    source: SourceCitation;
    memory: MemoryItem | null;
    isDeleted?: boolean;
    isLoading?: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isAiTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    const textToSend = inputText.trim() || (attachedFile ? `Review attached document: ${attachedFile}` : '');
    const currentAttachment = attachedFile || undefined;

    setInputText('');
    setAttachedFile(null);
    await sendChatMessage(textToSend, currentAttachment);
  };

  const handlePromptClick = (prompt: string) => {
    setInputText(prompt);
  };

  const handleAttachMock = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0].name);
      addToast({
        type: 'info',
        title: 'Document Attached',
        description: `"${e.target.files[0].name}" attached to question context.`
      });
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast({
      type: 'info',
      title: 'Copied',
      description: 'Assistant response copied to clipboard.'
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openSourceDoc = (sourceTitle: string) => {
    const doc = documents.find(d =>
      d.title.toLowerCase().includes(sourceTitle.toLowerCase()) ||
      sourceTitle.toLowerCase().includes(d.title.toLowerCase())
    );
    if (doc) {
      setViewingDocument(doc);
    } else {
      // Fallback: pick matching doc or default
      const defaultDoc = documents[0];
      if (defaultDoc) setViewingDocument(defaultDoc);
    }
  };

  const handleInspectSource = async (src: SourceCitation) => {
    // If it's a document source without a memoryId, open the document viewer
    if (!src.memoryId && (src.type === 'Doc' || src.type === 'PDF' || src.type === 'Markdown' || src.type === 'Web')) {
      openSourceDoc(src.title);
      return;
    }

    if (src.memoryId) {
      // 1. Check client-side vault first
      const localMem = memories.find(m => m.id === src.memoryId);
      if (localMem) {
        setInspectingSource({
          source: src,
          memory: localMem,
          isDeleted: false,
          isLoading: false
        });
        return;
      }

      // 2. If not found in client vault, query protected server endpoint to verify
      setInspectingSource({
        source: src,
        memory: null,
        isDeleted: false,
        isLoading: true
      });

      try {
        const remote = await api.getMemorySource(src.memoryId);
        if (remote) {
          setInspectingSource({
            source: src,
            memory: remote,
            isDeleted: false,
            isLoading: false
          });
        } else {
          // 404 indicates memory was deleted by user
          setInspectingSource({
            source: src,
            memory: null,
            isDeleted: true,
            isLoading: false
          });
        }
      } catch (err) {
        setInspectingSource({
          source: src,
          memory: null,
          isDeleted: true,
          isLoading: false
        });
      }
    } else {
      openSourceDoc(src.title);
    }
  };

  const activeThreadCandidates = memoryCandidates.filter(
    c => (c.threadId === activeThreadId || !c.threadId) && c.status !== 'dismissed'
  );

  const getCandidatesForAssistantMessage = (assistantMsgIndex: number) => {
    const assistantMsg = chatMessages[assistantMsgIndex];
    const prevMsg = assistantMsgIndex > 0 ? chatMessages[assistantMsgIndex - 1] : null;
    const isLastAssistant = assistantMsgIndex === chatMessages.length - 1;

    return activeThreadCandidates.filter(c => {
      if (prevMsg && c.sourceMessageId === prevMsg.id) return true;
      if (c.sourceMessageId === assistantMsg.id) return true;
      if (isLastAssistant && !c.sourceMessageId) return true;
      return false;
    });
  };

  const handleNewChat = async () => {
    try {
      await createChatThread('New Conversation');
      setShowMobileHistory(false);
      addToast({
        type: 'info',
        title: 'New Chat Created',
        description: 'New persistent conversation ready in your second brain.'
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Chat Creation Error',
        description: err?.message || 'Could not start new chat.'
      });
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteChatThread(id);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Error',
        description: err?.message || 'Could not delete conversation.'
      });
    }
  };

  // Filter conversations in left panel
  const filteredThreads = chatThreads.filter(t =>
    t.title.toLowerCase().includes(historySearch.toLowerCase()) ||
    (t.snippet && t.snippet.toLowerCase().includes(historySearch.toLowerCase()))
  );

  const activeThread = chatThreads.find(t => t.id === activeThreadId);

  // Active sources identified from last assistant message
  const latestAssistantMessage = [...chatMessages].reverse().find(m => m.role === 'assistant');
  const activeSources = latestAssistantMessage?.sources || [];

  const suggestedQuestions = [
    'What did I record this week?',
    'Summarize my active goals & progress',
    'What were the key takeaways from my recent memories?',
    'Show me my high-priority ideas and sparks'
  ];

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[550px] flex flex-col -mx-4 sm:-mx-6 -my-4 sm:-my-6 bg-neutral-50/50 dark:bg-neutral-950/40">
      {/* 3-Column Layout Container */}
      <div className="flex-1 flex overflow-hidden border-t border-neutral-200/80 dark:border-neutral-800">
        
        {/* ================= LEFT: Conversation History ================= */}
        <aside
          className={`
            w-64 sm:w-72 shrink-0 bg-white dark:bg-neutral-900 border-r border-neutral-200/90 dark:border-neutral-800 flex flex-col transition-all duration-200 z-20
            ${showMobileHistory ? 'fixed inset-y-0 left-0 pt-16 sm:pt-0 shadow-2xl flex' : 'hidden md:flex'}
          `}
        >
          {/* History Header & New Chat Button */}
          <div className="p-3.5 border-b border-neutral-200/90 dark:border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                History
              </span>
              {showMobileHistory && (
                <button
                  onClick={() => setShowMobileHistory(false)}
                  className="md:hidden p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleNewChat}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="w-full justify-center text-xs py-2 shadow-2xs"
            >
              New Chat
            </Button>

            {/* Search Conversations */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700/70 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-neutral-100 dark:divide-neutral-800/40">
            {filteredThreads.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-400">
                {historySearch ? 'No matching conversations' : 'No conversation history yet. Start a new chat above!'}
              </div>
            ) : (
              filteredThreads.map(thread => (
                <div
                  key={thread.id}
                  onClick={() => {
                    setActiveThreadId(thread.id);
                    setShowMobileHistory(false);
                  }}
                  className={`group relative p-2.5 rounded-xl cursor-pointer transition-all ${
                    activeThreadId === thread.id
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-neutral-900 dark:text-neutral-100'
                      : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <h4 className="text-xs font-semibold truncate leading-tight flex-1">
                      {thread.title}
                    </h4>
                    <span className="text-[10px] text-neutral-400 shrink-0">
                      {thread.updated_at ? thread.updated_at.slice(5, 10) : 'Active'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-1">
                    {thread.snippet || 'No messages yet'}
                  </p>

                  {/* Delete conversation icon on hover */}
                  <button
                    onClick={e => handleDeleteConversation(thread.id, e)}
                    className="absolute right-2 top-2 p-1 text-neutral-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Left Footer: Knowledge Base Stats Indicator */}
          <div className="p-3 border-t border-neutral-200/90 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-[11px] text-neutral-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>{documents.length + memories.length} Vault Items</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Second Brain Synced</span>
          </div>
        </aside>

        {/* ================= MAIN: Chat Conversation ================= */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-900 overflow-hidden">
          
          {/* Main Sub-Header */}
          <div className="h-12 shrink-0 px-4 border-b border-neutral-200/90 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile History Toggle */}
              <button
                onClick={() => setShowMobileHistory(true)}
                className="md:hidden p-1.5 -ml-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                title="Open conversation history"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-50 truncate">
                {activeThread?.title || 'Personal Second Brain Chat'}
              </h3>
              <Badge variant="primary" size="sm" className="hidden sm:inline-flex text-[10px] py-0 px-2">
                Second Brain
              </Badge>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearChat(activeThreadId || undefined)}
                icon={<RotateCcw className="w-3 h-3" />}
                className="text-xs py-1 px-2.5"
                title="Reset conversation messages"
              >
                Reset
              </Button>

              {/* Right Context Panel Toggle */}
              <button
                onClick={() => {
                  setShowRightSources(!showRightSources);
                  setShowMobileSources(!showMobileSources);
                }}
                className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showRightSources
                    ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
                title="Toggle Context/Sources panel"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline text-[11px]">Sources</span>
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-md mx-auto space-y-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Ask MEMORA
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                    Pose questions against your personal life memories, events, goals, and thoughts. Try one of the suggested prompts below:
                  </p>
                </div>

                {/* Initial suggested questions */}
                <div className="grid grid-cols-1 gap-2 w-full pt-2">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptClick(q)}
                      className="p-2.5 text-left text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-neutral-200/70 dark:border-neutral-700/70 hover:border-indigo-300 dark:hover:border-indigo-700 text-neutral-700 dark:text-neutral-300 transition-all flex items-center justify-between group"
                    >
                      <span className="truncate">{q}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Assistant Avatar */}
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  {/* Bubble Container */}
                  <div
                    className={`max-w-2xl flex flex-col space-y-1.5 ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* User Bubble */}
                    {msg.role === 'user' ? (
                      <div className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-xl rounded-tr-xs px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs">
                        {msg.attachmentName && (
                          <div className="mb-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/20 dark:bg-neutral-900/10 text-[10px] font-medium">
                            <Paperclip className="w-3 h-3" />
                            <span className="truncate max-w-[180px]">{msg.attachmentName}</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 text-right font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                    ) : (
                      /* Assistant Bubble */
                      <>
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl rounded-tl-xs p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 shadow-2xs space-y-3 w-full">
                          {/* Grounded Retrieval Indicator */}
                          {((msg.grounded) || (msg.sources && msg.sources.length > 0) || (msg.ragSources && msg.ragSources.length > 0) || (msg.retrievalContext?.memories && msg.retrievalContext.memories.length > 0)) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium w-fit">
                                <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>
                                  {msg.sources && msg.sources.length > 0
                                    ? `Based on ${msg.sources.length} ${msg.sources.length === 1 ? 'memory' : 'memories'}`
                                    : msg.retrievalContext?.memories?.length
                                    ? `Based on ${msg.retrievalContext.memories.length} ${msg.retrievalContext.memories.length === 1 ? 'memory' : 'memories'}`
                                    : 'Grounded in Personal Second Brain'}
                                </span>
                              </div>
                              {msg.temporalScope?.isTemporalQuery && (
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 text-[11px] text-amber-700 dark:text-amber-300 font-medium w-fit">
                                  <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  <span>{msg.temporalScope.description || 'Timeline Grounded'}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>

                          {/* Source Cards in Assistant Bubble */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                              <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                                  <Sparkles className="w-3 h-3 text-indigo-500" />
                                  <span>Supporting Evidence ({msg.sources.length})</span>
                                </div>
                                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Click source to inspect</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {msg.sources.map((src, idx) => {
                                  const linkedMemory = src.memoryId ? memories.find(m => m.id === src.memoryId) : null;
                                  const isDeleted = src.memoryId ? (!linkedMemory && !isLoading) : false;
                                  const isEdited = Boolean(linkedMemory && src.snippet && linkedMemory.content.trim() !== src.snippet.trim());

                                  if (isDeleted) {
                                    return (
                                      <div
                                        key={idx}
                                        onClick={() => handleInspectSource(src)}
                                        className="p-2.5 rounded-lg bg-neutral-100/70 dark:bg-neutral-800/40 border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-pointer hover:border-neutral-400 transition-colors"
                                      >
                                        <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-neutral-500">
                                          <span className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                                            {src.sourceId || `[M${idx + 1}]`}
                                          </span>
                                          <span>This memory is no longer available.</span>
                                        </div>
                                        <p className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-1 italic">
                                          Deleted from Second Brain. Stale content hidden.
                                        </p>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => handleInspectSource(src)}
                                      className="group p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/70 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/20 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold">
                                            {src.sourceId || `[M${idx + 1}]`}
                                          </span>
                                          <span className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                            {src.category || 'Personal'} Memory
                                          </span>
                                        </div>
                                        {isEdited && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 font-medium">
                                            Current Memory
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-neutral-600 dark:text-neutral-300 mt-1.5 line-clamp-2 leading-relaxed">
                                        "{isEdited && linkedMemory ? linkedMemory.content : src.snippet}"
                                      </p>
                                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-100 dark:border-neutral-700/50 text-[9px] text-neutral-400">
                                        <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                                          <Calendar className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                          <span className="truncate">{src.displayDate || src.date || linkedMemory?.date || 'Recorded'}</span>
                                          {src.formattedPrecision && src.formattedPrecision !== 'unknown' && (
                                            <span className="text-[8px] px-1 py-0.2 rounded bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 shrink-0">
                                              {src.formattedPrecision}
                                            </span>
                                          )}
                                        </span>
                                        <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-0.5 group-hover:underline shrink-0">
                                          Inspect <ExternalLink className="w-2.5 h-2.5" />
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Footer / Copy button */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100 dark:border-neutral-800/80 text-[10px] text-neutral-400">
                            <span className="font-mono">{msg.timestamp}</span>
                            <button
                              onClick={() => copyMessage(msg.id, msg.content)}
                              className="inline-flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy response</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Memory Candidate Suggestions for this assistant turn */}
                        {getCandidatesForAssistantMessage(index).map(candidate => (
                          <div key={candidate.id} className="w-full">
                            <MemoryCandidateCard
                              candidate={candidate}
                              onSave={saveMemoryCandidate}
                              onDismiss={dismissMemoryCandidate}
                              onUpdateText={updateMemoryCandidateText}
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* User Avatar */}
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Unmatched candidates for this thread */}
            {activeThreadCandidates
              .filter(c => !chatMessages.some((_, idx) => getCandidatesForAssistantMessage(idx).some(m => m.id === c.id)))
              .map(candidate => (
                <div key={candidate.id} className="max-w-2xl ml-10">
                  <MemoryCandidateCard
                    candidate={candidate}
                    onSave={saveMemoryCandidate}
                    onDismiss={dismissMemoryCandidate}
                    onUpdateText={updateMemoryCandidateText}
                  />
                </div>
              ))}

            {/* AI Typing indicator */}
            {isAiTyping && (
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl rounded-tl-xs px-3.5 py-2.5 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-xs text-neutral-400 ml-2 font-medium">
                      Retrieving context from Second Brain...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions Pills above input */}
          <div className="px-4 py-2 border-t border-neutral-200/70 dark:border-neutral-800/70 bg-neutral-50/40 dark:bg-neutral-900/40 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
            <span className="text-[10px] font-semibold uppercase text-neutral-400 shrink-0">Suggested:</span>
            {suggestedQuestions.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptClick(prompt)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <div className="p-3 sm:p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200/90 dark:border-neutral-800 shrink-0">
            <form
              onSubmit={handleSend}
              className="bg-neutral-50/70 dark:bg-neutral-800/50 border border-neutral-200/90 dark:border-neutral-700/90 rounded-xl p-2 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-2xs"
            >
              {attachedFile && (
                <div className="mb-2 flex items-center justify-between px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/70 text-xs text-indigo-700 dark:text-indigo-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <Paperclip className="w-3 h-3 shrink-0" />
                    <span className="truncate font-medium">{attachedFile}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-0.5 hover:text-indigo-900 dark:hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleAttachMock}
                  accept=".pdf,.doc,.docx,.txt,.md"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Attach document to context"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask MEMORA about your personal memories, events, goals, or ideas..."
                  rows={1}
                  className="w-full text-xs sm:text-sm bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none py-1.5 resize-none max-h-24"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={(!inputText.trim() && !attachedFile) || isAiTyping}
                  icon={<Send className="w-3.5 h-3.5" />}
                  className="rounded-lg px-3 py-1.5 shrink-0"
                >
                  <span className="hidden sm:inline text-xs">Send</span>
                </Button>
              </div>
            </form>
          </div>
        </main>

        {/* ================= RIGHT: Context / Sources Panel ================= */}
        {showRightSources && (
          <aside
            className={`
              w-64 sm:w-72 lg:w-80 shrink-0 bg-white dark:bg-neutral-900 border-l border-neutral-200/90 dark:border-neutral-800 flex flex-col transition-all duration-200 z-20
              ${showMobileSources ? 'fixed inset-y-0 right-0 pt-16 sm:pt-0 shadow-2xl flex' : 'hidden lg:flex'}
            `}
          >
            {/* Header */}
            <div className="p-3.5 border-b border-neutral-200/90 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Context & Sources
                </h4>
              </div>

              <div className="flex items-center gap-1">
                <Badge variant="primary" size="sm" className="text-[10px] py-0">
                  {activeSources.length} Active
                </Badge>
                <button
                  onClick={() => {
                    setShowRightSources(false);
                    setShowMobileSources(false);
                  }}
                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  title="Collapse sources panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Sources List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2">
                  Knowledge and memory references grounded in the current conversation:
                </p>

                {activeSources.length > 0 ? (
                  <div className="space-y-2">
                    {activeSources.map((src, idx) => {
                      const linkedMemory = src.memoryId ? memories.find(m => m.id === src.memoryId) : null;
                      const isDeleted = src.memoryId ? (!linkedMemory && !isLoading) : false;
                      const isEdited = Boolean(linkedMemory && src.snippet && linkedMemory.content.trim() !== src.snippet.trim());

                      if (isDeleted) {
                        return (
                          <div
                            key={idx}
                            onClick={() => handleInspectSource(src)}
                            className="p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/40 border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-pointer hover:border-neutral-400 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-neutral-500">
                              <span className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                                {src.sourceId || `[M${idx + 1}]`}
                              </span>
                              <span>This memory is no longer available.</span>
                            </div>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 italic">
                              Deleted from Second Brain. Stale content hidden.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          onClick={() => handleInspectSource(src)}
                          className="group p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/70 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-pointer shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold">
                                {src.sourceId || `[M${idx + 1}]`}
                              </span>
                              <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                {src.title}
                              </h5>
                            </div>
                            <Badge variant="neutral" size="sm" className="text-[10px] py-0 px-1.5 shrink-0">
                              {src.type}
                            </Badge>
                          </div>

                          {isEdited && (
                            <div className="mt-1">
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 font-medium">
                                Current Memory
                              </span>
                            </div>
                          )}

                          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1.5 line-clamp-3 leading-relaxed">
                            "{isEdited && linkedMemory ? linkedMemory.content : src.snippet}"
                          </p>

                          <div className="mt-2 pt-2 border-t border-neutral-200/50 dark:border-neutral-700/50 flex items-center justify-between text-[10px] text-neutral-400">
                            <span className="inline-flex items-center gap-1 truncate max-w-[170px]">
                              <Calendar className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                              <span className="truncate">{src.displayDate || src.date || linkedMemory?.date || 'Recorded'}</span>
                              {src.formattedPrecision && src.formattedPrecision !== 'unknown' && (
                                <span className="text-[8px] px-1 py-0.2 rounded bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 shrink-0">
                                  {src.formattedPrecision}
                                </span>
                              )}
                            </span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 group-hover:underline shrink-0">
                              Inspect <ExternalLink className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 text-center">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      No source documents referenced yet. When MEMORA retrieves from your personal records, grounded items will display here.
                    </p>
                  </div>
                )}
              </div>

              {/* Memory Suggestions Section */}
              {activeThreadCandidates.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Memory Candidates</span>
                    </div>
                    <Badge variant="amber" size="sm" className="text-[10px] py-0 px-1.5">
                      {activeThreadCandidates.filter(c => c.status === 'pending').length} Pending
                    </Badge>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    AI detected personal facts. Click Save or Edit to keep them permanently in your Second Brain.
                  </p>
                </div>
              )}

              {/* MEMORA Second Brain Card */}
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    MEMORA Personal Vault
                  </h5>
                </div>
                <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300 leading-relaxed">
                  Your questions are answered using your saved life memories, goals, ideas, and documents.
                </p>
              </div>
            </div>

            {/* Right Footer */}
            <div className="p-3 border-t border-neutral-200/90 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-[10px] text-neutral-400 flex items-center justify-between">
              <span>Personal Vault</span>
              <span className="font-mono">Grounded</span>
            </div>
          </aside>
        )}

      </div>

      {/* A8 Memory Source Evidence Modal */}
      <MemorySourceEvidenceModal
        isOpen={Boolean(inspectingSource)}
        onClose={() => setInspectingSource(null)}
        source={inspectingSource?.source || null}
        memory={inspectingSource?.memory || null}
        isDeleted={inspectingSource?.isDeleted}
        isLoading={inspectingSource?.isLoading}
        onNavigateToVault={() => setActiveTab('memories')}
      />
    </div>
  );
};
