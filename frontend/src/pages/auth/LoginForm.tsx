// src/pages/auth/LoginForm.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import gvjbLogo from '/gvjb.png';
import spectropyLogo from '/logo.png';

type Role = 'student' | 'teacher';

export default function LoginForm() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('student');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect after login
  useEffect(() => {
    if (!user) return;

    switch (user.role) {
      case 'super_admin':
        navigate('/superadmin/dashboard');
        break;
      case 'client_admin':
      case 'content_authorizer':
      case 'school_owner':
        navigate('/admin/dashboard');
        break;
      case 'teacher':
        navigate('/student/dashboard');
        break;
      case 'student':
        navigate('/student/dashboard');
        break;
      default:
        navigate('/login');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
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
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_40%,_#fef9f3_100%)] text-slate-900"
      style={{ fontFamily: '"Source Sans 3", "Segoe UI", sans-serif' }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap');
        `}
      </style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute top-40 -left-10 h-64 w-64 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/90 to-transparent" />
      </div>

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-4">
            <img
              src={gvjbLogo}
              alt="GVB Logo"
              className="h-14 w-auto object-contain"
            />
            <div className="leading-tight">
              <div className="text-xs uppercase tracking-[0.35em] text-amber-700">
                GVB
              </div>
              <div className="text-lg font-extrabold">
                Grameena Vidhyajyothi Bharath
              </div>
            </div>
          </Link>
          <button
            onClick={() => navigate('/')}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Back to Home
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="rounded-3xl border border-amber-100 bg-white/90 p-8 shadow-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              GVB Learning Platform
            </div>
            <h1
              className="mt-4 text-3xl font-extrabold leading-tight"
              style={{ fontFamily: '"Playfair Display", "Georgia", serif' }}
            >
              {isLogin ? 'Welcome Back' : 'Create Your Account'}
            </h1>
            <p className="mt-3 text-slate-600">
              {isLogin
                ? 'Sign in to access your learning dashboard and resources.'
                : 'Register to start learning with GVB’s satellite-enabled education platform.'}
            </p>
            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl bg-amber-50 p-4">
                Reliable learning access for rural schools.
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                Structured curriculum, guided practice, and progress tracking.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <div className="text-center">
              <div className="text-sm font-semibold text-amber-700">
                {isLogin ? 'Login' : 'Register'}
              </div>
              <h2
                className="mt-2 text-2xl font-bold"
                style={{ fontFamily: '"Playfair Display", "Georgia", serif' }}
              >
                {isLogin ? 'Access your account' : 'Join GVB'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {isLogin
                  ? 'Enter your credentials to continue.'
                  : 'Fill in your details to get started.'}
              </p>
            </div>

            {error && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              )}

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />

              {!isLogin && (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              )}

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />

              {!isLogin && (
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-amber-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-500 disabled:opacity-70"
              >
                {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-slate-600">
              {isLogin ? (
                <>
                  New user?{' '}
                  <button
                    onClick={() => setIsLogin(false)}
                    className="font-semibold text-amber-700 hover:text-amber-800"
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    onClick={() => setIsLogin(true)}
                    className="font-semibold text-amber-700 hover:text-amber-800"
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <img src={gvjbLogo} alt="GVB" className="h-8 w-auto" />
            <span>Grameena Vidhyajyothi Bharath</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <img src={spectropyLogo} alt="Spectropy" className="h-6 w-auto" />
            <span>Powered by Spectropy</span>
          </div>
          <div>© {new Date().getFullYear()} GVB. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
