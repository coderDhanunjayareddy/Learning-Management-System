import React, { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import spectropyLogo from '/logo.png';

type Role = 'student' | 'teacher';

/**
 * Professional SaaS Login Form - Spectropy LMS
 * Cleaned of Workspace ID for a direct global authentication flow.
 */
export default function LoginForm() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  // View state
  const [isLogin, setIsLogin] = useState(true);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('student');

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect Logic
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

  const handleSubmit = async (e: FormEvent) => {
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
      className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900"
      style={{ fontFamily: '"Source Sans 3", sans-serif' }}
    >
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@300;400;600;700&display=swap');`}
      </style>

      {/* Modern SaaS Background Decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-indigo-100/50 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-blue-100/30 blur-3xl" />
        <div className="absolute inset-0 bg-white/40" />
      </div>

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={spectropyLogo} alt="Spectropy Logo" className="h-9 w-auto" />
            <span className="text-xl font-bold tracking-tight text-slate-900 uppercase">Spectropy</span>
          </Link>
          <button
            onClick={() => navigate('/')}
            className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center px-6 py-12 lg:py-24">
        <div className="grid w-full gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">

          {/* Left Side: Product Branding */}
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              Intelligence Driven Learning
            </div>
            <h1
              className="mt-6 text-5xl font-bold leading-tight text-slate-900"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              {isLogin ? 'Access the Spectropy Ecosystem.' : 'Start your journey with us.'}
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-lg">
              Manage your academic infrastructure, track student progress, and deliver
              high-quality educational content through our unified LMS platform.
            </p>

            <div className="mt-12 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100 font-bold text-slate-900">01</div>
                <div>
                  <h3 className="font-bold text-slate-900">Unified Dashboard</h3>
                  <p className="text-sm text-slate-500">All your courses and metrics in one single view.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100 font-bold text-slate-900">02</div>
                <div>
                  <h3 className="font-bold text-slate-900">Enterprise Security</h3>
                  <p className="text-sm text-slate-500">Industry-standard encryption for institutional data.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Auth Card */}
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/60">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: '"Playfair Display", serif' }}>
                  {isLogin ? 'Sign In' : 'Join Spectropy'}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {isLogin ? 'Please enter your account details' : 'Register to access your learning portal'}
                </p>
              </div>

              {error && (
                <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-center text-sm font-medium text-red-600">
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
                    placeholder="••••••••"
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
                  className="w-full rounded-xl bg-slate-900 py-4 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70"
                >
                  {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="mt-8 text-center text-sm text-slate-500">
                {isLogin ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      onClick={() => setIsLogin(false)}
                      className="font-bold text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already registered?{' '}
                    <button
                      onClick={() => setIsLogin(true)}
                      className="font-bold text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Back to Login
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-slate-200 py-8 bg-white/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-2 grayscale opacity-60">
            <img src={spectropyLogo} alt="Spectropy" className="h-6 w-auto" />
            <span className="text-xs font-bold tracking-widest text-slate-600">SPECTROPY LMS</span>
          </div>
          <div className="text-xs text-slate-400 font-medium italic">
            Empowering the next generation of educators and learners.
          </div>
          <div className="text-xs text-slate-400 font-medium">
            © {new Date().getFullYear()} Spectropy.
          </div>
        </div>
      </footer>
    </div>
  );
}
