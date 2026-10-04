import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { MainLayout } from './components/layout/MainLayout';
import { AuthScreen } from './components/auth/AuthScreen';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div id="auth-loading-state" className="min-h-screen w-full flex flex-col items-center justify-center bg-neutral-950 text-neutral-200">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-xs font-mono text-neutral-400">Authenticating Second Brain vault...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
