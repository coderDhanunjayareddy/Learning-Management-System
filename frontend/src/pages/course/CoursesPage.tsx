// app/courses/page.tsx
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { resolveApiBaseUrl } from '@/lib/apiBaseUrl';

interface Course {
  id: number;
  title: string;
  description: string | null;
  published: boolean | null;
  created_at: string;
}

const API_BASE = resolveApiBaseUrl();


export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const url = API_BASE
      ? `${API_BASE}/api/course/courses`
      : '/api/course/courses';

    fetch(url) // ← removed /admin
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setCourses(data);
        } else {
          console.error('Unexpected response format:', data);
          setCourses([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load courses:', err);
        setCourses([]); // fallback to empty array
      });
  }, []);

  // Filter to show only published courses
  const publishedCourses = courses.filter(course => course.published === true);

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)} // or navigate('/student/dashboard') for specific route
          className="flex items-center text-gray-700 hover:text-gray-900 transition-colors"
          aria-label="Go back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0L2.586 11l5.707-5.707a1 1 0 011.414 1.414L5.414 11l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">Available Courses</h1>
      </div>

      {publishedCourses.length === 0 ? (
        <p>No published courses available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {publishedCourses.map((course) => (
            <div
              key={course.id}
              className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <h2 className="font-bold text-lg text-gray-900 mb-3 line-clamp-3">
                {course.title.toUpperCase()}
              </h2>
              {course.description ? (
                <p
                  className="text-gray-700 text-sm mb-3 line-clamp-3"
                  title={course.description} // ✅ Full text on hover
                >
                  {course.description}
                </p>
              ) : (
                <p className="text-gray-500 text-sm mb-3 italic">No description</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
