import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface QuestionBankLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  showBack?: boolean;
}

const roleDashboardMap: Record<string, string> = {
  super_admin: "/superadmin/dashboard",
  client_admin: "/admin/dashboard",
  content_authorizer: "/content-authorizer/dashboard",
  school_owner: "/school-owner/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

const navItems = [
  { label: "Questions", to: "/question-bank" },
  { label: "Subjects", to: "/question-bank/subjects" },
  { label: "Chapters", to: "/question-bank/chapters" },
  { label: "Topics", to: "/question-bank/topics" },
  { label: "Folders", to: "/question-bank/folders" },
  { label: "Bulk Upload", to: "/question-bank/bulk-upload" },
];

export default function QuestionBankLayout({
  title,
  description,
  children,
  actions,
  showBack = true,
}: QuestionBankLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const backPath = roleDashboardMap[user?.role ?? "teacher"] || "/login";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {showBack && (
                <button
                  onClick={() => navigate(backPath)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Back
                </button>
              )}
              {actions}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-8">
        <aside className="hidden w-60 shrink-0 lg:block space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Question Bank
            </h2>
            <nav className="mt-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-xl px-3 py-2 text-sm font-medium transition ${isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div id="question-bank-sidebar-slot" />
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
