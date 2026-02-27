import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import Spinner from '../../shared/components/Spinner';
import ProtectedRoute from './ProtectedRoute';

// Auth pages
import LoginForm from '../../pages/auth/LoginForm';
import Courses from '../../pages/auth/courses';

// SuperAdmin
import PlatformDashboard from '../../pages/superadmin/PlatformDashboard';
import RegisterAdmin from '../../pages/superadmin/RegisterAdmin';

// Admin / Client / School
import AdminDashboard from '../../pages/admin/admindashboard';
import OrgDashboard from '../../pages/admin/OrgDashboard';
import CourseContent from '../../pages/admin/CourseContent';
import EnrollUsers from '../../pages/admin/EnrollUsers';

// Teacher
import TeacherDashboard from '../../pages/teacher/Dashboard';
import CourseContentManager from '../../pages/teacher/CourseContentManager';
import TeacherBatches from '../../pages/teacher/TeacherBatches';
import TeacherLayout from '../layouts/TeacherLayout';

// Student
import StudentDashboard from '../../pages/student/StudentDashboard';
import StudentCourseView from '../../pages/student/studentcourseview';

// Common
import ContentViewer from '../../pages/common/ContentViewer';

export default function AppRoutes() {
  const { loading } = useAuth();

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
          <ProtectedRoute allowedRoles={['super_admin']}>
            <PlatformDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/register"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <RegisterAdmin />
          </ProtectedRoute>
        }
      />

      {/* Client / School (alias routes for SaaS separation) */}
      <Route
        path="/client/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={['client_admin', 'content_authorizer']}
          >
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/school/dashboard"
        element={
          <ProtectedRoute allowedRoles={['school_owner']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              'super_admin',
              'client_admin',
              'content_authorizer',
              'school_owner',
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
              'super_admin',
              'client_admin',
              'content_authorizer',
              'school_owner',
            ]}
          >
            <CourseContent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/courses/:courseId/enroll"
        element={
          <ProtectedRoute
            allowedRoles={[
              'super_admin',
              'client_admin',
              'content_authorizer',
              'school_owner',
            ]}
          >
            <EnrollUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/org"
        element={
          <ProtectedRoute
            allowedRoles={['super_admin', 'client_admin', 'school_owner']}
          >
            <OrgDashboard />
          </ProtectedRoute>
        }
      />

      {/* Teacher */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute
            allowedRoles={[
              'super_admin',
              'client_admin',
              'school_owner',
              'teacher',
            ]}
          >
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="batches" element={<TeacherBatches />} />
        <Route path="course/:id" element={<CourseContentManager />} />
      </Route>

      {/* Student */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/course/:courseId"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentCourseView />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <div className="p-6 text-gray-500">
              Select a topic from the left to view content.
            </div>
          }
        />
        <Route path="content/:contentId" element={<ContentViewer />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
