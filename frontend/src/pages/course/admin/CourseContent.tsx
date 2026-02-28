
import { useNavigate, useParams } from "react-router-dom";
// âœ… src/pages/admin/CourseContent.tsx
import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import { RiHome2Line } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import { PiUsersBold, PiChatsCircleBold } from "react-icons/pi";
import CourseContentManager from "@/features/courses/components/editor/CourseContentManager";

export default function CourseContent() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isGvjbClient = user?.role === "client_admin";
  const theme = getDashboardTheme(isGvjbClient);
  const userFullName = user?.full_name || "Administrator";
  const userEmail = user?.email || "admin@lms.com";

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
      active: true,
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
  const handleBackToLogin = async () => {
    await logout();
    navigate("/login", { replace: true });
  };


  // âœ… FETCH CONTENT + TRANSFORM INTO CHAPTER STRUCTURE


  return (
    <DashboardLayout
      shellClass={theme.shellClass}
      layoutClass={theme.layoutClass}
      sidebarOpen={sidebarOpen}
      onSidebarClose={() => setSidebarOpen(false)}
      contentClassName="p-0"
      sidebar={
        <SidebarNav
          brandLogo={isGvjbClient ? "/gvjb.png" : "/logo.png"}
          brandName={isGvjbClient ? "GVB" : "Spectropy"}
          title={isGvjbClient ? "GVB Dashboard" : "Admin Dashboard"}
          brandTag={isGvjbClient ? "GVB" : undefined}
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail }}
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
              <h1 className="text-xl md:text-2xl font-bold">Course Content</h1>
              <p
                className={`${isGvjbClient ? "text-slate-600" : "text-gray-600"
                  } mt-1 text-sm md:text-base`}
              >
                Manage course chapters and content items.
              </p>
            </div>
            <button
              onClick={() => navigate("/admin/dashboard")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border ${theme.secondaryBorderClass} hover:bg-white/70`}
            >
              Back to Courses
            </button>
          </div>
        </div>
      }
    >
      <CourseContentManager
        courseId={courseId}
        apiPrefix="/admin"
        isGvjbClient={isGvjbClient}
        onBack={() => navigate("/admin/dashboard")}
      />
    </DashboardLayout>
  );
}




