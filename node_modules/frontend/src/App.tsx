// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth, AuthProvider } from "./contexts/AuthContext";
import { Toaster } from 'react-hot-toast';

// Auth pages
import LoginForm from './pages/auth/LoginForm';
import Courses from './pages/auth/courses';
// Dashboard pages
import SuperAdminDashboard from './pages/superadmin/RegisterAdmin';
import AdminDashboard from './pages/admin/admindashboard';
import CourseContent from './pages/admin/CourseContent';
import EnrollUsers from "./pages/admin/EnrollUsers";
import TeacherDashboard from './pages/teacher/Dashboard';
import CourseContentManager from './pages/teacher/CourseContentManager';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCourseView from './pages/student/studentcourseview';


import ContentViewer from './pages/common/ContentViewer';


// Protected Route Component
// Small spinner shown while fetching user info
function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  );
}

// ✅ Protects routes based on user role
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {

  const { user } = useAuth();

  //if (loading) {
  //   return <Spinner />;
  //}

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// ✅ Moved all routes into a separate component
function AppRoutes() {
  const { loading } = useAuth();

  // 🔹 Prevent rendering routes while loading auth data
  if (loading) return <Spinner />;

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LoginForm />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/courses" element={<Courses />} />



      <Route path="/content/:contentId" element={<ContentViewer />} />


      {/* SuperAdmin */}
      <Route
        path="/superadmin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />
      {/* Admin */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              "super_admin",
              "client_admin",
              "content_authorizer",
              "school_owner",
            ]}
          >
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/courses/:courseId/content"
        element={
          <ProtectedRoute
            allowedRoles={[
              "super_admin",
              "client_admin",
              "content_authorizer",
              "school_owner",
            ]}
          >
            <CourseContent />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/courses/:courseId/enroll" element={<EnrollUsers />} />
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              "super_admin",
              "client_admin",
              "school_owner",
            ]}
          >
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      {/* Teacher */}
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              "super_admin",
              "client_admin",
              "school_owner",
            ]}
          >
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/course/:id"
        element={
          <ProtectedRoute
            allowedRoles={[
              "super_admin",
              "client_admin",
              "school_owner",
            ]}
          >
            <CourseContentManager />
          </ProtectedRoute>
        }
      />


      {/* Student */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={["student", "teacher"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/course/:courseId"
        element={
          <ProtectedRoute allowedRoles={['student', 'teacher']}>
            <StudentCourseView />
          </ProtectedRoute>
        }
      >
        {/* Nested child routes */}
        <Route index element={<div className="p-6 text-gray-500">Select a topic from the left to view content.</div>} />
        <Route
          path="content/:contentId"
          element={<ContentViewer />}
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

// ✅ Wrap everything inside AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="bottom-right" />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
