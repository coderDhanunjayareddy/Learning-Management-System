import { useEffect, useRef, useState } from "react";
import type { CurriculumItem, DifficultyLevel, QuestionStatus, QuestionType } from "@/types/questionBank";

export interface QuestionFiltersState {
  search: string;
  programId: string;
  gradeId: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
  difficulty: "" | DifficultyLevel;
  type: "" | QuestionType;
  status: "" | QuestionStatus;
}

interface QuestionFiltersProps {
  filters: QuestionFiltersState;
  programs: CurriculumItem[];
  grades: CurriculumItem[];
  subjects: CurriculumItem[];
  chapters: CurriculumItem[];
  topics: CurriculumItem[];
  onChange: (next: QuestionFiltersState) => void;
  layout?: "grid" | "vertical";
}

export default function QuestionFilters({
  filters,
  programs,
  grades,
  subjects,
  chapters,
  topics,
  onChange,
  layout = "grid",
}: QuestionFiltersProps) {
  const isVertical = layout === "vertical";
  const [searchValue, setSearchValue] = useState(filters.search);
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (filtersRef.current.search !== searchValue) {
        onChange({ ...filtersRef.current, search: searchValue });
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchValue, onChange]);

  return (
    <div className={isVertical ? "space-y-3" : "grid gap-4 md:grid-cols-2 xl:grid-cols-8"}>
      <div className={isVertical ? "" : "md:col-span-2"}>
        <label className="text-xs font-semibold text-slate-500">Search</label>
        <input
          type="text"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search by text, tag, or author"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Program</label>
        <select
          value={filters.programId}
          onChange={(event) =>
            onChange({
              ...filters,
              programId: event.target.value,
              gradeId: "",
              subjectId: "",
              chapterId: "",
              topicId: "",
            })
          }
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="">All</option>
          {programs.map((program) => (
            <option key={program.id} value={String(program.id)}>
              {program.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Grade</label>
        <select
          value={filters.gradeId}
          onChange={(event) =>
            onChange({
              ...filters,
              gradeId: event.target.value,
              subjectId: "",
              chapterId: "",
              topicId: "",
            })
          }
          disabled={!filters.programId}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="">All</option>
          {grades.map((grade) => (
            <option key={grade.id} value={String(grade.id)}>
              {grade.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Subject</label>
        <select
          value={filters.subjectId}
          onChange={(event) =>
            onChange({
              ...filters,
              subjectId: event.target.value,
              chapterId: "",
              topicId: "",
            })
          }
          disabled={!filters.gradeId}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="">All</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={String(subject.id)}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Chapter</label>
        <select
          value={filters.chapterId}
          onChange={(event) =>
            onChange({ ...filters, chapterId: event.target.value, topicId: "" })
          }
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="">All</option>
          {chapters.map((chapter) => (
            <option key={chapter.id} value={String(chapter.id)}>
              {chapter.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Topic</label>
        <select
          value={filters.topicId}
          onChange={(event) => onChange({ ...filters, topicId: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="">All</option>
          {topics.map((topic) => (
            <option key={topic.id} value={String(topic.id)}>
              {topic.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Difficulty</label>
        <select
          value={filters.difficulty}
          onChange={(event) =>
            onChange({ ...filters, difficulty: event.target.value as QuestionFiltersState["difficulty"] })
          }
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="">All</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Type</label>
        <select
          value={filters.type}
          onChange={(event) =>
            onChange({ ...filters, type: event.target.value as QuestionFiltersState["type"] })
          }
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="">All</option>
          <option value="mcq_single">MCQ Single</option>
          <option value="mcq_multiple">MCQ Multiple</option>
          <option value="short_answer">Short Answer</option>
          <option value="numerical">Numerical</option>
          <option value="match_following">Match the Following</option>
          <option value="fill_in_blank">Fill in the Blank</option>
          <option value="true_false">True/False</option>
          <option value="comprehensive">Comprehensive</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Status</label>
        <select
          value={filters.status}
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as QuestionFiltersState["status"] })
          }
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
    </div>
  );
}
