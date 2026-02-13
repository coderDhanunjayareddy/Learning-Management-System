// src/pages/student/StudentDashboard.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import logo from "/logo.png"; // adjust path if needed

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
    
    // 👇 Add these lines
  const userFullName = user?.full_name || 'Super Administrator';
  const userEmail = user?.email || 'super@lms.com';

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        const res = await api.get<EnrolledCourse[]>('/student/enrolled-courses');
        setCourses(res.data);
      } catch (err: any) {
        console.error('Failed to load courses:', err);
        alert('Failed to load your courses. Please log in again.');
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
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 cursor-pointer">
            <img
              src={logo}
              alt="Spectropy Logo"
              className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
            />
          </div>
          <h1 className="text-lg font-semibold">Student Dashboard</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('courses')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'courses'
                ? 'bg-blue-50 text-blue-900 border-l-4 border-blue-900'
                : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Courses
          </button>
        </nav>

         {/* User Info */}
  <div className="mb-3 flex items-center">
    <div className="flex-shrink:0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center ml-1">
      <span className="text-blue-900 font-medium text-xl">
        {userFullName?.charAt(0).toUpperCase() || 'U'}
      </span>
    </div>
    <div className="ml-3">
      <p className="text-m font-medium text-gray-900 truncate">{userFullName}</p>
      <p className="text-xs text-gray-500 truncate">{userEmail}</p>
    </div>
  </div>
  
        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleBackToLogin}
            className="w-full flex items-center justify-center px-4 py-2 text-sm text-blue-900 hover:text-blue-600"
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
        </div>
      </div>
      {/*Right panel*/}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">
                {activeTab === 'courses' && 'Active Courses'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeTab === 'courses' && 'Set up your courses and share your knowledge.'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {activeTab === 'courses' && (
            <div className="max-w-6xl mx-auto">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse">
                      <div className="h-32 bg-gray-200 rounded mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-600">You are not enrolled in any courses yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
                    >
                      <div className="bg-white h-32 flex items-center justify-center">
                      </div>
                      <div className="p-4">
                        <h2 className="font-semibold text-xl">{course.title}</h2>
                        <p className="text-l text-gray-500 mt-1">
                          {course.description || 'Instructor: Not specified'}
                        </p>

                        <Link
                          to={`/student/course/${course.id}`}
                          className="mt-4 w-full text-center bg-blue-900 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 font-medium block"
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
      </div>
    </div>
  );
}