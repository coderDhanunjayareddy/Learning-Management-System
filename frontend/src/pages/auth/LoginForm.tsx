// src/pages/auth/LoginForm.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';

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
        navigate('/teacher/dashboard');
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
    <div className="min-h-screen bg-spectropy-light flex flex-col items-center pb-6 px-4">
      <Header />

      <main className="w-full max-w-md bg-spectropy-white rounded-xl shadow-lg p-6 mt-8">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">
            {isLogin ? '🔐' : '📝'}
          </div>
          <h1 className="text-xl font-bold text-spectropy-blue">
            {isLogin ? 'Login' : 'Register'}
          </h1>
          <p className="text-spectropy-gray text-sm">
            {isLogin ? 'Enter your credentials' : 'Create your account'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-sm text-center mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name (Register only) */}
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-spectropy-blue"
            />
          )}

          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-spectropy-blue"
          />

          {/* Role (Register only) */}
          {!isLogin && (
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-spectropy-blue"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          )}

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-spectropy-blue"
          />

          {/* Confirm Password (Register only) */}
          {!isLogin && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-spectropy-blue"
            />
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-md text-white transition
              ${isLogin
                ? 'bg-maincolor hover:bg-lightmain'
                : 'bg-green-700 hover:bg-green-600'
              }`}
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        {/* Toggle */}
        <div className="mt-4 text-center text-sm">
          {isLogin ? (
            <>
              New user?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="text-spectropy-blue hover:text-blue-800 font-medium"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already registered?{' '}
              <button
                onClick={() => setIsLogin(true)}
                className="text-spectropy-blue hover:text-blue-800 font-medium"
              >
                Login
              </button>
            </>
          )}
        </div>

        {/* Back buttons */}
        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => navigate('/')}
            className="text-spectropy-blue hover:text-blue-800 text-sm"
          >
            ← Back to Home
          </button>
        </div>
      </main>

      <footer className="mt-8 text-center text-spectropy-gray text-sm">
        © {new Date().getFullYear()} Spectropy. All rights reserved.
      </footer>
    </div>
  );
}
