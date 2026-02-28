// src/pages/student/StudentCourseView.tsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import axios from 'axios';
import { Outlet } from 'react-router-dom';
import gvjbLogo from "/gvjb.png";
import CourseProgressBar from "@/features/courses/components/player/CourseProgressBar";
import { TbPlayerTrackPrevFilled } from "react-icons/tb";
import { TbPlayerTrackNextFilled } from "react-icons/tb";
import { GrFormNext } from "react-icons/gr";
import { MdExpandMore } from "react-icons/md";

// âœ… Updated interface with completion_status
interface ContentItem {
  id: number;
  title: string;
  item_type: 'video' | 'pdf' | 'text' | 'scorm' | 'audio' | string;
  content_url: string | null;
  //completion_status?: 'completed' | 'incomplete' | null; // âœ… ADD THIS
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
      } catch (err: unknown) {
        const msg = axios.isAxiosError(err)
          ? err.response?.data?.error || err.message || 'Failed to load course content.'
          : 'Failed to load course content.';
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_45%,_#fef9f3_100%)] text-slate-900">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="w-full border-b border-amber-100 bg-white/90 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r">
            <div className="p-6 border-b border-amber-100">
              <div className="flex items-center space-x-2 cursor-pointer">
                <img
                  src={gvjbLogo}
                  alt="GVB Logo"
                  className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
                />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-700 mt-2">
                GVB
              </p>
              <h1 className="text-lg font-semibold">Course View</h1>
            </div>
            <div className="px-4 py-3 border-b border-amber-100">
              <p className="text-sm text-slate-600">Loading course content...</p>
            </div>
            <div className="p-4 border-t border-amber-100">
              <Link
                to="/student/dashboard"
                className="w-full flex items-center justify-center rounded-full border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                â† Back
              </Link>
            </div>
          </aside>
          <section className="flex-1 p-6 flex items-center justify-center">
            <p className="text-slate-600">Loading...</p>
          </section>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_45%,_#fef9f3_100%)] text-slate-900">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="w-full border-b border-amber-100 bg-white/90 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r">
            <div className="p-6 border-b border-amber-100">
              <div className="flex items-center space-x-2 cursor-pointer">
                <img
                  src={gvjbLogo}
                  alt="GVJB Logo"
                  className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
                />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-700 mt-2">
                GVB
              </p>
              <h1 className="text-lg font-semibold">Course View</h1>
            </div>
            <div className="px-4 py-3 border-b border-amber-100">
              <p className="text-red-600">Error: {error}</p>
            </div>
            <div className="p-4 border-t border-amber-100">
              <Link
                to="/student/dashboard"
                className="w-full flex items-center justify-center rounded-full border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                â† Back
              </Link>
            </div>
          </aside>
          <section className="flex-1 p-6 flex items-center justify-center">
            <p className="text-red-600">Error: {error}</p>
          </section>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_45%,_#fef9f3_100%)] text-slate-900">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="w-full border-b border-amber-100 bg-white/90 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r">
            <div className="p-6 border-b border-amber-100">
              <div className="flex items-center space-x-2 cursor-pointer">
                <img
                  src={gvjbLogo}
                  alt="GVJB Logo"
                  className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
                />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-700 mt-2">
                GVB
              </p>
              <h1 className="text-lg font-semibold">Course View</h1>
            </div>
            <div className="px-4 py-3 border-b border-amber-100">
              <p>Course not found.</p>
            </div>
            <div className="p-4 border-t border-amber-100">
              <Link
                to="/student/dashboard"
                className="w-full flex items-center justify-center rounded-full border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                â† Back
              </Link>
            </div>
          </aside>
          <section className="flex-1 p-6 flex items-center justify-center">
            <p>Course not found.</p>
          </section>
        </div>
      </div>
    );
  }

  // âœ… Flatten all content items for navigation and progress
  const allContentItems = course.chapters.flatMap(chapter => chapter.content_items);
  const totalItems = allContentItems.length;
  const completedItems = allContentItems.filter(
    item => item.completion_status === 'completed'
  ).length;

  console.log("complete item", completedItems);

  // âœ… Mark item as completed via API
  const markItemCompleted = async (itemId: number) => {
    try {
      await api.post(`/student/item-attempt`, {
        content_item_id: itemId,
        completion_status: "completed"
      });
    } catch (err) {
      console.error("âŒ Failed to mark item completed", err);
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

    // âœ… Mark current item as completed
    await markItemCompleted(currentItem.id);

    // âœ… Optimistically update local course state
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

    // âœ… Navigate to next
    const nextItem = allContentItems[currentIndex + 1];
    navigate(`content/${nextItem.id}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_45%,_#fef9f3_100%)] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
      {/* LEFT BAR - Navigation & Progress */}
      <div className="w-full border-b border-amber-100 bg-white/90 backdrop-blur flex flex-col lg:w-72 lg:border-b-0 lg:border-r">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-amber-100">
          <div className="flex items-center space-x-2 cursor-pointer">
            <img
              src={gvjbLogo}
              alt="GVJB Logo"
              className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
            />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-700 mt-2">
            GVB
          </p>
          <h1 className="text-lg font-semibold">Course View</h1>
        </div>

        {/* âœ… PROGRESS BAR â€” placed exactly like admin panel */}
        <div className="px-4 pb-3 border-b border-amber-100">
          <CourseProgressBar completed={completedItems} total={totalItems} />
        </div>

        {/* Chapters & Content Items List */}
        <div className="flex-1 overflow-y-auto pr-2">
          {course.chapters.map((chapter) => (
            <div key={chapter.id} className="mb-3">
              {/* Chapter Header (Toggle) */}
              <div
                className="font-semibold text-lg mb-1.8 flex items-center cursor-pointer p-1 rounded hover:bg-amber-50"
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
                      className="font-semibold text-base mb-1.8 flex items-center gap-2 py-1 px-2 rounded hover:bg-amber-50 cursor-pointer"
                      onClick={() => navigate(`content/${item.id}`)}
                    >
                      {/* âœ… Completion Tick */}
                      {item.completion_status === 'completed' && (
                        <span className="text-green-500 text-sm">âœ“</span>
                      )}

                      <span className="text-sm flex-1">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-amber-100">
          <Link to="/student/dashboard" className="w-full flex items-center justify-center rounded-full border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50">
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
        <div className="p-6 border-b border-amber-100 bg-white/70 backdrop-blur">
          <div className="flex justify-between items-center">
            <div>
              {/* âœ… Dynamic title: Course â€” Chapter: Content */}
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
                className={`px-4 py-2 text-sm rounded-full border ${currentIndex <= 0
                  ? 'border-amber-100 bg-amber-50 text-amber-300 cursor-not-allowed'
                  : 'border-amber-200 text-amber-900 hover:bg-amber-50'
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
                className={`px-4 py-2 text-sm rounded-full ${currentIndex >= allContentItems.length - 1
                  ? 'bg-amber-200 text-amber-700 cursor-not-allowed'
                  : 'bg-amber-400 text-slate-900 hover:bg-amber-500'
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
        <div className="flex-1 overflow-auto bg-white/80 h-full">
          <Outlet />
        </div>
      </div>
    </div>
    </div>
  );
}


