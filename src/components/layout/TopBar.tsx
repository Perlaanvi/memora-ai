import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import {
  Search,
  Moon,
  Sun,
  Bell,
  Menu,
  Sparkles,
  Command,
  CheckCircle2,
  Brain,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    activeTab,
    theme,
    setTheme,
    setIsMobileMenuOpen,
    setIsSearchOpen,
    setActiveTab,
    userProfile,
    activities,
    handleSignOut
  } = useApp();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const pageTitles: Record<string, { title: string; subtitle?: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Personal memory overview & insights' },
    chat: { title: 'AI Assistant', subtitle: 'Ask questions about your personal life memories' },
    knowledge: { title: 'Knowledge Vault', subtitle: 'Personal documents, notes, and records' },
    memories: { title: 'Memories', subtitle: 'Personal events, conversations, and reflections' },
    goals: { title: 'Goals', subtitle: 'Personal goals and milestone tracking' },
    projects: { title: 'Projects', subtitle: 'Personal projects and life initiatives' },
    ideas: { title: 'Ideas', subtitle: 'Captured thoughts and creative sparks' },
    learnings: { title: 'Learnings', subtitle: 'Personal takeaways and lessons learned' },
    settings: { title: 'Settings', subtitle: 'Preferences and system configuration' }
  };

  const currentTitle = pageTitles[activeTab] || { title: 'MEMORA' };

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <header className="h-14 shrink-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200/90 dark:border-neutral-800 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-50 tracking-tight truncate">
            {currentTitle.title}
          </h1>
          {currentTitle.subtitle && (
            <p className="hidden md:block text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {currentTitle.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center: Global Search Bar Trigger */}
      <div className="flex-1 max-w-md hidden sm:block">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100/90 dark:bg-neutral-800/80 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/70 border border-neutral-200/60 dark:border-neutral-700/60 rounded-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
            <span className="truncate">Search your knowledge, memories, projects...</span>
          </div>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-500 dark:text-neutral-400">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Right Controls: Search Icon for Mobile, Theme Toggle, Notifications, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Mobile Search Button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="sm:hidden p-2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            className="p-2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-neutral-900" />
          </button>

          {isNotificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsNotificationsOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-30 p-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Activity Stream
                  </h4>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                    {activities.length} updates
                  </span>
                </div>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 max-h-72 overflow-y-auto mt-2">
                  {activities.slice(0, 5).map(act => (
                    <div
                      key={act.id}
                      onClick={() => {
                        if (act.targetTab) setActiveTab(act.targetTab);
                        setIsNotificationsOpen(false);
                      }}
                      className="py-2.5 px-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg cursor-pointer transition-colors"
                    >
                      <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        {act.title}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                        {act.description}
                      </p>
                      <span className="text-[10px] text-neutral-400 mt-1 inline-block">
                        {act.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 my-auto" />

        {/* User Profile Area */}
        <div className="relative">
          <button
            id="topbar-profile-trigger"
            type="button"
            onClick={() => setIsProfileMenuOpen(prev => !prev)}
            className="flex items-center gap-2 pl-1 sm:pl-2 py-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/80 cursor-pointer transition-colors"
            title="Account & Profile"
          >
            <Avatar
              src={userProfile.avatarUrl}
              name={userProfile.name}
              size="sm"
              showStatus
              status="online"
            />
            <div className="hidden md:flex flex-col text-left leading-none">
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {userProfile.name}
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {userProfile.role || 'Knowledge Architect'}
              </span>
            </div>
          </button>

          {isProfileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsProfileMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-30 p-3.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {userProfile.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5 font-mono">
                    {userProfile.email}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Isolated Vault Active</span>
                  </div>
                </div>

                <div className="pt-2 space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Settings & Preferences</span>
                  </button>

                  <button
                    id="topbar-signout-btn"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
