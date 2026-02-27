// src/pages/student/StudentDashboard.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import axios from 'axios';
import spectropyLogo from "/logo.png";
import gvjbLogo from "/gvjb.png";

interface EnrolledCourse {
  id: number;
  title: string;
  description: string | null;
  enrolled_at: string;
}

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<'courses'>('courses');
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const { user } = useAuth();

  const isClientTenant = Boolean(user?.client_id);
  const brandLogo = isClientTenant ? gvjbLogo : spectropyLogo;
  const brandName = isClientTenant ? 'GVB' : 'Spectropy';
  const userFullName = user?.full_name || 'Student';
  const userEmail = user?.email || '';
  const dashboardTitle = 'Student Dashboard';

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        const res = await api.get<EnrolledCourse[]>('/student/enrolled-courses');
        setCourses(res.data);
      } catch (err: unknown) {
        const message = axios.isAxiosError(err)
          ? err.response?.data?.error || err.message || 'Failed to load your courses.'
          : 'Failed to load your courses.';
        console.error('Failed to load courses:', err);
        alert(`${message} Please log in again.`);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, []);

  const handleBackToLogin = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      className={
        isClientTenant
          ? 'min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_45%,_#fef9f3_100%)] text-slate-900'
          : 'min-h-screen bg-[radial-gradient(circle_at_top,_#e6f0ff,_#f7faff_45%,_#ffffff_100%)] text-slate-900'
      }
    >
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Left Sidebar */}
        <aside
          className={`flex w-full flex-col border-b lg:w-72 lg:border-b-0 lg:border-r ${
            isClientTenant ? 'border-amber-100 bg-white/90 backdrop-blur' : 'border-blue-100 bg-white'
          }`}
        >
          <div className={`p-6 border-b ${isClientTenant ? 'border-amber-100' : 'border-blue-100'}`}>
            <div className="flex items-center space-x-3">
              <img
                src={brandLogo}
                alt={`${brandName} Logo`}
                className="h-11 w-auto rounded-md object-contain"
              />
              <div>
                <p
                  className={`text-xs uppercase tracking-[0.3em] ${
                    isClientTenant ? 'text-amber-700' : 'text-blue-600'
                  }`}
                >
                  {brandName}
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
                  ? isClientTenant
                    ? 'bg-amber-100 text-amber-900 border-l-4 border-amber-600'
                    : 'bg-blue-100 text-blue-900 border-l-4 border-blue-700'
                  : isClientTenant
                    ? 'text-slate-700 hover:bg-amber-50'
                    : 'text-slate-700 hover:bg-blue-50'
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
            <div
              className={`flex items-center rounded-2xl border p-3 ${
                isClientTenant ? 'border-amber-100 bg-amber-50' : 'border-blue-100 bg-blue-50'
              }`}
            >
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  isClientTenant ? 'bg-amber-200' : 'bg-blue-200'
                }`}
              >
                <span className={`font-semibold text-xl ${isClientTenant ? 'text-amber-900' : 'text-blue-900'}`}>
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

          <footer className={`mt-auto border-t px-4 py-2 ${isClientTenant ? 'border-amber-100' : 'border-blue-100'}`}>
            <button
              onClick={handleBackToLogin}
              className={`w-full flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                isClientTenant
                  ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                  : 'border-blue-200 text-blue-700 hover:bg-blue-50'
              }`}
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
          <div
            className={`border-b px-6 py-6 backdrop-blur ${
              isClientTenant ? 'border-amber-100 bg-white/70' : 'border-blue-100 bg-white'
            }`}
          >
            <h1 className="text-2xl font-bold">
              {activeTab === 'courses' && 'Active Courses'}
            </h1>
            <p className="text-slate-600 mt-1">
              {activeTab === 'courses' &&
                `Continue your learning with ${brandName} course modules.`}
            </p>
          </div>

          <div className="p-6">
            {activeTab === 'courses' && (
              <div className="max-w-6xl mx-auto">
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`border rounded-2xl p-4 animate-pulse bg-white ${
                          isClientTenant ? 'border-amber-100' : 'border-blue-100'
                        }`}
                      >
                        <div
                          className={`h-28 rounded-xl mb-4 ${
                            isClientTenant ? 'bg-amber-100/70' : 'bg-blue-100/70'
                          }`}
                        ></div>
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
                        <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                      </div>
                    ))}
                  </div>
                ) : courses.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-slate-600">
                      You are not enrolled in any courses yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        className={`border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition bg-white ${
                          isClientTenant ? 'border-amber-100' : 'border-blue-100'
                        }`}
                      >
                        <div
                          className={`h-28 flex items-center justify-center ${
                            isClientTenant ? 'bg-amber-50' : 'bg-blue-50'
                          }`}
                        >
                          <img
                            src={brandLogo}
                            alt={brandName}
                            className="h-10 w-auto opacity-70"
                          />
                        </div>
                        <div className="p-4">
                          <h2 className="font-semibold text-lg">
                            {course.title}
                          </h2>
                          <p className="text-sm text-slate-500 mt-1">
                            {course.description || 'Instructor: Not specified'}
                          </p>

                          <Link
                            to={`/student/course/${course.id}`}
                            className={`mt-4 w-full text-center text-xs px-3 py-2 rounded-full font-semibold block ${
                              isClientTenant
                                ? 'bg-amber-400 text-slate-900 hover:bg-amber-500'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            View Course
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
