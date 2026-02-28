import { useNavigate, useParams } from "react-router-dom";
import CourseContentManager from "../../components/CourseContent/CourseContentManager";

export default function ContentAuthorizerCourseContent() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();


  return (
    <CourseContentManager
      courseId={courseId}
      apiPrefix="/admin"
      onBack={() => navigate("/content-authorizer/courses")}
    />
  );
}
