// src/pages/admin/admindashboard.tsx
import { useState, useEffect, type SetStateAction, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import spectropyLogo from "/logo.png";
import gvjbLogo from "/gvjb.png";
import { PiUsersBold } from "react-icons/pi";
import { RiHome2Line } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import { PiChatsCircleBold } from "react-icons/pi";
import { GrChapterAdd } from "react-icons/gr";
import UserManagement from './UserManagement';
import DashboardHome from './Home';
import Community from './Community';

interface Course {
  id: number;
  title: string;
  description: string | null;
  published: boolean;
  created_at: string;
  enrolled_learners?: number;
}

export default function CourseStudents() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { user } = useAuth();

  // 👇 Add these lines
  const userFullName = user?.full_name || 'Super Administrator';
  const userEmail = user?.email || 'super@lms.com';
  const isGvjbClient = user?.role === 'client_admin';
  const brandLogo = isGvjbClient ? gvjbLogo : spectropyLogo;
  const brandName = isGvjbClient ? 'GVB' : 'Spectropy';
  const dashboardTitle = isGvjbClient ? 'GVB Dashboard' : 'Admin Dashboard';
  const homeTitle = isGvjbClient
    ? 'Welcome to the GVB Dashboard'
    : 'Welcome to the Admin Dashboard';
  const clientMeta = isGvjbClient ? 'GVB Client' : null;
  const shellClass = isGvjbClient
    ? 'min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_45%,_#fef9f3_100%)] text-slate-900'
    : 'h-screen bg-gray-50';
  const layoutClass = isGvjbClient
    ? 'flex min-h-screen flex-col lg:flex-row'
    : 'flex h-screen';
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
  const navRadiusClass = isGvjbClient ? 'rounded-2xl' : 'rounded-lg';
  const navIconClass = isGvjbClient
    ? 'text-lg text-amber-700 mr-3'
    : 'text-lg text-black mr-3';
  const userInfoWrapperClass = isGvjbClient ? 'px-4 pb-4' : 'mb-3 flex items-center';
  const userInfoInnerClass = isGvjbClient
    ? 'flex items-center rounded-2xl border border-amber-100 bg-amber-50 p-3'
    : 'flex items-center';
  const avatarClass = isGvjbClient
    ? 'h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center'
    : 'h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center ml-1';
  const avatarTextClass = isGvjbClient
    ? 'text-amber-900 font-semibold text-xl'
    : 'text-blue-900 font-medium text-xl';
  const headerClass = isGvjbClient
    ? 'sticky top-0 z-40 border-b border-amber-100 bg-white/70 px-6 py-6 backdrop-blur'
    : 'sticky top-0 z-40 p-6 border-b border-gray-200 bg-white';
  const primaryButtonClass = isGvjbClient
    ? 'bg-amber-400 text-slate-900 hover:bg-amber-500'
    : 'bg-blue-900 text-white hover:bg-blue-700';
  const secondaryBorderClass = isGvjbClient ? 'border-amber-200' : 'border-gray-300';

  const [activeTab, setActiveTab] = useState<'courses' | 'home' | 'users' | 'community'>('courses');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [fetching, setFetching] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [courseToPublish, setCourseToPublish] = useState<number | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  //const menuRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPublished, setEditPublished] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);


  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all courses on mount
  useEffect(() => {
    fetchCourses();
  }, []);
  /*useEffect(() => {
    const handleClickOutsideMenu = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideMenu);
    return () =>
      document.removeEventListener('mousedown', handleClickOutsideMenu);
  }, []);*/

  const fetchCourses = async () => {
    setFetching(true);
    try {
      const res = await api.get('/admin/courses');
      setCourses(res.data);
    } catch (err) {
      console.error('Failed to load courses');
    } finally {
      setFetching(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await api.post('/admin/courses', {
        title,
        description: description.trim() || null,
        published,
      });
      alert('Course created successfully!');
      setTitle('');
      setDescription('');
      setPublished(false);
      fetchCourses();
      setShowCreateForm(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to create course';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const openPublishModal = (courseId: SetStateAction<number | null>) => {
    setCourseToPublish(courseId);
    setPublishModalOpen(true);
  };

  const closePublishModal = () => {
    setPublishModalOpen(false);
    setCourseToPublish(null);
  };

  const handlePublish = async () => {
    if (courseToPublish === null) return;
    try {
      await api.patch(`/admin/courses/${courseToPublish}/publish`);
      await fetchCourses();
      closePublishModal();
    } catch (err) {
      console.error('Failed to publish course:', err);
      alert('Failed to publish course. Please try again.');
    }
  };


  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    console.log('🗑️ Attempting to delete course ID:', id);
    try {
      await api.delete(`/admin/courses/${id}`);
      // Remove the deleted course from the local state
      setCourses((prev) => prev.filter((course) => course.id !== id));
      alert('Course deleted successfully!');
    } catch (err: any) {
      console.error('Failed to delete course:', err);
      const errorMsg = err.response?.data?.error || 'Failed to delete course. Please try again.';
      alert(errorMsg);
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setEditTitle(course.title);
    setEditDescription(course.description || '');
    setEditPublished(course.published);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editTitle.trim()) {
      alert('Title is required');
      return;
    }

    try {
      await api.patch(`/admin/courses/${id}`, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        published: editPublished,
      });

      // Optimistically update local state
      setCourses(prev =>
        prev.map(course =>
          course.id === id
            ? { ...course, title: editTitle.trim(), description: editDescription.trim() || null, published: editPublished }
            : course
        )
      );

      setEditingCourseId(null);
      alert('Course updated successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update course';
      alert(errorMsg);
    }
  };

  const handleCancelEdit = () => {
    setEditingCourseId(null);
  };

  // 🔍 Final filtered list (search + status filter)
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'published'
          ? course.published
          : !course.published;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className={shellClass}>
      <div className={layoutClass}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div
        className={`
    fixed md:static
    inset-y-0 left-0
    z-50
    w-64 lg:w-72
    ${sidebarThemeClass}
    border-r
    flex flex-col
    transform transition-transform duration-300 ease-in-out
    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0
  `}
      >

        <div className={`p-6 border-b ${sidebarHeaderBorder}`}>
          <div className="flex items-center space-x-2 cursor-pointer">
            <img
              src={brandLogo}
              alt={`${brandName} Logo`}
              className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
            />
          </div>
          {isGvjbClient && (
            <p className="text-xs uppercase tracking-[0.3em] text-amber-700 mt-2">
              GVB
            </p>
          )}
          <h1 className="text-lg font-semibold">{dashboardTitle}</h1>
        </div>

        <nav className={`flex-1 p-4 ${isGvjbClient ? 'space-y-2' : 'space-y-1'}`}>
          <button
            onClick={() => { setActiveTab('home'); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium ${navRadiusClass} transition-colors ${activeTab === 'home'
              ? navActiveClass
              : navInactiveClass
              }`}
          >
            <RiHome2Line className={navIconClass} />
            Home
          </button>

          <button
            onClick={() => { setActiveTab('courses'); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium ${navRadiusClass} transition-colors ${activeTab === 'courses'
              ? navActiveClass
              : navInactiveClass
              }`}
          >
            <BiBookOpen className={navIconClass} />
            Courses
          </button>

          <button
            onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium ${navRadiusClass} transition-colors ${activeTab === 'users'
              ? navActiveClass
              : navInactiveClass
              }`}
          >
            <PiUsersBold className={navIconClass} />
            Users
          </button>

          <button
            onClick={() => { setActiveTab('community'); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium ${navRadiusClass} transition-colors ${activeTab === 'community'
              ? navActiveClass
              : navInactiveClass
              }`}
          >
            <PiChatsCircleBold className={navIconClass} />
            Community
          </button>
        </nav>
        {/* User Info */}
        <div className={userInfoWrapperClass}>
          <div className={userInfoInnerClass}>
            <div className={avatarClass}>
              <span className={avatarTextClass}>
                {userFullName?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-m font-medium text-gray-900 truncate">{userFullName}</p>
              <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              {clientMeta && (
                <p className="text-[11px] text-gray-500 truncate">{clientMeta}</p>
              )}
            </div>
          </div>
        </div>

        <div
          className={`border-t ${isGvjbClient ? 'mt-auto border-amber-100 px-4 py-2' : 'border-gray-200 p-4'}`}
        >
          <button
            onClick={handleBackToLogin}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className={headerClass}>

          <button
            onClick={() => setSidebarOpen(true)}
            className={`md:hidden mr-3 p-2 rounded-lg border ${secondaryBorderClass}`}
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">


            <div>
              <h1 className="text-xl md:text-2xl font-bold">
                {activeTab === 'courses' && 'Courses'}
                {activeTab === 'home' && homeTitle}
                {activeTab === 'users' && 'User Management'}
                {activeTab === 'community' && 'Community'}
              </h1>

              <p className={`${isGvjbClient ? 'text-slate-600' : 'text-gray-600'} mt-1 text-sm md:text-base`}>
                {activeTab === 'courses' && 'Set up your courses and share your knowledge.'}
                {activeTab === 'home' && 'Key metrics at a glance'}
                {activeTab === 'users' && 'Manage your users and their activities.'}
                {activeTab === 'community' && 'Monitor community interactions and content.'}
              </p>
            </div>


            {activeTab === 'courses' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className={`md:w-auto px-4 py-2 ${isGvjbClient ? 'rounded-full' : 'rounded-lg'} flex items-center gap-2 ${primaryButtonClass}`}
              >
                Create Course
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {activeTab === 'courses' && (
            <div>
              {/* Search + Filters + View mode */}
              <div className="mb-6 flex items-center gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by Course Title"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full p-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 ${isGvjbClient
                      ? 'border-amber-200 focus:ring-amber-400 focus:border-amber-400'
                      : 'border-gray-300 focus:ring-blue-900 focus:border-transparent'
                      }`}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400 absolute left-3 top-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="flex gap-2 items-center">
                  {/* Filter Dropdown */}
                  <div ref={filterRef} className="relative">
                    <button
                      onClick={() => setShowFilters((prev) => !prev)}
                      className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm bg-white ${secondaryBorderClass} ${isGvjbClient ? 'hover:bg-amber-50 text-amber-900' : 'hover:bg-gray-50'}`}
                    >
                      Filters
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''
                          }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showFilters && (
                      <div className={`absolute right-0 mt-2 w-56 bg-white border shadow-lg rounded-lg p-3 z-50 ${isGvjbClient ? 'border-amber-200' : 'border-gray-200'}`}>
                        <label className={`text-xs font-semibold ${isGvjbClient ? 'text-slate-600' : 'text-gray-600'}`}>Published Status</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => {
                            const val = e.target.value as 'all' | 'published' | 'draft';
                            setStatusFilter(val);
                            setShowFilters(false); // close on select
                          }}
                          className={`w-full p-2 mt-1 border rounded text-sm ${isGvjbClient ? 'border-amber-200' : 'border-gray-300'}`}
                        >
                          <option value="all">All Courses</option>
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Grid View Button */}
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 border rounded-lg ${viewMode === 'grid'
                      ? isGvjbClient
                        ? 'bg-amber-400 text-slate-900 border-amber-400'
                        : 'bg-blue-900 text-white border-blue-900'
                      : isGvjbClient
                        ? 'border-amber-200 hover:bg-amber-50'
                        : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    title="Grid view"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h6v6H4zM14 6h6v6h-6zM4 16h6v6H4zM14 16h6v6h-6z"
                      />
                    </svg>
                  </button>

                  {/* List View Button */}
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 border rounded-lg ${viewMode === 'list'
                      ? isGvjbClient
                        ? 'bg-amber-400 text-slate-900 border-amber-400'
                        : 'bg-blue-900 text-white border-blue-900'
                      : isGvjbClient
                        ? 'border-amber-200 hover:bg-amber-50'
                        : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    title="List view"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Create Course Modal */}
              {showCreateForm && (
                <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
                  <div
                    className={`bg-white rounded-lg shadow-lg w-full max-w-md mx-auto p-6 ${isGvjbClient ? 'border border-amber-100' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold">Create New Course</h2>
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className={isGvjbClient ? 'text-amber-700 hover:text-amber-800' : 'text-gray-500 hover:text-gray-700'}
                        aria-label="Close form"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <form onSubmit={handleCreateCourse} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Title *</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className={`w-full p-2 border rounded focus:outline-none focus:ring-2 ${isGvjbClient
                            ? 'border-amber-200 focus:ring-amber-400 focus:border-amber-400'
                            : 'border-gray-300 focus:ring-blue-900 focus:border-transparent'
                            }`}
                          placeholder="Enter course title"
                          required
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className={`w-full p-2 border rounded focus:outline-none focus:ring-2 ${isGvjbClient
                            ? 'border-amber-200 focus:ring-amber-400 focus:border-amber-400'
                            : 'border-gray-300 focus:ring-blue-900 focus:border-transparent'
                            }`}
                          placeholder="Optional course description"
                          rows={3}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center">
                          <span className={`text-sm font-medium mr-3 ${isGvjbClient ? 'text-amber-800' : 'text-gray-700'}`}>Publish Course</span>
                          <button
                            type="button"
                            onClick={() => setPublished(!published)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${published ? 'bg-green-500' : isGvjbClient ? 'bg-amber-200' : 'bg-gray-300'
                              }`}
                            aria-label="Toggle publish"
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${published ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                          </button>
                          <span className={`ml-2 text-sm ${isGvjbClient ? 'text-amber-700' : 'text-gray-600'}`}>
                            {published ? 'Published' : 'Draft'}
                          </span>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className={`px-4 py-2 rounded disabled:opacity-50 font-medium ${isGvjbClient
                            ? 'bg-amber-400 text-slate-900 hover:bg-amber-500'
                            : 'bg-blue-900 text-white hover:bg-blue-700'
                            }`}
                        >
                          {loading ? 'Creating...' : 'Create Course'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Course List */}
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  All Courses ({filteredCourses.length})
                </h2>

                {fetching ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No courses found. {searchQuery && `Try a different search term or clear filters.`}
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                        : 'flex flex-col gap-4'
                    }
                  >
                    {filteredCourses.map((course) => (
                      <div
                        key={course.id}
                        className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow ${viewMode === 'list' ? 'p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4'
                          : ' flex flex-col justify-end'
                          }`}
                      >
                        {viewMode === 'list' ? (
                          // LIST VIEW
                          <>

                            {/* LEFT: Title + Meta + Description */}
                            <div className="flex-1 min-w-0">
                              {editingCourseId === course.id ? (
                                // ✏️ EDIT MODE
                                <div className="space-y-2">
                                  <input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full p-1 text-sm border border-gray-300 rounded"
                                    placeholder="Course title"
                                    autoFocus
                                  />
                                  <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="w-full p-1 text-xs border border-gray-300 rounded"
                                    placeholder="Description"
                                    rows={2}
                                  />
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px]">Published:</span>
                                    <button
                                      type="button"
                                      onClick={() => setEditPublished(!editPublished)}
                                      className={`relative inline-flex h-4 w-8 items-center rounded-full ${editPublished ? 'bg-green-500' : 'bg-gray-300'}`}
                                    >
                                      <span className={`h-3 w-3 rounded-full bg-white transform transition ${editPublished ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </button>
                                  </div>
                                  <div className="flex gap-1 mt-1">
                                    <button
                                      onClick={() => handleSaveEdit(course.id)}
                                      className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="text-[10px] bg-gray-300 text-gray-700 px-2 py-0.5 rounded"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // 👁️ VIEW MODE
                                <>
                                  {/* Title + Status */}
                                  <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-sm md:text-base break-words">

                                      {course.title.toUpperCase()}
                                    </h3>
                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                      Created: {new Date(course.created_at).toLocaleDateString()}
                                    </div>

                                    {course.published ? (
                                      <span
                                        title="Already published"
                                        className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 cursor-default"
                                      >
                                        Published
                                      </span>
                                    ) : (
                                      <span
                                        onClick={() => openPublishModal(course.id)}
                                        className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 cursor-pointer"
                                        title="Click to publish this course"
                                      >
                                        Draft
                                      </span>
                                    )}
                                  </div>

                                  {course.description && (
                                    <div className="relative group overflow-visible">
                                      <p className="text-xs text-gray-600 line-clamp-2 cursor-default max-w-2xl">
                                        {course.description}
                                      </p>
                                      <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-gray-500 text-white text-xs rounded-md px-3 py-2 max-w-3xl shadow-xl z-50">
                                        {course.description}
                                        <span className="absolute -top-1 left-3 w-2 h-2 bg-gray-500 rotate-45" />
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* RIGHT: Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Update */}

                              {/* Add Content */}
                              <button
                                onClick={() => navigate(`/admin/courses/${course.id}/content`)}
                                className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50 flex items-center gap-1"
                              >
                                <GrChapterAdd className="text-xs" />
                                Content
                              </button>

                              {/* Enroll */}
                              <button
                                onClick={() => navigate(`/admin/courses/${course.id}/enroll`)}
                                className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50 flex items-center gap-1"
                              >
                                <PiUsersBold className="text-xs" />
                                Enroll
                              </button>

                              <button
                                onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] border rounded-md hover:bg-gray-50"
                              >
                                course discussion
                              </button>

                              {/* Three-dot Menu */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId((prev) => (prev === course.id ? null : course.id));
                                  }}
                                  className="w-7 h-7 flex items-center justify-center text-gray-500 rounded-md hover:bg-gray-100"
                                >
                                  ⋮
                                </button>

                                {openMenuId === course.id && (
                                  <div
                                    className="absolute right-0 mt-1 w-36 bg-white border rounded-md shadow-lg text-xs z-50"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        handleEditCourse(course); // ✅ pass full course
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-gray-100"
                                    >
                                      ✏️ Update
                                    </button>

                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        handleDeleteCourse(course.id);
                                      }}
                                      className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
                                    >
                                      🗑 Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>


                        ) : (
                          // GRID VIEW
                          <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition flex flex-col h-80  relative">

                            {/* ===================== */}
                            {/* 🔹 BANNER */}
                            {/* ===================== */}
                            <div className="relative h-44 bg-linear-to-r from-blue-900 via-indigo-800 to-blue-700 overflow-hidden rounded-t-lg">

                              {/* Abstract shapes */}
                              <span className="absolute -top-6 -left-6 w-24 h-24 bg-white/10 rounded-full" />
                              <span className="absolute top-8 left-24 w-14 h-14 bg-white/10 rotate-45" />
                              <span className="absolute -bottom-8 right-8 w-28 h-28 bg-white/10 rounded-full" />
                              <span className="absolute top-4 right-24 w-10 h-10 bg-white/10 rotate-12" />

                              {/* Status Button */}{/* Status Indicator */}
                              {course.published ? (
                                <span
                                  title="Already published"
                                  className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-md font-medium bg-green-600 text-white cursor-default"
                                >
                                  Published
                                </span>
                              ) : (
                                <button
                                  onClick={() => openPublishModal(course.id)}
                                  className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-md font-medium bg-orange-500 text-white hover:bg-orange-600"
                                  title="Click to publish"
                                >
                                  Draft
                                </button>
                              )}
                            </div>

                            {/* ===================== */}
                            {/* 🔹 CARD BODY */}
                            {/* ===================== */}
                            <div className="px-4 py-3 flex flex-col flex-1">
                              {/* ===================== */}
                              {/* 🔹 DYNAMIC CONTENT: View or Edit */}
                              {/* ===================== */}
                              {editingCourseId === course.id ? (
                                // ✏️ EDIT MODE
                                <div className="flex flex-col flex-1">
                                  <div className="space-y-2 mb-2">
                                    <input
                                      value={editTitle}
                                      onChange={(e) => setEditTitle(e.target.value)}
                                      className="w-full p-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-900"
                                      placeholder="Course title"
                                      autoFocus
                                    />
                                    <textarea
                                      value={editDescription}
                                      onChange={(e) => setEditDescription(e.target.value)}
                                      className="w-full p-1.5 text-[12px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-900"
                                      placeholder="Description"
                                      rows={2}
                                    />
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-medium">Published:</span>
                                      <button
                                        type="button"
                                        onClick={() => setEditPublished(!editPublished)}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full ${editPublished ? 'bg-green-500' : 'bg-gray-300'}`}
                                      >
                                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${editPublished ? 'translate-x-4' : 'translate-x-1'}`} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Meta (keep it in edit mode too) */}
                                  <div className="text-[11px] text-gray-500 mb-2">
                                    Created: {new Date(course.created_at).toLocaleDateString()}
                                  </div>

                                  {/* Save / Cancel buttons */}
                                  <div className="mt-auto flex gap-2">
                                    <button
                                      onClick={() => handleSaveEdit(course.id)}
                                      className="flex-1 bg-green-600 text-white text-[11px] py-1.5 rounded-md hover:bg-green-700"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="flex-1 bg-gray-200 text-gray-700 text-[11px] py-1.5 rounded-md hover:bg-gray-300"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // 👁️ VIEW MODE (your original code, unchanged)
                                <>
                                  {/* ===================== */}
                                  {/* 🔹 TITLE + MENU */}
                                  {/* ===================== */}
                                  <div className="flex items-start justify-between gap-2 relative">
                                    <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 pr-8">
                                      {course.title.toUpperCase()}
                                    </h3>

                                    {/* Three-dot menu (ALWAYS visible) */}
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId((prev) => (prev === course.id ? null : course.id));
                                        }}
                                        className="w-7 h-7 flex items-center justify-center text-gray-500 rounded-md hover:bg-gray-100 transition"
                                        aria-label="Course actions"
                                      >
                                        ⋮
                                      </button>

                                      {openMenuId === course.id && (
                                        <div className="absolute right-0 mt-1 w-36 bg-white border rounded-md shadow-lg text-xs z-50 overflow-hidden">
                                          <button
                                            onClick={() => {
                                              setOpenMenuId(null);
                                              handleEditCourse(course);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-100"
                                          >
                                            ✏️ Update
                                          </button>
                                          <button
                                            onClick={() => {
                                              setOpenMenuId(null);
                                              handleDeleteCourse(course.id);
                                            }}
                                            className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
                                          >
                                            🗑 Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Meta */}
                                  <div className="text-[11px] text-gray-500 mb-1">
                                    Created: {new Date(course.created_at).toLocaleDateString()}
                                  </div>

                                  {/* Description */}
                                  {course.description && (
                                    <div className="relative group overflow-visible">
                                      <p className="text-xs text-gray-600 line-clamp-2 cursor-default">
                                        {course.description}
                                      </p>
                                      <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-gray-500 text-white text-xs rounded-md px-3 py-2 max-w-xs shadow-xl z-50">
                                        {course.description}
                                        <span className="absolute -top-1 left-3 w-2 h-2 bg-gray-500 rotate-45" />
                                      </div>
                                    </div>
                                  )}

                                  {/* Action Buttons */}
                                  <div className="mt-auto grid grid-cols-3 gap-2">
                                    <button
                                      onClick={() => navigate(`/admin/courses/${course.id}/content`)}
                                      className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] border rounded-md hover:bg-gray-50"
                                    >
                                      <GrChapterAdd className="text-xs" />
                                      Content
                                    </button>

                                    <button
                                      onClick={() => navigate(`/admin/courses/${course.id}/enroll`)}
                                      className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] border rounded-md hover:bg-gray-50">
                                      <PiUsersBold className="text-xs" />
                                      Enroll
                                    </button>

                                    <button
                                      onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                                      className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] border rounded-md hover:bg-gray-50"
                                    >
                                      course discussions
                                    </button>
                                  </div>
                                </>
                              )}

                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {publishModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
                  <div className="bg-white rounded-lg p-6 w-96 max-w-[90%]">
                    <h3 className="text-lg font-semibold mb-3">Publish Course?</h3>
                    <p className="text-gray-700 mb-5">
                      Are you sure you want to publish this course? It will become visible to learners.
                    </p>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={closePublishModal}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        No
                      </button>
                      <button
                        onClick={handlePublish}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Yes, Publish
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'home' && <DashboardHome />}

          {activeTab === 'users' && <UserManagement />}

          {activeTab === 'community' && <Community />}
        </div>
      </div>
      </div>
    </div>
  );
}
