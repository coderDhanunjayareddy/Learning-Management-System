import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import spectropyLogo from "/logo.png";
import gvjbLogo from "/gvjb.png";
import { PiUsersBold } from "react-icons/pi";

export default function EnrollUsers() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGvjbClient = user?.role === 'client_admin';
  const brandLogo = isGvjbClient ? gvjbLogo : spectropyLogo;
  const shellClass = isGvjbClient
    ? 'min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_45%,_#fef9f3_100%)] text-slate-900'
    : '';
  const layoutClass = isGvjbClient
    ? 'flex min-h-screen flex-col lg:flex-row'
    : 'flex h-screen bg-gray-50';
  const sidebarThemeClass = isGvjbClient
    ? 'bg-white/90 border-amber-100 backdrop-blur'
    : 'bg-white border-gray-200';
  const sidebarHeaderBorder = isGvjbClient ? 'border-amber-100' : 'border-gray-200';
  const navActiveClass = isGvjbClient
    ? 'bg-amber-100 text-amber-900 border-l-4 border-amber-600'
    : 'bg-blue-50 text-blue-900 border-l-4 border-blue-900';
  const navInactiveClass = isGvjbClient
    ? 'text-slate-700 hover:bg-amber-50'
    : 'text-gray-700 hover:bg-gray-100';
  const navIconClass = isGvjbClient
    ? 'text-lg text-amber-700'
    : 'text-lg text-black';
  const headerBorderClass = isGvjbClient ? 'border-amber-100' : 'border-gray-200';
  const primaryButtonClass = isGvjbClient
    ? 'bg-amber-400 text-slate-900 hover:bg-amber-500'
    : 'bg-blue-900 text-white hover:bg-blue-700';

  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  // For three-dot menu
  const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);
  // For loading states (optional but nice)
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  // Store full enrollment list
  const [allEnrollments, setAllEnrollments] = useState<Array<{
    user_id: number;
    name: string;
    email: string;
    role: 'student' | 'teacher';
    enrolled_at: string;
  }> | null>(null);

  const [loadingEnrollments, setLoadingEnrollments] = useState(true);

  // Fetch all enrollments for the course
  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!courseId) return;
      setLoadingEnrollments(true);
      try {
        const response = await api.get(`/admin/courses/${courseId}/enrollments`);
        setAllEnrollments(response.data);
      } catch (err) {
        console.error('Failed to load enrollments:', err);
        setMessage({ type: 'error', text: 'Failed to load enrolled users.' });
      } finally {
        setLoadingEnrollments(false);
      }
    };

    fetchEnrollments();
  }, [courseId]);

  // Compute displayed enrollments based on selected role
  const displayedEnrollments = useMemo(() => {
    if (!allEnrollments) return [];
    if (role === 'student') {
      return allEnrollments.filter(e => e.role === 'student');
    } else if (role === 'teacher') {
      return allEnrollments.filter(e => e.role === 'teacher');
    } else {
      // Show all: students first, then teachers (already sorted by backend: ORDER BY role, email)
      // But ensure deterministic order in case backend changes
      const students = allEnrollments.filter(e => e.role === 'student');
      const teachers = allEnrollments.filter(e => e.role === 'teacher');
      return [...students, ...teachers];
    }
  }, [allEnrollments, role]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !email.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      await api.post(`/admin/courses/${courseId}/enroll-by-email`, {
        email: email.trim(),
        role,
      });

      setMessage({ type: 'success', text: `${role === 'student' ? 'Student' : 'Teacher'} enrolled successfully!` });
      setEmail('');

      // Refetch full enrollment list to update UI
      const response = await api.get(`/admin/courses/${courseId}/enrollments`);
      setAllEnrollments(response.data);

      // Auto-close modal after success
      setTimeout(() => {
        setShowModal(false);
        setMessage(null);
      }, 1500);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        `Failed to enroll ${role}. Make sure the user exists and is not already enrolled.`;
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };
  
  // 🗑️ Remove user from course
const handleRemoveUser = async (userId: number) => {
  if (!confirm('Are you sure you want to remove this user from the course?')) return;

  setRemovingUserId(userId);
  try {
    await api.delete(`/admin/courses/${courseId}/enrollments/${userId}`);
    // Optimistically update UI
    setAllEnrollments(prev => prev?.filter(e => e.user_id !== userId) || null);
    setMessage({ type: 'success', text: 'User removed successfully!' });
    setTimeout(() => setMessage(null), 2000);
  } catch (err: any) {
    const errorMsg = err.response?.data?.error || 'Failed to remove user.';
    setMessage({ type: 'error', text: errorMsg });
  } finally {
    setRemovingUserId(null);
    setOpenMenuUserId(null);
  }
};

// 🔄 Update user role (student ↔ teacher)
const handleUpdateRole = async (userId: number, currentRole: 'student' | 'teacher') => {
  const newRole = currentRole === 'student' ? 'teacher' : 'student';
  
  if (!confirm(`Change this user's role to "${newRole}"?`)) return;

  setUpdatingUserId(userId);
  try {
    await api.patch(`/admin/courses/${courseId}/enrollments/${userId}`, { role: newRole });
    // Optimistically update UI
    setAllEnrollments(prev =>
      prev?.map(e => (e.user_id === userId ? { ...e, role: newRole } : e)) || null
    );
    setMessage({ type: 'success', text: `Role updated to "${newRole}"!` });
    setTimeout(() => setMessage(null), 2000);
  } catch (err: any) {
    const errorMsg = err.response?.data?.error || 'Failed to update role.';
    setMessage({ type: 'error', text: errorMsg });
  } finally {
    setUpdatingUserId(null);
    setOpenMenuUserId(null);
  }
};

  const handleBack = () => {
    if (role) {
      setRole(null);
      setMessage(null);
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className={shellClass}>
    <div className={layoutClass}>
      {/* Left Sidebar */}
      <div className={`w-64 lg:w-72 border-r flex flex-col ${sidebarThemeClass}`}>
        {/* Logo/Brand */}
        <div className={`p-6 border-b ${sidebarHeaderBorder}`}>
          <div className="flex items-center space-x-2 cursor-pointer">
                <img
                    src={brandLogo}
                    alt="Brand Logo"
                    className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
                />
            </div>
          {isGvjbClient && (
            <p className="text-xs uppercase tracking-[0.3em] text-amber-700 mt-2">
              GVB
            </p>
          )}
          <h1 className="text-lg font-semibold">Enroll Users</h1>
        </div>

        {/* Role Selection */}
        <nav className={`flex-1 p-4 ${isGvjbClient ? 'space-y-2' : 'space-y-1'}`}>
          <button
            onClick={() => setRole('student')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium ${isGvjbClient ? 'rounded-2xl' : 'rounded-lg'} transition-colors ${
              role === 'student'
                ? navActiveClass
                : navInactiveClass
            }`}
          >
          <div className="flex items-center space-x-2">
                              <PiUsersBold  className={navIconClass}/>
                              <span>Enroll student</span>
                              </div>
          </button>
          <button
            onClick={() => setRole('teacher')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium ${isGvjbClient ? 'rounded-2xl' : 'rounded-lg'} transition-colors ${
              role === 'teacher'
                ? navActiveClass
                : navInactiveClass
            }`}
          >
            <div className="flex items-center space-x-2">
                              <PiUsersBold  className={navIconClass}/>
                              <span>Enroll Teacher</span>
                              </div>
          </button>
        </nav>

        {/* Footer */}
        <div className={`border-t ${isGvjbClient ? 'border-amber-100 px-4 py-2 mt-auto' : 'border-gray-200 p-4'}`}>
          <button
            onClick={handleBack}
            className={`w-full flex items-center justify-center ${isGvjbClient
              ? 'rounded-full border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50'
              : 'px-4 py-2 text-sm text-blue-900 hover:text-blue-600'
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
            Back To Admin Dashboard
          </button>
        </div>
      </div>

      {/* Right Panel - Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className={`p-6 border-b ${headerBorderClass} ${isGvjbClient ? 'bg-white/70 backdrop-blur' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">
                {role === 'student' && 'Enroll Student'}
                {role === 'teacher' && 'Enroll Teacher'}
                {!role && 'Manage Enrollments'}
              </h1>
              <p className={`${isGvjbClient ? 'text-slate-600' : 'text-gray-600'} mt-1`}>
                {role === 'student' &&
                  'Add students to this course by entering their email.'}
                {role === 'teacher' &&
                  'Add teachers to this course by entering their email.'}
                {!role &&
                  'Select a role on the left to enroll new users or view existing ones.'}
              </p>
            </div>
            {role && (
              <button
                onClick={() => setShowModal(true)}
                className={`px-4 py-2 ${isGvjbClient ? 'rounded-full' : 'rounded-lg'} flex items-center gap-2 ${primaryButtonClass}`}
              >
                Add User
              </button>
            )}
          </div>
        </div>

        {/* Enrollment List */}
        <div className="p-6">
          {loadingEnrollments ? (
            <p className="text-gray-500">Loading enrollments...</p>
          ) : displayedEnrollments.length === 0 ? (
            <p className="text-gray-500">
              {role
                ? `No ${role}s enrolled in this course yet.`
                : 'No enrollments yet.'}
            </p>
          ) : (
            <div className="space-y-3">
               {displayedEnrollments.map((enrollment) => (
  <div
    key={enrollment.user_id}
    className={`flex justify-between items-center p-4 bg-white rounded-lg border relative ${isGvjbClient ? 'border-amber-100' : 'border-gray-200'}`}
  >
    {/* User Info */}
    <div className="flex-1 min-w-0">
      <p className="font-medium truncate">{enrollment.name}</p>
      <p className="text-sm text-gray-600 truncate">{enrollment.email}</p>
    </div>

    {/* Role Badge + Menu */}
    <div className="flex items-center gap-2 ml-4">
      <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${isGvjbClient ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-800'}`}>
        {enrollment.role}
      </span>

      {/* Three-dot menu */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuUserId((prev) => (prev === enrollment.user_id ? null : enrollment.user_id));
          }}
        className={`w-6 h-6 flex items-center justify-center text-gray-500 rounded ${isGvjbClient ? 'hover:bg-amber-50' : 'hover:bg-gray-100'}`}
        aria-label="User actions"
      >
          ⋮
        </button>

        {/* Dropdown */}
        {openMenuUserId === enrollment.user_id && (
          <div
            className={`absolute right-0 mt-1 w-44 bg-white border rounded-md shadow-lg py-1 z-10 ${isGvjbClient ? 'border-amber-200' : 'border-gray-200'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleUpdateRole(enrollment.user_id, enrollment.role)}
              disabled={updatingUserId === enrollment.user_id}
              className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 disabled:opacity-50 ${isGvjbClient ? 'hover:bg-amber-50' : 'hover:bg-gray-100'}`}
            >
              🔄 Change Role
            </button>
            <button
              onClick={() => handleRemoveUser(enrollment.user_id)}
              disabled={removingUserId === enrollment.user_id}
              className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
            >
              🗑️ Remove
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
))}
            </div>
          )}
        </div>
      </div>

      {/* Email Input Modal */}
      {showModal && role && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className={`bg-white rounded-lg w-full max-w-md ${isGvjbClient ? 'border border-amber-100' : ''}`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">
                  Enroll {role === 'student' ? 'Student' : 'Teacher'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setMessage(null);
                  }}
                  className={isGvjbClient ? 'text-amber-700 hover:text-amber-800' : 'text-gray-500 hover:text-gray-700'}
                >
                  ✕
                </button>
              </div>

              {message && (
                <div
                  className={`mb-4 p-3 rounded ${
                    message.type === 'success'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <form onSubmit={handleEnroll} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full p-2 border rounded ${isGvjbClient ? 'border-amber-200' : 'border-gray-300'}`}
                    placeholder={`e.g. ${role}@example.com`}
                    required
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setMessage(null);
                    }}
                    className={`px-4 py-2 rounded ${isGvjbClient ? 'text-amber-800 hover:bg-amber-50' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-5 py-2 ${isGvjbClient ? 'rounded-full' : 'rounded-lg'} disabled:opacity-50 font-medium ${primaryButtonClass}`}
                  >
                    {submitting ? 'Enrolling...' : 'Enroll'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
