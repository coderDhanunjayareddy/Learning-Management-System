import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CourseContentManager from "../../components/CourseContent/CourseContentManager";

type ContentItem = {
  id: number;
  course_id: number;
  parent_id: number | null;
  item_type: string;
  title: string;
  content_url?: string | null;
  order_index: number;
  created_at: string;
  completion_status?: string | null;
};

const buildPlaceholderContent = (courseId: number): ContentItem[] => [
  {
    id: 1,
    course_id: courseId,
    parent_id: null,
    item_type: "folder",
    title: "Unit 1: Orientation",
    order_index: 1,
    created_at: "2024-01-01",
  },
  {
    id: 2,
    course_id: courseId,
    parent_id: 1,
    item_type: "link",
    title: "Course Overview",
    content_url: "https://example.com",
    order_index: 1,
    created_at: "2024-01-01",
  },
  {
    id: 3,
    course_id: courseId,
    parent_id: 1,
    item_type: "link",
    title: "Syllabus",
    content_url: "https://example.com",
    order_index: 2,
    created_at: "2024-01-01",
  },
  {
    id: 4,
    course_id: courseId,
    parent_id: null,
    item_type: "folder",
    title: "Unit 2: Resources",
    order_index: 2,
    created_at: "2024-01-01",
  },
  {
    id: 5,
    course_id: courseId,
    parent_id: 4,
    item_type: "link",
    title: "Lesson Links",
    content_url: "https://example.com",
    order_index: 1,
    created_at: "2024-01-01",
  },
];

export default function TeacherCourseContent() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const numericCourseId = Number(courseId) || 0;
  const placeholderItems = useMemo(
    () => buildPlaceholderContent(numericCourseId),
    [numericCourseId]
  );





  return (
    <CourseContentManager
      courseId={courseId}
      apiPrefix="/admin"
      readOnly
      disableFetch
      initialItems={placeholderItems}
      onBack={() => navigate("/teacher/courses")}
    />
  );
}
