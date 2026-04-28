import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import { formatSubjectDisplay, type CurriculumItem } from "@/types/questionBank";

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.subject_id,
      name: item.name ?? item.title ?? item.subject_name ?? "Untitled",
      code: item.code ?? null,
      grade_number: item.grade_number ?? item.gradeNumber ?? null,
      subject_id: item.subject_id ?? null,
      chapter_id: item.chapter_id ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

export default function QuestionSubjectsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const state = location.state as
      | { createdSubject?: CurriculumItem; updatedSubject?: CurriculumItem }
      | null;
    if (state?.createdSubject) {
      setSubjects((prev) => [state.createdSubject as CurriculumItem, ...prev]);
    }
    if (state?.updatedSubject) {
      setSubjects((prev) =>
        prev.map((item) =>
          String(item.id) === String(state.updatedSubject?.id)
            ? (state.updatedSubject as CurriculumItem)
            : item
        )
      );
    }
    if (state) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const loadSubjects = async () => {
      setLoading(true);
      try {
        const res = await api.get("/subjects");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        if (payload.length) {
          setSubjects(normalizeCurriculum(payload));
        }
      } catch {
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };
    loadSubjects();
  }, []);

  return (
    <QuestionBankLayout
      title="Subjects"
      description="Manage subject catalogs for question classification."
      actions={
        <button
          onClick={() => navigate("/question-bank/subjects/new")}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Add Subject
        </button>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Loading subjects...</div>
        ) : (
          <div className="space-y-3">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900">
                      {subject.name}
                    </div>
                    {subject.grade_number !== undefined && subject.grade_number !== null && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                        Grade {subject.grade_number}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatSubjectDisplay(subject, { includeId: true })}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/question-bank/subjects/${subject.id}/edit`)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
              </div>
            ))}
            {subjects.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No subjects yet. Add your first subject to get started.
              </div>
            )}
          </div>
        )}
      </div>
    </QuestionBankLayout>
  );
}
