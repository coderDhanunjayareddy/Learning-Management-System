// src/pages/auth/LoginForm.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';

import spectropyLogo from '/logo.png';

type Role = 'student' | 'teacher';

export default function LoginForm() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [isLogin, setIsLogin] = useState(true);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const roleRedirects: Record<string, string> = {
      super_admin: '/superadmin/dashboard',
      client_admin: '/admin/dashboard',
      content_authorizer: '/content-authorizer/dashboard',
      school_owner: '/school-owner/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard',
    };

    navigate(roleRedirects[user.role] || '/login');
  }, [user, navigate]);

  const resolveIdentifierType = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'email';
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return looksLikeEmail ? 'email' : 'user_id';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const identifierType = resolveIdentifierType(email);
        await login(email.trim(), password, identifierType);
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        await register(email, fullName, password, role);
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#e6f0ff,_#f7faff_45%,_#ffffff_100%)] text-slate-900"
      style={{ fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif' }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

          @keyframes spectropy-fade {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes spectropy-rise {
            from { opacity: 0; transform: translateY(18px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute top-40 -left-16 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-indigo-100/70 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-white/90 to-transparent" />
      </div>

      <header className="sticky top-0 z-20 border-b border-blue-100/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={spectropyLogo} alt="Spectropy" className="h-12 w-auto" />
            <div className="leading-tight">
              <div className="text-xs uppercase tracking-[0.45em] text-blue-600">
                Spectropy
              </div>
              <div
                className="text-lg font-extrabold"
                style={{ fontFamily: '"Space Grotesk", "Segoe UI", sans-serif' }}
              >
                Learning-Management-System
              </div>
            </div>
          </Link>
          <div className="hidden items-center gap-3 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm sm:flex">
            Secure client access
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="rounded-3xl border border-blue-100 bg-white/85 p-8 shadow-xl animate-[spectropy-rise_0.8s_ease-out]">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Spectropy Platform Login
            </div>
            <h1
              className="mt-4 text-3xl font-extrabold leading-tight text-slate-900"
              style={{ fontFamily: '"Space Grotesk", "Segoe UI", sans-serif' }}
            >
              Client-first learning, centralized control
            </h1>
            <p className="mt-3 text-slate-600">
              Sign in to manage your organization, schools, and learning content
              in one secure workspace.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div className="rounded-2xl bg-blue-50 p-4">
                Role-based access across clients and schools.
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                Audit-ready activity tracking and reporting.
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                Centralized content packs and entitlements.
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                Built for bulk onboarding and provisioning.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-lg animate-[spectropy-fade_0.6s_ease-out]">
            <div className="text-center">
              <div className="text-sm font-semibold text-blue-700">{isLogin ? 'Login' : 'Register'}</div>
              <h2
                className="mt-2 text-2xl font-bold"
                style={{ fontFamily: '"Space Grotesk", "Segoe UI", sans-serif' }}
              >
                {isLogin ? 'Access your Spectropy account' : 'Create your Spectropy account'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {isLogin ? 'Use your organization credentials to continue.' : 'Fill in the details to get started.'}
              </p>
            </div>

            {error && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                />
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                  {isLogin ? 'Email or User ID' : 'Email'}
                </label>
                <input
                  type={isLogin ? 'text' : 'email'}
                  placeholder={
                    isLogin ? 'Email or User ID' : 'name@institution.com'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                />
                {isLogin && (
                  <p className="text-[11px] text-slate-400">
                    We will detect whether you entered an email or user ID.
                  </p>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Your Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Instructor</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Password</label>
                  {isLogin && <a href="#" className="text-xs font-bold text-blue-600 hover:text-blue-500">Forgot?</a>}
                </div>
                <input
                  type="password"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                />
              </div>

              {!isLogin && (
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                />
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
              >
                {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign in' : 'Create Account')}
              </button>
            </form>

            <div className="mt-4 text-center text-sm">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-semibold text-blue-600 hover:text-blue-500"
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-blue-700">
              {isLogin ? 'Need access? Contact your client administrator to onboard users.' : 'By registering, you agree to our Terms of Service.'}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-blue-100/70 py-6 text-center text-sm text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <img src={spectropyLogo} alt="Spectropy" className="h-8 w-auto" />
            <span>Spectropy Learning Cloud</span>
          </div>
          <div>Copyright (c) {new Date().getFullYear()} Spectropy.</div>
        </div>
      </footer>
    </div>
  );
}


