import type { PaletteQuestionState, RuntimeQuestion } from "@/features/exam-runtime/types";

interface QuestionPaletteProps {
  questions: RuntimeQuestion[];
  allQuestionIds: number[];
  currentSectionTitle: string;
  studentName: string;
  currentQuestionId: number | null;
  statusByQuestionId: Record<number, PaletteQuestionState>;
  onJump: (questionId: number) => void;
}

const paletteClassMap: Record<PaletteQuestionState, string> = {
  answered: "bg-[#76b82a] text-white border-[#6aa421]",
  visited: "bg-[#f16013] text-white border-[#d64e05]",
  review: "bg-[#7a56b8] text-white border-[#6c49aa]",
  not_visited: "bg-[#e4e7eb] text-slate-700 border-slate-300",
  answered_review: "bg-[#6f51b7] text-white border-[#5f42a5]",
};

export default function QuestionPalette({
  questions,
  allQuestionIds,
  currentSectionTitle,
  studentName,
  currentQuestionId,
  statusByQuestionId,
  onJump,
}: QuestionPaletteProps) {
  const counts = allQuestionIds.reduce(
    (acc, questionId) => {
      const state = statusByQuestionId[questionId] ?? "not_visited";
      if (state === "answered") acc.answered += 1;
      if (state === "visited") acc.notAnswered += 1;
      if (state === "review") acc.marked += 1;
      if (state === "not_visited") acc.notVisited += 1;
      if (state === "answered_review") acc.answeredReview += 1;
      return acc;
    },
    { answered: 0, notAnswered: 0, marked: 0, notVisited: 0, answeredReview: 0 }
  );

  const legendRow = (count: number, label: string, className: string, rounded: string = "rounded-md") => (
    <div className="flex items-center gap-3">
      <span className={`inline-flex h-10 w-10 items-center justify-center ${rounded} border text-sm font-semibold ${className}`}>
        {count}
      </span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
  );

  return (
    <aside className="flex h-full flex-col overflow-hidden border border-slate-400 bg-[#f5dcdc] shadow-sm">
      <div className="flex items-center justify-center gap-4 border-b border-slate-300 bg-white px-4 py-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#b6d06e] text-4xl font-bold text-[#34506d]">
          {studentName.trim().charAt(0).toUpperCase() || "S"}
        </div>
        <p className="max-w-[180px] truncate text-2xl font-semibold text-slate-900">{studentName}</p>
      </div>

      <div className="space-y-3 border-b border-slate-300 bg-white px-4 py-4">
        {legendRow(counts.answered, "Answered", "bg-[#76b82a] text-white border-[#6aa421]", "rounded-md")}
        {legendRow(counts.notAnswered, "Not Answered", "bg-[#f16013] text-white border-[#d64e05]", "rounded-md")}
        {legendRow(counts.marked, "Marked", "bg-[#7a56b8] text-white border-[#6c49aa]", "rounded-full")}
        {legendRow(counts.notVisited, "Not Visited", "bg-[#e4e7eb] text-slate-700 border-slate-300", "rounded-md")}
        {legendRow(
          counts.answeredReview,
          "Answered & Marked for Review",
          "bg-[#6f51b7] text-white border-[#5f42a5]",
          "rounded-full"
        )}
      </div>

      <div className="border-b border-slate-300 bg-[#4f86c6] px-4 py-2 text-xl font-semibold uppercase text-white">
        {currentSectionTitle}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#dcecf5] p-4">
        <p className="mb-3 text-lg font-semibold text-slate-800">Choose a question</p>
        <div className="grid grid-cols-4 gap-3">
          {questions.map((question, index) => {
            const state = statusByQuestionId[question.id] ?? "not_visited";
            const isCurrent = currentQuestionId === question.id;

            return (
              <button
                key={question.id}
                type="button"
                onClick={() => onJump(question.id)}
                className={`h-14 border text-xl font-semibold shadow-sm transition-colors ${isCurrent
                    ? "border-[#d64e05] bg-[#f16013] text-white ring-2 ring-orange-300"
                    : `${paletteClassMap[state]}`
                  }`}
                style={isCurrent ? { clipPath: "polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%, 0 50%)" } : undefined}
                title={`Question ${index + 1}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

