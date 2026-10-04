import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from '../common/ToastContainer';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';

// Pages
import { DashboardPage } from '../../pages/DashboardPage';
import { ChatPage } from '../../pages/ChatPage';
import { KnowledgePage } from '../../pages/KnowledgePage';
import { MemoriesPage } from '../../pages/MemoriesPage';
import { GoalsPage } from '../../pages/GoalsPage';
import { ProjectsPage } from '../../pages/ProjectsPage';
import { IdeasPage } from '../../pages/IdeasPage';
import { LearningsPage } from '../../pages/LearningsPage';
import { SettingsPage } from '../../pages/SettingsPage';
import { TimelinePage } from '../../pages/TimelinePage';

// Global Modals
import { GlobalSearchModal } from '../search/GlobalSearchModal';
import { UploadDocumentModal } from '../modals/UploadDocumentModal';
import { AddMemoryModal } from '../modals/AddMemoryModal';
import { CreateGoalModal } from '../modals/CreateGoalModal';
import { CreateProjectModal } from '../modals/CreateProjectModal';
import { CaptureIdeaModal } from '../modals/CaptureIdeaModal';
import { DocumentDetailModal } from '../modals/DocumentDetailModal';

export const MainLayout: React.FC = () => {
  const { activeTab, dataError, refreshData, reloadData } = useApp();
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (typeof refreshData === 'function') {
        await refreshData();
      } else if (typeof reloadData === 'function') {
        await reloadData();
      }
    } catch (err) {
      console.error('Failed to retry connection:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'chat':
        return <ChatPage />;
      case 'knowledge':
        return <KnowledgePage />;
      case 'memories':
        return <MemoriesPage />;
      case 'timeline':
        return <TimelinePage />;
      case 'goals':
        return <GoalsPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'ideas':
        return <IdeasPage />;
      case 'learnings':
        return <LearningsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex transition-colors duration-150">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200">
        {/* Top Header */}
        <TopBar />

        {/* Dynamic Page Container */}
        <main className="flex-1 px-4 sm:px-6 py-4 sm:py-5 w-full min-w-0 overflow-x-hidden">
          {dataError && (
            <div className="mb-4 p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{dataError}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors font-medium cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Connecting...' : 'Retry Connection'}
                </button>
                <a
                  href="https://console.firebase.google.com/project/memora-ai-6ebfd/firestore/rules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors font-medium inline-flex items-center gap-1.5"
                >
                  Publish Rules in Console <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
          {renderActivePage()}
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <GlobalSearchModal />
      <UploadDocumentModal />
      <AddMemoryModal />
      <CreateGoalModal />
      <CreateProjectModal />
      <CaptureIdeaModal />
      <DocumentDetailModal />
      <ToastContainer />
    </div>
  );
};
