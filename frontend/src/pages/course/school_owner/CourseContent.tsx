
import { useNavigate, useParams } from "react-router-dom";

import CourseContentManager from "@/features/courses/components/editor/CourseContentManager";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getCoursePermissions } from "@/features/courses/utils/coursePermissions";

export default function SchoolOwnerCourseContent() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const coursePermissions = getCoursePermissions(user);

  return (

    <CourseContentManager
      courseId={courseId}
      apiPrefix="/school-owner"
      readOnly={!coursePermissions.canEdit}
      onBack={() => navigate("/school-owner/courses")}
    />
  );
}

