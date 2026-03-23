// src/pages/teacher/Dashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import api from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SidebarNav from '@/components/layout/SidebarNav';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';
import { RiHome2Line, RiFileList3Line } from 'react-icons/ri';
import { BiBookOpen } from 'react-icons/bi';
import { PiUsersBold, PiChatsCircleBold } from 'react-icons/pi';
import AdminCourseManager from '@/features/courses/components/list/AdminCourseManager';

export default function TeacherDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = getDashboardTheme(false);

  const navItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <RiHome2Line />,
      active: false,
      onClick: () => navigate('/teacher/dashboard'),
    },
    {
      key: 'question-bank',
      label: 'Question Bank',
      icon: <RiFileList3Line />,
      active: false,
      onClick: () => navigate('/question-bank'),
    },
    {
      key: 'exams',
      label: 'Exams',
      icon: <RiFileList3Line />,
      active: false,
      onClick: () => navigate('/exams'),
    },
    {
      key: 'courses',
      label: 'Courses',
      icon: <BiBookOpen />,
      active: true,
      onClick: () => navigate('/teacher/courses'),
    },
    {
      key: 'students',
      label: 'Students',
      icon: <PiUsersBold />,
      active: false,
      onClick: () => { },
    },
    {
      key: 'community',
      label: 'Community',
      icon: <PiChatsCircleBold />,
      active: false,
      onClick: () => { },
    },
  ];

  const handleBackToLogin = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await api.get('/courses');
        setCourses(res.data || []);
      } catch (error: any) {
        const message = error?.response?.data?.error || 'Failed to load courses';
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  return (
    <DashboardLayout
      shellClass={theme.shellClass}
      layoutClass={theme.layoutClass}
      sidebarOpen={sidebarOpen}
      onSidebarClose={() => setSidebarOpen(false)}
      contentClassName="p-0"
      sidebar={
        <SidebarNav
          brandLogo="/logo.png"
          brandName="Spectropy"
          title="Teacher"
          navItems={navItems}
          userInfo={{
            name: user?.full_name || 'Teacher',
            email: user?.email || 'teacher@spectropy.com',
          }}
          onProfileClick={() => navigate('/teacher/profile')}
          onLogout={handleBackToLogin}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
        />
      }
      header={
        <div className={theme.headerClass}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`md:hidden mr-3 p-2 rounded-lg border ${theme.secondaryBorderClass}`}
            aria-label="Open menu"
          >
            Menu
          </button>
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">My Courses</h1>
              <p className="mt-1 text-sm md:text-base text-gray-600">
                Review your active classes and content packages.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6 max-w-6xl mx-auto">
        <AdminCourseManager
          mode="custom"
          role={user?.role}
          theme={theme}
          brandLogo="/logo.png"
          brandName="Spectropy"
          courseBannerClass="bg-slate-100"
          listTitle="My Courses"
          emptyMessage="No teaching assignments yet. Courses will appear here once assigned."
          courses={courses}
          loading={loading}
          onManageContent={(courseId) =>
            navigate(`/teacher/courses/${courseId}/content`)
          }
        />
        {loadError && (
          <p className="mt-4 text-xs text-rose-600">
            {loadError}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}




