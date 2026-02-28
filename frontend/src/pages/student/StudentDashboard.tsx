// src/pages/student/StudentDashboard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from "/gvjb.png"; // adjust path if needed
import AdminCourseManager from '../../components/courses/AdminCourseManager';
import { getDashboardTheme } from '../../components/layout/dashboardTheme';

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<'courses'>('courses');
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const { user } = useAuth();
    
    // 👇 Add these lines
  const userFullName = user?.full_name || 'Super Administrator';
  const userEmail = user?.email || 'super@lms.com';
  const dashboardTitle =
    user?.role === 'teacher' ? 'Teacher Dashboard' : 'Student Dashboard';
  const courseTheme = getDashboardTheme(true);

  const handleBackToLogin = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_45%,_#fef9f3_100%)] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Left Sidebar */}
        <aside className="flex w-full flex-col border-b border-amber-100 bg-white/90 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r">
          <div className="p-6 border-b border-amber-100">
            <div className="flex items-center space-x-3">
              <img
                src={logo}
                alt="GVJB Logo"
                className="h-11 w-auto rounded-md object-contain"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-700">
                  GVB
                </p>
                <h1 className="text-lg font-semibold">{dashboardTitle}</h1>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-colors ${
                activeTab === 'courses'
                  ? 'bg-amber-100 text-amber-900 border-l-4 border-amber-600'
                  : 'text-slate-700 hover:bg-amber-50'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Courses
            </button>
          </nav>

          {/* User Info */}
          <div className="px-4 pb-4">
            <div className="flex items-center rounded-2xl border border-amber-100 bg-amber-50 p-3">
              <div className="h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center">
                <span className="text-amber-900 font-semibold text-xl">
                  {userFullName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {userFullName}
                </p>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          <footer className="mt-auto border-t border-amber-100 px-4 py-2">
            <button
              onClick={handleBackToLogin}
              className="w-full flex items-center justify-center rounded-full border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Logout
            </button>
          </footer>
        </aside>

        {/* Right Panel */}
        <section className="flex-1 overflow-y-auto">
          <div className="border-b border-amber-100 bg-white/70 px-6 py-6 backdrop-blur">
            <h1 className="text-2xl font-bold">
              {activeTab === 'courses' && 'Active Courses'}
            </h1>
            <p className="text-slate-600 mt-1">
              {activeTab === 'courses' &&
                'Continue your learning with GVJB course modules.'}
            </p>
          </div>

          <div className="p-6">
            {activeTab === 'courses' && (
              <div className="max-w-6xl mx-auto">
                <AdminCourseManager
                  mode="student"
                  role={user?.role}
                  theme={courseTheme}
                  isGvjbClient
                  brandLogo={logo}
                  brandName="GVB"
                  courseBannerClass="bg-amber-50"
                  listTitle="My Courses"
                  emptyMessage="You are not enrolled in any courses yet."
                  onViewCourse={(courseId) => navigate(`/student/course/${courseId}`)}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
