// src/pages/student/StudentCourseView.tsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Outlet } from 'react-router-dom';
import logo from "/logo.png"; // adjust path if needed
import CourseProgressBar from "../../components/CourseContent/CourseProgressBar";
import { TbPlayerTrackPrevFilled } from "react-icons/tb";
import { TbPlayerTrackNextFilled } from "react-icons/tb";
import { GrFormNext } from "react-icons/gr";
import { MdExpandMore } from "react-icons/md";

// ✅ Updated interface with completion_status
interface ContentItem {
  id: number;
  title: string;
  item_type: 'video' | 'pdf' | 'text' | 'scorm' | 'audio' | string;
  content_url: string | null;
  //completion_status?: 'completed' | 'incomplete' | null; // ✅ ADD THIS
  completion_status?: string | null;
}

interface Chapter {
  id: number;
  title: string;
  position: number;
  content_items: ContentItem[];
}

interface CourseData {
  id: number;
  title: string;
  description: string | null;
  chapters: Chapter[];
}

export default function StudentCourseView() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!courseId) {
      setError('Invalid course ID');
      setLoading(false);
      return;
    }

    const fetchCourse = async () => {
      try {
        const res = await api.get<CourseData>(`/student/course/${courseId}`);
        setCourse(res.data);
      } catch (err: any) {
        const msg = err.response?.data?.error || 'Failed to load course content.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const toggleChapter = (chapterId: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-white border-r p-4">
          <Link to="/student/dashboard" className="text-blue-600 mb-4 inline-block">← Back</Link>
          <p>Loading course content...</p>
        </div>
        <div className="flex-1 p-6 flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-white border-r p-4">
          <Link to="/student/dashboard" className="text-blue-600 mb-4 inline-block">← Back</Link>
          <p className="text-red-600">Error: {error}</p>
        </div>
        <div className="flex-1 p-6 flex items-center justify-center">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-white border-r p-4">
          <Link to="/student/dashboard" className="text-blue-600 mb-4 inline-block">← Back</Link>
          <p>Course not found.</p>
        </div>
        <div className="flex-1 p-6 flex items-center justify-center">
          <p>Course not found.</p>
        </div>
      </div>
    );
  }

  // ✅ Flatten all content items for navigation and progress
  const allContentItems = course.chapters.flatMap(chapter => chapter.content_items);
  const totalItems = allContentItems.length;
  const completedItems = allContentItems.filter(
    item => item.completion_status === 'completed'
  ).length;

  console.log("complete item", completedItems);

  // ✅ Mark item as completed via API
  const markItemCompleted = async (itemId: number) => {
    try {
      await api.post(`/student/item-attempt`, {
        content_item_id: itemId,
        completion_status: "completed"
      });
    } catch (err) {
      console.error("❌ Failed to mark item completed", err);
    }
  };

  // Find current content ID from URL (if any)
  const currentPath = window.location.pathname;
  const contentIdMatch = currentPath.match(/\/content\/(\d+)/);
  const currentContentId = contentIdMatch ? parseInt(contentIdMatch[1]) : null;

  // Determine current chapter and content title
  let currentChapterTitle = '';
  let currentContentTitle = '';
  if (currentContentId) {
    for (const chapter of course.chapters) {
      const item = chapter.content_items.find(i => i.id === currentContentId);
      if (item) {
        currentChapterTitle = chapter.title;
        currentContentTitle = item.title;
        break;
      }
    }
  }

  // Get current index for Previous/Next
  const currentIndex = currentContentId
    ? allContentItems.findIndex(item => item.id === currentContentId)
    : -1;

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevItem = allContentItems[currentIndex - 1];
      navigate(`content/${prevItem.id}`);
    }
  };

  /*const goToNext = () => {
    if (currentIndex < allContentItems.length - 1) {
      const nextItem = allContentItems[currentIndex + 1];
      navigate(`content/${nextItem.id}`);
    }
  };*/

  const goToNext = async () => {
    if (currentIndex < 0 || currentIndex >= allContentItems.length - 1) return;

    const currentItem = allContentItems[currentIndex];

    // ✅ Mark current item as completed
    await markItemCompleted(currentItem.id);

    // ✅ Optimistically update local course state
    setCourse(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        chapters: prev.chapters.map(chapter => ({
          ...chapter,
          content_items: chapter.content_items.map(item =>
            item.id === currentItem.id
              ? { ...item, completion_status: 'completed' }
              : item
          )
        }))
      };
    });

    // ✅ Navigate to next
    const nextItem = allContentItems[currentIndex + 1];
    navigate(`content/${nextItem.id}`);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* LEFT BAR - Navigation & Progress */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 cursor-pointer">
            <img
              src={logo}
              alt="Spectropy Logo"
              className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
            />
          </div>
          <h1 className="text-lg font-semibold">Course View</h1>
        </div>

        {/* ✅ PROGRESS BAR — placed exactly like admin panel */}
        <div className="px-4 pb-3 border-b border-gray-200">
          <CourseProgressBar completed={completedItems} total={totalItems} />
        </div>

        {/* Chapters & Content Items List */}
        <div className="flex-1 overflow-y-auto pr-2">
          {course.chapters.map((chapter) => (
            <div key={chapter.id} className="mb-3">
              {/* Chapter Header (Toggle) */}
              <div
                className="font-semibold text-lg mb-1.8 flex items-center cursor-pointer  p-1 rounded"
                onClick={() => toggleChapter(chapter.id)}
              >
                <span className="mr-2">
                  {expandedChapters.has(chapter.id) ? <MdExpandMore /> : <GrFormNext />}
                </span>
                {chapter.title}
              </div>

              {/* Content Items (Only if expanded) */}
              {expandedChapters.has(chapter.id) && (
                <div className="pl-5 space-y-1.5">
                  {chapter.content_items.map((item) => (
                    <div
                      key={item.id}
                      className="font-semibold text-base mb-1.8 flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-100 cursor-pointer"
                      onClick={() => navigate(`content/${item.id}`)}
                    >
                      {/* ✅ Completion Tick */}
                      {item.completion_status === 'completed' && (
                        <span className="text-green-500 text-sm">✓</span>
                      )}

                      <span className="text-sm flex-1">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200">
          <Link to="/student/dashboard" className="w-full flex items-center justify-center px-4 py-2 text-sm text-blue-900 hover:text-blue-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to My Courses
          </Link>
        </div>
      </div>

      {/* RIGHT BAR - Content Viewer */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              {/* ✅ Dynamic title: Course — Chapter: Content */}
              {currentChapterTitle && currentContentTitle ? (
                <h1 className="text-xl font-bold">
                  {course.title} - {currentChapterTitle} : {currentContentTitle}
                </h1>
              ) : (
                <h1 className="text-2xl font-bold">{course.title}</h1>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={goToPrevious}
                disabled={currentIndex <= 0}
                className={`px-4 py-2 text-sm rounded ${currentIndex <= 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300'
                  }`}
              >
                <div className="flex items-center">
                  <TbPlayerTrackPrevFilled className="mr-1" />
                  <span>Previous</span>
                </div>
              </button>
              <button
                onClick={goToNext}
                disabled={currentIndex >= allContentItems.length - 1}
                className={`px-4 py-2 text-sm rounded ${currentIndex >= allContentItems.length - 1
                  ? 'bg-indigo-300 text-white cursor-not-allowed'
                  : 'bg-blue-900 text-white hover:bg-indigo-700'
                  }`}
              >
                <div className="flex items-center">
                  <span className="mr-1" >Next</span>
                  <TbPlayerTrackNextFilled />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-white h-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}