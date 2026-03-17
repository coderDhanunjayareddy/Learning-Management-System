import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import spectropyLogo from "/logo.png";
import { RiFileList3Line } from "react-icons/ri";

interface ExamShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export default function ExamShell({
  title,
  description,
  children,
  headerAction,
}: ExamShellProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = getDashboardTheme(false);
  const userFullName = user?.full_name || "Exam Manager";
  const userEmail = user?.email || "";

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      key: "exam-list",
      label: "Exam List",
      icon: <RiFileList3Line />,
      active: isActive("/exams"),
      onClick: () => navigate("/exams"),
    },
  ];

  return (
    <DashboardLayout
      shellClass={`${theme.shellClass} h-screen overflow-hidden`}
      layoutClass={`${theme.layoutClass} h-screen overflow-hidden`}
      sidebarOpen={sidebarOpen}
      onSidebarClose={() => setSidebarOpen(false)}
      contentClassName="p-0"
      sidebar={
        <SidebarNav
          brandLogo={spectropyLogo}
          brandName="Spectropy"
          title="Exam Management"
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail }}
          showUserInfo={false}
          showLogout={false}
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
            {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
          </div>
        </div>
      }
    >
      <div className="p-6">{children}</div>
    </DashboardLayout>
  );
}
