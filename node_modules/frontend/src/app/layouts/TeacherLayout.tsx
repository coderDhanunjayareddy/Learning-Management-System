import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import spectropyLogo from '/logo.png';
import gvjbLogo from '/gvjb.png';

const tabs = [
  { to: '/teacher', label: 'Courses' },
  { to: '/teacher/batches', label: 'Batches' },
];

export default function TeacherLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const isClientTenant = Boolean(user?.client_id);
  const brandLogo = isClientTenant ? gvjbLogo : spectropyLogo;
  const brandName = isClientTenant ? 'GVB' : 'Spectropy';
  const shellClass = isClientTenant
    ? 'min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_45%,_#fef9f3_100%)] text-slate-900'
    : 'min-h-screen bg-[radial-gradient(circle_at_top,_#e6f0ff,_#f7faff_45%,_#ffffff_100%)] text-slate-900';
  const sidebarThemeClass = isClientTenant
    ? 'bg-white/90 border-amber-100 backdrop-blur'
    : 'bg-white border-blue-100';
  const sidebarHeaderBorder = isClientTenant ? 'border-amber-100' : 'border-blue-100';
  const navActiveClass = isClientTenant
    ? 'bg-amber-100 text-amber-900 border-l-4 border-amber-600'
    : 'bg-blue-100 text-blue-900 border-l-4 border-blue-700';
  const navInactiveClass = isClientTenant
    ? 'text-slate-700 hover:bg-amber-50'
    : 'text-slate-700 hover:bg-blue-50';
  const userFullName = user?.full_name || 'Teacher';
  const userEmail = user?.email || '';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={shellClass}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className={`flex w-full flex-col border-b lg:w-72 lg:border-b-0 lg:border-r ${sidebarThemeClass}`}>
          <div className={`p-6 border-b ${sidebarHeaderBorder}`}>
            <div className="flex items-center space-x-3">
              <img src={brandLogo} alt={`${brandName} Logo`} className="h-11 w-auto rounded-md object-contain" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{brandName}</p>
                <h1 className="text-lg font-semibold">Teacher Dashboard</h1>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/teacher'}
                className={({ isActive }) =>
                  `w-full flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-colors ${
                    isActive ? navActiveClass : navInactiveClass
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          <div className="px-4 pb-4">
            <div
              className={`flex items-center rounded-2xl border p-3 ${
                isClientTenant ? 'border-amber-100 bg-amber-50' : 'border-blue-100 bg-blue-50'
              }`}
            >
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  isClientTenant ? 'bg-amber-200' : 'bg-blue-200'
                }`}
              >
                <span className={`font-semibold text-xl ${isClientTenant ? 'text-amber-900' : 'text-blue-900'}`}>
                  {userFullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-slate-900 truncate">{userFullName}</p>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          <footer className={`mt-auto border-t px-4 py-2 ${sidebarHeaderBorder}`}>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                isClientTenant
                  ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                  : 'border-blue-200 text-blue-700 hover:bg-blue-50'
              }`}
            >
              Logout
            </button>
          </footer>
        </aside>

        <section className="flex-1 overflow-y-auto">
          <div className={`border-b px-6 py-6 backdrop-blur ${sidebarHeaderBorder} ${isClientTenant ? 'bg-white/70' : 'bg-white'}`}>
            <h2 className="text-2xl font-bold">Teacher Workspace</h2>
            <p className="text-slate-600 mt-1">Manage courses, batches, and learning progress.</p>
          </div>
          <div className="p-6">
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  );
}
