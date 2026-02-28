// src/pages/teacher/Dashboard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SidebarNav from '../../components/layout/SidebarNav';
import { getDashboardTheme } from '../../components/layout/dashboardTheme';
import { RiHome2Line } from 'react-icons/ri';
import { BiBookOpen } from 'react-icons/bi';
import { PiUsersBold, PiChatsCircleBold } from 'react-icons/pi';
import AdminCourseManager from '../../components/courses/AdminCourseManager';

const placeholderCourses = [
  {
    id: 101,
    title: 'Foundations of Algebra',
    description: 'Unit planning, assessments, and weekly practice sets.',
    published: true,
    student_count: 28,
  },
  {
    id: 102,
    title: 'Modern World History',
    description: 'Curate reading packs and recorded discussions.',
    published: false,
    student_count: 18,
  },
  {
    id: 103,
    title: 'Digital Literacy',
    description: 'Short modules on productivity and research skills.',
    published: true,
    student_count: 42,
  },
];

export default function TeacherDashboard() {
  const [courses] = useState(placeholderCourses);
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
      onClick: () => {},
    },
    {
      key: 'community',
      label: 'Community',
      icon: <PiChatsCircleBold />,
      active: false,
      onClick: () => {},
    },
  ];

  const handleBackToLogin = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

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
          onManageContent={(courseId) =>
            navigate(`/teacher/courses/${courseId}/content`)
          }
        />
        <p className="mt-6 text-xs text-slate-500">
          Course data is currently using placeholder entries until the teacher course API is available.
        </p>
      </div>
    </DashboardLayout>
  );
}
