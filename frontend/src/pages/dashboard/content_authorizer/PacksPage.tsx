import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiFileList3Line, RiHome2Line, RiStackLine } from 'react-icons/ri';
import { BiBookOpen } from 'react-icons/bi';
import { PiChatsCircleBold, PiUsersBold } from 'react-icons/pi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SidebarNav from '@/components/layout/SidebarNav';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import PackBuilderWorkspace from '@/features/packs/components/PackBuilderWorkspace';

export default function ContentAuthorizerPacksPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = getDashboardTheme(false);
  const userFullName = user?.full_name || 'Content Authorizer';
  const userEmail = user?.email || 'authorizer@spectropy.com';

  const navItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <RiHome2Line />,
      active: false,
      onClick: () => navigate('/content-authorizer/dashboard'),
    },
    {
      key: 'courses',
      label: 'Courses',
      icon: <BiBookOpen />,
      active: false,
      onClick: () => navigate('/content-authorizer/courses'),
    },
    {
      key: 'packs',
      label: 'Packs',
      icon: <RiStackLine />,
      active: true,
      onClick: () => navigate('/content-authorizer/packs'),
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

  const handleLogout = async () => {
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
          title="Content Authorizer"
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail }}
          onProfileClick={() => navigate('/content-authorizer/profile')}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
        />
      }
      header={
        <div className={theme.headerClass}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`md:hidden mr-3 rounded-lg border p-2 ${theme.secondaryBorderClass}`}
            aria-label="Open menu"
          >
            Menu
          </button>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-bold md:text-2xl">Pack Builder</h1>
              <p className="mt-1 text-sm text-gray-600 md:text-base">
                Build platform packs by creating courses, attaching items, and reviewing grouped summaries.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6">
        <PackBuilderWorkspace />
      </div>
    </DashboardLayout>
  );
}
