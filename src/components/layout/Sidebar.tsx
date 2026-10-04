import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Brain,
  History,
  Target,
  FolderKanban,
  Lightbulb,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  LogOut
} from 'lucide-react';

interface NavItem {
  tab: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    toggleSidebar,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    setIsUploadDocOpen,
    documents,
    memories,
    goals,
    ideas,
    projects,
    learnings,
    handleSignOut,
    setIsAddMemoryOpen
  } = useApp();

  const navItems: NavItem[] = [
    { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { tab: 'chat', label: 'AI Chat', icon: Sparkles },
    { tab: 'memories', label: 'Memories', icon: Brain, badge: memories.length > 0 ? memories.length : undefined },
    { tab: 'timeline', label: 'Timeline', icon: History },
    { tab: 'goals', label: 'Goals', icon: Target, badge: goals.length > 0 ? goals.length : undefined },
    { tab: 'ideas', label: 'Ideas', icon: Lightbulb, badge: ideas.length > 0 ? ideas.length : undefined },
    { tab: 'projects', label: 'Projects', icon: FolderKanban, badge: projects.length > 0 ? projects.length : undefined },
    { tab: 'knowledge', label: 'Knowledge', icon: BookOpen, badge: documents.length > 0 ? documents.length : undefined },
    { tab: 'learnings', label: 'Learnings', icon: GraduationCap, badge: learnings.length > 0 ? learnings.length : undefined }
  ];

  const handleNavClick = (tab: NavigationTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-r border-neutral-200/90 dark:border-neutral-800 transition-all duration-300">
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-100 dark:border-neutral-800/80">
        <div
          onClick={() => handleNavClick('dashboard')}
          className={`flex items-center gap-3 cursor-pointer overflow-hidden transition-all ${
            isSidebarCollapsed ? 'justify-center w-full' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 shrink-0 font-bold text-sm shadow-xs">
            <Brain className="w-4 h-4" />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex flex-col">
              <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
                MEMORA
              </span>
              <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Personal Second Brain
              </span>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Record Memory Action (if not collapsed) */}
      {!isSidebarCollapsed && (
        <div className="px-3 pt-4 pb-2">
          <button
            onClick={() => setIsAddMemoryOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Memory</span>
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;

          return (
            <button
              key={item.tab}
              onClick={() => handleNavClick(item.tab)}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 hover:text-neutral-900 dark:hover:text-neutral-200'
              } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-current' : 'text-neutral-500 dark:text-neutral-400'}`} />
              {!isSidebarCollapsed && (
                <>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-white/20 text-white dark:bg-neutral-900/20 dark:text-neutral-900'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Section: Settings & Collapse Toggle */}
      <div className="p-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1">
        <button
          onClick={() => handleNavClick('settings')}
          title={isSidebarCollapsed ? 'Settings' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 hover:text-neutral-900 dark:hover:text-neutral-200'
          } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!isSidebarCollapsed && <span className="truncate">Settings</span>}
        </button>

        <button
          id="sidebar-signout-btn"
          onClick={handleSignOut}
          title={isSidebarCollapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 ${
            isSidebarCollapsed ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isSidebarCollapsed && <span className="truncate">Sign Out</span>}
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex w-full items-center justify-center py-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-xs"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Collapse sidebar</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block h-screen sticky top-0 shrink-0 z-30 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-18' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-68 max-w-[80vw] h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
