
import { useLocation, useNavigate, useParams } from "react-router-dom";
//  src/pages/admin/CourseContent.tsx

import CourseContentManager from "@/features/courses/components/editor/CourseContentManager";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getCoursePermissions } from "@/features/courses/utils/coursePermissions";

export default function CourseContent() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const coursePermissions = getCoursePermissions(user);
  const activeTab = (location.state as { activeTab?: "courses" | "home" | "users" } | null)?.activeTab;

  //  FETCH CONTENT + TRANSFORM INTO CHAPTER STRUCTURE


  return (
    <CourseContentManager
      courseId={courseId}
      apiPrefix="/admin"
      readOnly={!coursePermissions.canEdit}
      onBack={() =>
        navigate("/admin/dashboard", {
          state: { activeTab: activeTab ?? "courses" },
        })
      }
    />
  );
}




