
import { useNavigate, useParams } from "react-router-dom";
//  src/pages/admin/CourseContent.tsx

import CourseContentManager from "@/features/courses/components/editor/CourseContentManager";

export default function CourseContent() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();









  //  FETCH CONTENT + TRANSFORM INTO CHAPTER STRUCTURE


  return (
    <CourseContentManager
      courseId={courseId}
      apiPrefix="/admin"

      onBack={() => navigate("/admin/dashboard")}
    />
  );
}




