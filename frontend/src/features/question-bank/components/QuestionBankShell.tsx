import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import spectropyLogo from "/logo.png";
import gvjbLogo from "/gvjb.png";
import { RiHome2Line, RiFileList3Line } from "react-icons/ri";

interface QuestionBankShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

const roleConfig = {
  super_admin: {
    label: "Super Admin",
    dashboardPath: "/superadmin/dashboard",
    profilePath: "",
  },
  client_admin: {
    label: "Admin",
    dashboardPath: "/admin/dashboard",
    profilePath: "/admin/profile",
  },
  content_authorizer: {
    label: "Content Authorizer",
    dashboardPath: "/content-authorizer/dashboard",
    profilePath: "/content-authorizer/profile",
  },
  school_owner: {
    label: "School Owner",
    dashboardPath: "/school-owner/dashboard",
    profilePath: "/school-owner/profile",
  },
  teacher: {
    label: "Teacher",
    dashboardPath: "/teacher/dashboard",
    profilePath: "/teacher/profile",
  },
  student: {
    label: "Student",
    dashboardPath: "/student/dashboard",
    profilePath: "",
  },
} as const;

export default function QuestionBankShell({
  title,
  description,
  children,
  headerAction,
}: QuestionBankShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isClientTenant = Boolean(user?.client_id);
  const brandLogo = isClientTenant ? gvjbLogo : spectropyLogo;
  const brandName = isClientTenant ? "GVB" : "Spectropy";
  const theme = getDashboardTheme(isClientTenant);

  const roleKey = (user?.role ?? "student") as keyof typeof roleConfig;
  const config = roleConfig[roleKey];
  const userFullName = user?.full_name || config.label;
  const userEmail = user?.email || "";

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <RiHome2Line />,
      active: false,
      onClick: () => navigate(config.dashboardPath),
    },
    {
      key: "question-bank",
      label: "Question Bank",
      icon: <RiFileList3Line />,
      active: true,
      onClick: () => navigate("/question-bank"),
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
          title={config.label}
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail }}
          onProfileClick={
            config.profilePath
              ? () => navigate(config.profilePath)
              : undefined
          }
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
              <p className="mt-1 text-sm md:text-base text-slate-600">
                {description}
              </p>
            </div>
            {headerAction}
          </div>
        </div>
      }
    >
      <div className="p-6">{children}</div>
    </DashboardLayout>
  );
}
