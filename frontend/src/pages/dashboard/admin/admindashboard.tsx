// src/pages/admin/admindashboard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

import spectropyLogo from "/logo.png";
import gvjbLogo from "/gvjb.png";
import { RiHome2Line, RiFileList3Line } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import { PiUsersBold, PiChatsCircleBold } from 'react-icons/pi';
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import UserManagement from './UserManagement';
import DashboardHome from './Home';
import Community from './Community';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SidebarNav from '@/components/layout/SidebarNav';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';
import AdminCourseManager from '@/features/courses/components/list/AdminCourseManager';

export default function CourseStudents() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const userFullName = user?.full_name || 'Super Administrator';
  const userEmail = user?.email || 'super@lms.com';
  const isGvjbClient = Boolean(user?.client_id);
  const isContentAuthorizer = user?.role === 'content_authorizer';
  const brandLogo = isGvjbClient ? gvjbLogo : spectropyLogo;
  const brandName = isGvjbClient ? 'GVB' : 'Spectropy';
  const dashboardTitle = isGvjbClient ? 'GVB Dashboard' : 'Admin Dashboard';
  const homeTitle = isGvjbClient
    ? 'Welcome to the GVB Dashboard'
    : 'Welcome to the Admin Dashboard';
  const clientMeta = isGvjbClient ? 'GVB Client' : null;
  const theme = getDashboardTheme(isGvjbClient);
  const courseBannerClass = isContentAuthorizer ? 'bg-sky-100' : 'bg-amber-50';

  const [activeTab, setActiveTab] = useState<'courses' | 'home' | 'users' | 'community'>('courses');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    {
      key: 'home',
      label: 'Home',
      icon: <RiHome2Line />,
      active: activeTab === 'home',
      onClick: () => setActiveTab('home'),
    },
    {
      key: 'org',
      label: 'Organization',
      icon: <HiOutlineBuildingOffice2 />,
      active: false,
      onClick: () => navigate('/admin/org'),
    },
    {
      key: 'courses',
      label: 'Courses',
      icon: <BiBookOpen />,
      active: activeTab === 'courses',
      onClick: () => setActiveTab('courses'),
    },
    {
      key: 'question-bank',
      label: 'Question Bank',
      icon: <RiFileList3Line />,
      active: false,
      onClick: () => navigate('/question-bank'),
    },
    {
      key: 'users',
      label: 'Users',
      icon: <PiUsersBold />,
      active: activeTab === 'users',
      onClick: () => setActiveTab('users'),
    },
    {
      key: 'community',
      label: 'Community',
      icon: <PiChatsCircleBold />,
      active: activeTab === 'community',
      onClick: () => setActiveTab('community'),
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
          brandLogo={brandLogo}
          brandName={brandName}
          title={dashboardTitle}
          brandTag={isGvjbClient ? 'GVB' : undefined}
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail, meta: clientMeta }}
          onProfileClick={() => navigate("/admin/profile")}
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
              <h1 className="text-xl md:text-2xl font-bold">
                {activeTab === 'courses' && 'Courses'}
                {activeTab === 'home' && homeTitle}
                {activeTab === 'users' && 'User Management'}
                {activeTab === 'community' && 'Community'}
              </h1>

              <p
                className={`${isGvjbClient ? 'text-slate-600' : 'text-gray-600'
                  } mt-1 text-sm md:text-base`}
              >
                {activeTab === 'courses' &&
                  'Set up your courses and share your knowledge.'}
                {activeTab === 'home' && 'Key metrics at a glance'}
                {activeTab === 'users' && 'Manage your users and their activities.'}
                {activeTab === 'community' &&
                  'Monitor community interactions and content.'}
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6">
        {activeTab === 'courses' && (
          <AdminCourseManager
            mode="admin"
            role={user?.role}
            theme={theme}
            isGvjbClient={isGvjbClient}
            brandLogo={brandLogo}
            brandName={brandName}
            courseBannerClass={courseBannerClass}
            listTitle="All Courses"
            emptyMessage="No courses found."
            onManageContent={(courseId) => navigate(`/admin/courses/${courseId}/content`)}
            onEnroll={(courseId) => navigate(`/admin/courses/${courseId}/enroll`)}
          />
        )}

        {activeTab === 'home' && <DashboardHome />}

        {activeTab === 'users' && <UserManagement />}

        {activeTab === 'community' && <Community />}
      </div>
    </DashboardLayout>
  );
}




