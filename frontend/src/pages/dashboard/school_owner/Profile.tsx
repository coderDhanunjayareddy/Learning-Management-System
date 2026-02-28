import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import ProfilePanel from "@/features/users/components/ProfilePanel";
import { RiHome2Line } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import { PiUsersBold, PiChatsCircleBold } from 'react-icons/pi';

export default function SchoolOwnerProfile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = getDashboardTheme(false);

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <RiHome2Line />,
      active: false,
      onClick: () => navigate("/school-owner/dashboard"),
    },
    {
      key: "courses",
      label: "Courses",
      icon: <BiBookOpen />,
      active: false,
      onClick: () => navigate("/school-owner/courses"),
    },
    {
      key: "users",
      label: "Users",
      icon: <PiUsersBold />,
      active: false,
      onClick: () => {},
    },
    {
      key: "community",
      label: "Community",
      icon: <PiChatsCircleBold />,
      active: false,
      onClick: () => {},
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
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
          title="School Owner"
          navItems={navItems}
          userInfo={{
            name: user?.full_name || "School Owner",
            email: user?.email || "owner@spectropy.com",
          }}
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
            className={`md:hidden mr-3 p-2 rounded-lg border ${theme.secondaryBorderClass}`}
            aria-label="Open menu"
          >
            Menu
          </button>
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Profile</h1>
              <p className="mt-1 text-sm md:text-base text-gray-600">
                View and update your account details.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6">
        <ProfilePanel />
      </div>
    </DashboardLayout>
  );
}




