// src/pages/teacher/Dashboard.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // ✅ Added useNavigate
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface Course {
  id: number;
  title: string;
  description: string | null;
  published: boolean;
  student_count: number;
}

export default function TeacherDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '' });
  const { logout } = useAuth(); 
  const navigate = useNavigate(); // ✅ Initialize navigate

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/teacher/courses');
      setCourses(res.data);
    } catch (err) {
      console.error('Failed to load courses');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/teacher/courses', {
        title: newCourse.title,
        description: newCourse.description,
        published: false
      });
      setNewCourse({ title: '', description: '' });
      setIsCreating(false);
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create course');
    }
  };

  // ✅ Handle back to login
  const handleBackToLogin = async () => {
  await logout(); // ✅ Clear auth state (token, user, etc.)
  navigate('/login', { replace: true }); // prevent back navigation to dashboard
};

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back Button at the top (or bottom — see note below) */}
      <button
        onClick={handleBackToLogin}
        className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center"
      >
        ← Back to Login
      </button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Courses</h1>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {isCreating ? 'Cancel' : 'Create New Course'}
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-4 rounded-lg shadow mb-6 border">
          <h2 className="text-lg font-semibold mb-3">Create Course</h2>
          <form onSubmit={handleCreateCourse} className="space-y-3">
            <input
              type="text"
              placeholder="Course title"
              value={newCourse.title}
              onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
              className="w-full p-2 border rounded"
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={newCourse.description}
              onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
              className="w-full p-2 border rounded"
              rows={3}
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1 text-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {courses.length === 0 ? (
        <p className="text-gray-500">You haven't created any courses yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map(course => (
            <div key={course.id} className="border rounded-lg p-5 hover:shadow-md">
              <div className="flex justify-between">
                <h2 className="text-xl font-semibold">{course.title}</h2>
                <span className={`px-2 py-1 text-xs rounded ${
                  course.published 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {course.published ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className="text-gray-600 mt-2 text-sm">
                {course.description || 'No description'}
              </p>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {course.student_count} student{course.student_count !== 1 ? 's' : ''}
                </span>

                <Link
                  to={`/teacher/course/${course.id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Manage →
                </Link>
                <Link
                 to={`/admin/courses/${course.id}/students`}
                 className="text-purple-600 hover:text-purple-800 font-medium"
                 >
                 Manage Students →
                </Link>
                {/* Publish toggle button */}
                <button
                 onClick={async () => {
                 try {
                    await api.patch(`/teacher/courses/${course.id}/publish`, {
                    published: !course.published,
                  });
                 // Optimistically update UI
                  setCourses(prev =>
                  prev.map(c =>
                  c.id === course.id ? { ...c, published: !c.published } : c
                  )
                  );
                 } catch (err: any) {
                 alert(err.response?.data?.error || 'Failed to update publish status');
                }
                }}
                className={`px-3 py-1 text-xs rounded font-medium ${
                course.published
               ? 'bg-green-600 text-white hover:bg-green-700'
               : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
               }`}
               >
               {course.published ? 'Published' : 'Publish'}
              </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}