import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import Spinner from '@/components/ui/Spinner';
import ProtectedRoute from './ProtectedRoute';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import Courses from '@/pages/course/CoursesPage';

// SuperAdmin
import PlatformDashboard from '@/pages/dashboard/superadmin/PlatformDashboard';
import RegisterAdmin from '@/pages/dashboard/superadmin/RegisterAdmin';
import ClientsPage from '@/pages/dashboard/superadmin/ClientsPage';
import PacksPage from '@/pages/dashboard/superadmin/PacksPage';
import EntitlementsPage from '@/pages/dashboard/superadmin/EntitlementsPage';
import UsersPage from '@/pages/dashboard/superadmin/UsersPage';
import PermissionsPage from '@/pages/dashboard/superadmin/PermissionsPage';

// Admin / Client / School
import AdminDashboard from '@/pages/dashboard/admin/admindashboard';
import OrgDashboard from '@/pages/dashboard/admin/OrgDashboard';
import CourseContent from '@/pages/course/admin/CourseContent';
import EnrollUsers from '@/pages/course/admin/EnrollUsers';

// Teacher
import TeacherDashboard from '@/pages/dashboard/teacher/Dashboard';

// Student
import StudentDashboard from '@/pages/dashboard/student/StudentDashboard';
import StudentCourseView from '@/pages/course/student/StudentCourseView';

// Common
import ContentViewer from '@/features/courses/components/player/ContentViewer';
import Unauthorized from '@/pages/auth/Unauthorized';
import ContentAuthorizerProfile from '@/pages/dashboard/content_authorizer/Profile';
import ContentAuthorizerCourseContent from '@/pages/course/content_authorizer/CourseContent';
import ContentAuthorizerCourses from '@/pages/dashboard/content_authorizer/Courses';
import ContentAuthorizerDashboard from '@/pages/dashboard/content_authorizer/Dashboard';
import SchoolOwnerProfile from '@/pages/dashboard/school_owner/Profile';
import SchoolOwnerCourseContent from '@/pages/course/school_owner/CourseContent';
import SchoolOwnerCourses from '@/pages/dashboard/school_owner/Courses';
import SchoolOwnerDashboard from '@/pages/dashboard/school_owner/Dashboard';
import AdminProfile from '@/pages/dashboard/admin/Profile';
import TeacherCourseContent from '@/pages/course/teacher/CourseContent';
import TeacherProfile from '@/pages/dashboard/teacher/Profile';
import TeacherHome from '@/pages/dashboard/teacher/TeacherHome';
import QuestionBankPage from '@/pages/questions/QuestionBankPage';
import QuestionCreatePage from '@/pages/questions/QuestionCreatePage';
import QuestionEditPage from '@/pages/questions/QuestionEditPage';
import QuestionDeletePage from '@/pages/questions/QuestionDeletePage';
import QuestionBulkUploadPage from '@/pages/questions/QuestionBulkUploadPage';
import QuestionSubjectsPage from '@/pages/questions/QuestionSubjectsPage';
import QuestionSubjectCreatePage from '@/pages/questions/QuestionSubjectCreatePage';
import QuestionSubjectEditPage from '@/pages/questions/QuestionSubjectEditPage';
import QuestionFoldersPage from '@/pages/questions/QuestionFoldersPage';
import QuestionFolderCreatePage from '@/pages/questions/QuestionFolderCreatePage';
import QuestionFolderEditPage from '@/pages/questions/QuestionFolderEditPage';

export default function AppRoutes() {
  const { loading } = useAuth();

  if (loading) return <Spinner />;

  // Helper to group protected routes and reduce repetition
  const Protect = ({ roles }: { roles: string[] }) => (
    <ProtectedRoute allowedRoles={roles as any}>
      <Outlet />
    </ProtectedRoute>
  );

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/content/:contentId" element={<ContentViewer />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* SuperAdmin */}
      <Route element={<Protect roles={['super_admin']} />}>
        <Route path="/superadmin/dashboard" element={<PlatformDashboard />} />
        <Route path="/superadmin/clients" element={<ClientsPage />} />
        <Route path="/superadmin/packs" element={<PacksPage />} />
        <Route path="/superadmin/entitlements" element={<EntitlementsPage />} />
        <Route path="/superadmin/users" element={<UsersPage />} />
        <Route path="/superadmin/permissions" element={<PermissionsPage />} />
        <Route path="/superadmin/register" element={<RegisterAdmin />} />
      </Route>

      {/* Client / School (alias routes for SaaS separation) 
      <Route element={<Protect roles={['client_admin', 'content_authorizer']} />}>
        <Route path="/client/dashboard" element={<AdminDashboard />} />
      </Route>
      <Route element={<Protect roles={['school_owner']} />}>
        <Route path="/school/dashboard" element={<AdminDashboard />} />
      </Route>*/}

      {/* Admin */}
      <Route element={<Protect roles={['super_admin', 'client_admin', 'content_authorizer', 'school_owner']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/courses/:courseId/content" element={<CourseContent />} />
        <Route path="/admin/courses/:courseId/enroll" element={<EnrollUsers />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>

      <Route element={<Protect roles={['super_admin', 'client_admin', 'school_owner']} />}>
        <Route path="/admin/org" element={<OrgDashboard />} />
      </Route>

      {/* Content Authorizer */}
      <Route element={<Protect roles={['content_authorizer', 'super_admin']} />}>
        <Route path="/content-authorizer/dashboard" element={<ContentAuthorizerDashboard />} />
        <Route path="/content-authorizer/courses" element={<ContentAuthorizerCourses />} />
        <Route path="/content-authorizer/courses/:courseId/content" element={<ContentAuthorizerCourseContent />} />
        <Route path="/content-authorizer/profile" element={<ContentAuthorizerProfile />} />
      </Route>

      {/* School Owner */}
      <Route element={<Protect roles={['school_owner', 'client_admin', 'super_admin']} />}>
        <Route path="/school-owner/dashboard" element={<SchoolOwnerDashboard />} />
        <Route path="/school-owner/courses" element={<SchoolOwnerCourses />} />
        <Route path="/school-owner/courses/:courseId/content" element={<SchoolOwnerCourseContent />} />
        <Route path="/school-owner/profile" element={<SchoolOwnerProfile />} />
      </Route>

      {/* Teacher */}
      <Route element={<Protect roles={['super_admin', 'client_admin', 'school_owner', 'teacher']} />}>

        <Route path="/teacher" element={<TeacherHome />} />
        <Route path="/teacher/dashboard" element={<TeacherHome />} />
        <Route path="/teacher/courses" element={<TeacherDashboard />} />
        <Route path="/teacher/profile" element={<TeacherProfile />} />
        <Route path="/teacher/courses/:courseId/content" element={<TeacherCourseContent />} />
      </Route>

      {/* Student */}
      <Route element={<Protect roles={['student']} />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/course/:courseId" element={<StudentCourseView />}>
          <Route index element={<div className="p-6 text-gray-500">Select a topic from the left to view content.</div>} />
          <Route path="content/:contentId" element={<ContentViewer />} />
        </Route>
      </Route>

      {/* Question Bank */}
      <Route
        element={
          <Protect
            roles={[
              'super_admin',
              'client_admin',
              'content_authorizer',
              'school_owner',
              'teacher',
              'student',
            ]}
          />
        }
      >
        <Route path="/question-bank" element={<QuestionBankPage />} />
        <Route path="/question-bank/new" element={<QuestionCreatePage />} />
        <Route path="/question-bank/:id/edit" element={<QuestionEditPage />} />
        <Route path="/question-bank/:id/delete" element={<QuestionDeletePage />} />
        <Route path="/question-bank/bulk-upload" element={<QuestionBulkUploadPage />} />
        <Route path="/question-bank/subjects" element={<QuestionSubjectsPage />} />
        <Route path="/question-bank/subjects/new" element={<QuestionSubjectCreatePage />} />
        <Route path="/question-bank/subjects/:id/edit" element={<QuestionSubjectEditPage />} />
        <Route path="/question-bank/folders" element={<QuestionFoldersPage />} />
        <Route path="/question-bank/folders/new" element={<QuestionFolderCreatePage />} />
        <Route path="/question-bank/folders/:id/edit" element={<QuestionFolderEditPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />




    </Routes>
  );
}


