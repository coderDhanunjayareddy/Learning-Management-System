import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import SidebarNav from "../../components/layout/SidebarNav";
import { getDashboardTheme } from "../../components/layout/dashboardTheme";
import ProfilePanel from "../../components/profile/ProfilePanel";
import spectropyLogo from "/logo.png";
import gvjbLogo from "/gvjb.png";
import { RiHome2Line } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import { PiUsersBold, PiChatsCircleBold } from 'react-icons/pi';

export default function AdminProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isGvjbClient = user?.role === "client_admin";
  const theme = getDashboardTheme(isGvjbClient);
  const brandLogo = isGvjbClient ? gvjbLogo : spectropyLogo;
  const brandName = isGvjbClient ? "GVB" : "Spectropy";
  const dashboardTitle = isGvjbClient ? "GVB Dashboard" : "Admin Dashboard";

  const navItems = [
    {
      key: "home",
      label: "Home",
      icon: <RiHome2Line />,
      active: false,
      onClick: () => navigate("/admin/dashboard"),
    },
    {
      key: "courses",
      label: "Courses",
      icon: <BiBookOpen />,
      active: false,
      onClick: () => navigate("/admin/dashboard"),
    },
    {
      key: "users",
      label: "Users",
      icon: <PiUsersBold />,
      active: false,
      onClick: () => navigate("/admin/dashboard"),
    },
    {
      key: "community",
      label: "Community",
      icon: <PiChatsCircleBold />,
      active: false,
      onClick: () => navigate("/admin/dashboard"),
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
          brandLogo={brandLogo}
          brandName={brandName}
          title={dashboardTitle}
          brandTag={isGvjbClient ? "GVB" : undefined}
          navItems={navItems}
          userInfo={{
            name: user?.full_name || "Administrator",
            email: user?.email || "admin@spectropy.com",
            meta: isGvjbClient ? "GVB Client" : null,
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
