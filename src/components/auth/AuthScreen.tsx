import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Brain,
  Lock,
  Mail,
  User,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Globe
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithGoogleRedirect,
    authError,
    authErrorInfo,
    clearAuthError
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (isSignUp && !name.trim()) {
      setLocalError('Please enter your name.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name.trim());
      } else {
        await signInWithEmail(email, password);
      }
    } catch {
      // Error is set in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearAuthError();
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      // Handled and displayed via AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRedirectSignIn = async () => {
    setLocalError(null);
    clearAuthError();
    setIsRedirecting(true);
    try {
      await signInWithGoogleRedirect();
    } catch {
      // Handled and displayed via AuthContext
    } finally {
      setIsRedirecting(false);
    }
  };

  const copyErrorDetails = () => {
    const errorText = JSON.stringify(
      {
        code: authErrorInfo?.code || 'unknown',
        message: authErrorInfo?.message || authError || localError,
        details: authErrorInfo?.details || '',
        action: authErrorInfo?.action || '',
        currentOrigin: window.location.origin
      },
      null,
      2
    );
    navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const activeError = localError || authError;
  const isPopupIssue =
    authErrorInfo?.code === 'auth/popup-closed-by-user' ||
    authErrorInfo?.code === 'auth/popup-blocked' ||
    authErrorInfo?.code === 'auth/unauthorized-domain';

  return (
    <div id="auth-screen-container" className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-950 text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 mb-4 shadow-lg shadow-amber-500/10">
            <Brain className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            MEMORA
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              Second Brain
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">
            Your private personal intelligence & memory repository with strict user isolation.
          </p>
        </div>

        {/* Card */}
        <div id="auth-card" className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 pb-3 mb-6">
            <button
              id="auth-tab-signin"
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setLocalError(null);
                clearAuthError();
              }}
              className={`flex-1 text-center py-2 text-sm font-semibold transition-colors relative ${
                !isSignUp ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
              {!isSignUp && (
                <div className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
              )}
            </button>
            <button
              id="auth-tab-signup"
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setLocalError(null);
                clearAuthError();
              }}
              className={`flex-1 text-center py-2 text-sm font-semibold transition-colors relative ${
                isSignUp ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
              {isSignUp && (
                <div className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
              )}
            </button>
          </div>

          {/* Error / Notice Alert */}
          {activeError && (
            <div
              id="auth-error-alert"
              className={`mb-5 p-3.5 rounded-xl border text-xs space-y-2 ${
                authErrorInfo?.code === 'auth/popup-closed-by-user' || authErrorInfo?.code === 'auth/cancelled-popup-request'
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-200'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      authErrorInfo?.code === 'auth/popup-closed-by-user' || authErrorInfo?.code === 'auth/cancelled-popup-request'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  />
                  <div
                    className={`font-medium ${
                      authErrorInfo?.code === 'auth/popup-closed-by-user' || authErrorInfo?.code === 'auth/cancelled-popup-request'
                        ? 'text-amber-100'
                        : 'text-rose-200'
                    }`}
                  >
                    {authErrorInfo?.userMessage || activeError}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    clearAuthError();
                  }}
                  className="text-slate-400 hover:text-slate-200 text-xs px-1 py-0.5 transition-colors"
                  title="Dismiss message"
                >
                  ✕
                </button>
              </div>

              {authErrorInfo?.code && authErrorInfo.code !== 'auth/popup-closed-by-user' && authErrorInfo.code !== 'auth/cancelled-popup-request' && (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] uppercase tracking-wider text-rose-400/70 font-semibold">Error Code:</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/80 text-rose-300 font-semibold select-all">
                    {authErrorInfo.code}
                  </span>
                </div>
              )}

              {authErrorInfo?.details && (
                <p className="text-[11px] text-slate-300 leading-relaxed pt-0.5">
                  {authErrorInfo.details}
                </p>
              )}

              {authErrorInfo?.action && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] leading-relaxed">
                  <div className="font-semibold text-amber-300 mb-0.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Recommended action:
                  </div>
                  <div>{authErrorInfo.action}</div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-700/40 text-[11px]">
                <button
                  type="button"
                  onClick={copyErrorDetails}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied diagnostic!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy details</span>
                    </>
                  )}
                </button>

                {isPopupIssue && (
                  <button
                    type="button"
                    onClick={handleGoogleRedirectSignIn}
                    disabled={isRedirecting}
                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 underline font-medium transition-colors"
                  >
                    {isRedirecting ? 'Redirecting...' : 'Try Sign In with Redirect →'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Social Sign-In */}
          <button
            id="auth-google-button"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || isRedirecting}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mb-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.7-2.1-6.6-5.1L1.7 16.6C3.5 20.4 7.4 23.5 12 23.5z"
              />
            </svg>
            {isSubmitting ? 'Opening Google Sign-In...' : 'Continue with Google'}
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-xs text-slate-400 font-medium tracking-wider uppercase shrink-0">
              or with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="auth-name-input">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jordan Miller"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="auth-email-input">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300" htmlFor="auth-password-input">
                  Password
                </label>
                {isSignUp && (
                  <span className="text-[11px] text-slate-400">At least 6 chars</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition-all"
                />
              </div>
            </div>

            <button
              id="auth-submit-button"
              type="submit"
              disabled={isSubmitting || isRedirecting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-all shadow-md shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isSignUp ? 'Creating your vault...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Personal Second Brain' : 'Sign In to Second Brain'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Multi-tenant encrypted vault: Isolated to your user account</span>
          </div>
        </div>
      </div>
    </div>
  );
};

