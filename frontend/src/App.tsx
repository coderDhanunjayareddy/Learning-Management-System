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
import TeacherHome from './pages/teacher/TeacherHome';
import TeacherCourseContent from './pages/teacher/CourseContent';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCourseView from './pages/student/studentcourseview';
import ContentAuthorizerDashboard from './pages/content_authorizer/Dashboard';
import ContentAuthorizerCourses from './pages/content_authorizer/Courses';
import ContentAuthorizerProfile from './pages/content_authorizer/Profile';
import ContentAuthorizerCourseContent from './pages/content_authorizer/CourseContent';
import SchoolOwnerDashboard from './pages/school_owner/Dashboard';
import SchoolOwnerCourses from './pages/school_owner/Courses';
import SchoolOwnerProfile from './pages/school_owner/Profile';
import SchoolOwnerCourseContent from './pages/school_owner/CourseContent';
import TeacherProfile from './pages/teacher/Profile';
import AdminProfile from './pages/admin/Profile';


import ContentViewer from './pages/common/ContentViewer';
import NotFound from './pages/common/NotFound';
import Unauthorized from './pages/common/Unauthorized';


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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
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
      <Route path="/unauthorized" element={<Unauthorized />} />


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

      {/* Content Authorizer */}
      <Route
        path="/content-authorizer/dashboard"
        element={
          <ProtectedRoute allowedRoles={["content_authorizer", "super_admin"]}>
            <ContentAuthorizerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/content-authorizer/courses"
        element={
          <ProtectedRoute allowedRoles={["content_authorizer", "super_admin"]}>
            <ContentAuthorizerCourses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/content-authorizer/courses/:courseId/content"
        element={
          <ProtectedRoute allowedRoles={["content_authorizer", "super_admin"]}>
            <ContentAuthorizerCourseContent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/content-authorizer/profile"
        element={
          <ProtectedRoute allowedRoles={["content_authorizer", "super_admin"]}>
            <ContentAuthorizerProfile />
          </ProtectedRoute>
        }
      />

      {/* School Owner */}
      <Route
        path="/school-owner/dashboard"
        element={
          <ProtectedRoute allowedRoles={["school_owner", "client_admin", "super_admin"]}>
            <SchoolOwnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/school-owner/courses"
        element={
          <ProtectedRoute allowedRoles={["school_owner", "client_admin", "super_admin"]}>
            <SchoolOwnerCourses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/school-owner/courses/:courseId/content"
        element={
          <ProtectedRoute allowedRoles={["school_owner", "client_admin", "super_admin"]}>
            <SchoolOwnerCourseContent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/school-owner/profile"
        element={
          <ProtectedRoute allowedRoles={["school_owner", "client_admin", "super_admin"]}>
            <SchoolOwnerProfile />
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
        path="/admin/profile"
        element={
          <ProtectedRoute
            allowedRoles={[
              "super_admin",
              "client_admin",
              "content_authorizer",
              "school_owner",
            ]}
          >
            <AdminProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              "super_admin",
              "client_admin",
              "school_owner",
              "teacher",
            ]}
          >
            <TeacherHome />
          </ProtectedRoute>
        }
      />

      {/* Teacher */}
      <Route
        path="/teacher/courses"
        element={
          <ProtectedRoute
            allowedRoles={[
              "super_admin",
              "client_admin",
              "school_owner",
              "teacher",
            ]}
          >
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/profile"
        element={
          <ProtectedRoute
            allowedRoles={[
              "super_admin",
              "client_admin",
              "school_owner",
              "teacher",
            ]}
          >
            <TeacherProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/courses/:courseId/content"
        element={
          <ProtectedRoute
            allowedRoles={[
              "super_admin",
              "client_admin",
              "school_owner",
              "teacher",
            ]}
          >
            <TeacherCourseContent />
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
      <Route path="*" element={<NotFound />} />
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
