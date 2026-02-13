// src/pages/auth/MainLoginPage.tsx
import { useNavigate } from 'react-router-dom';
import Header from "../../components/Header.tsx";

const MainLoginPage = () => {
  const navigate = useNavigate();

  const roles = [
    { id: 'super_admin', label: 'Super Admin OS', icon: '🔧', description: 'Manage system-wide settings, schools, and user access.' },
    { id: 'client_admin', label: 'Client Admin OS', icon: '🏫', description: 'Oversee courses, enrollments, and institution analytics.' },
    { id: 'content_authorizer', label: 'Content Authorizer OS', icon: '📝', description: 'Manage and publish content across the platform.' },
    { id: 'school_owner', label: 'School Owner OS', icon: '🏢', description: 'Manage schools, staff, and courses at the school level.' },
    { id: 'teacher', label: 'Teacher OS', icon: '👩‍🏫', description: 'Create courses, assign tasks, and grade student submissions.' },
    { id: 'student', label: 'Student OS', icon: '🎓', description: 'Access courses, submit assignments, and track progress.' },
  ];

  const handleRoleSelect = (role: string) => {
    navigate('/login-form', { state: { role } });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start py-6 px-4
     overflow-hidden">
      {/* Header */}
      <Header />


      {/* Main Content */}
      <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-r from-blue-50 via-white to-blue-50 border-2 border-maincolor-300 rounded-lg">

        {/* LEFT SECTION */}
        <div className="md:w-1/1 bg-maincolor text-white flex flex-col justify-center p-12 relative overflow-hidden">

          {/* Background Design */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,white,transparent)]"></div>

          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-extrabold  mb-5 leading-tight">
              Spectropy<br /> E-Learning Platform
            </h1>

            <p className="text-lg opacity-95 mb-8 leading-relaxed">
              A modern digital learning ecosystem built to empower institutions, educators,
              and learners with seamless and interactive education tools.
            </p>

            <div className="space-y-3 text-base font-medium">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎓</span> AI-Driven Smart Learning Path
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span> Advanced Student Analytics & Progress Tracking
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧠</span> Adaptive Assessments & Interactive LMS
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📚</span> Digital Classroom, Notes & Resources Library
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">✨</span> Smooth, Secure and Scalable for Institutions
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION }
        <div className="md:w-1/2 flex items-center justify-center p-10 flex-col grow-1">


          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-maincolor mb-2">Choose Your Role</h2>
            <p className="text-gray-600">Personalized portal for every user</p>
          </div>

          {/* Creative Role Cards }
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className="group p-5 rounded-2xl bg-white shadow-md border border-blue-100 
                           hover:shadow-xl transition-all hover:scale-[1.04] 
                           hover:bg-maincolor hover:text-white text-center duration-300"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                  {role.icon}
                </div>
                <h3 className="text-lg font-semibold mb-1">{role.label}</h3>
                <p className="text-sm opacity-70 group-hover:opacity-90">
                  {role.description}
                </p>
              </button>
            ))}
          </div>*/}
          

          {/* Help Link }
          <div className="mt-10 text-center text-gray-500 text-sm">
            Need help? Contact{" "}
            <a href="mailto:support@spectropy.com" className="text-blue-600 hover:underline">
              support@spectropy.com
            </a>
          </div>*/}
        {/*</div>*/}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Spectropy. All rights reserved.
      </footer>
    </div>
  );
};

export default MainLoginPage;
