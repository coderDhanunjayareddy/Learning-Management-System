import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import ExamHeader from "@/features/exam-runtime/components/ExamHeader";
import SectionTabs from "@/features/exam-runtime/components/SectionTabs";
import QuestionPanel from "@/features/exam-runtime/components/QuestionPanel";
import QuestionPalette from "@/features/exam-runtime/components/QuestionPalette";
import ActionBar from "@/features/exam-runtime/components/ActionBar";
import { useExamRuntime } from "@/features/exam-runtime/useExamRuntime";

export default function StudentExamRuntimePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = useParams<{ attemptId: string }>();
  const attemptId = Number(params.attemptId);

  const invalidAttemptId = !Number.isInteger(attemptId) || attemptId <= 0;

  const runtime = useExamRuntime({ attemptId: invalidAttemptId ? 0 : attemptId });

  const {
    loading,
    error,
    unsupportedData,
    runtime: runtimeData,
    questions,
    sections,
    currentQuestion,
    currentQuestionId,
    currentQuestionIndex,
    currentSection,
    readOnly,
    answersByQuestionId,
    reviewByQuestionId,
    paletteStateByQuestionId,
    autosaveState,
    autosaveError,
    remainingSeconds,
    paletteOpen,
    setPaletteOpen,
    focusWarning,
    setFocusWarning,
    submitRequested,
    setSubmitRequested,
    setQuestionAnswer,
    toggleQuestionReview,
    clearQuestionAnswer,
    goToPrevious,
    saveAndNext,
    jumpToQuestion,
    selectSection,
  } = runtime;

  const hasPrevious = currentQuestionIndex > 0;
  const hasNext = currentQuestionIndex >= 0 && currentQuestionIndex < questions.length - 1;

  const currentAnswer = currentQuestionId ? answersByQuestionId[currentQuestionId] ?? null : null;
  const isMarkedForReview = currentQuestionId ? Boolean(reviewByQuestionId[currentQuestionId]) : false;

  const activeSectionTitle = currentSection?.title ?? "Section";
  const studentName = user?.full_name ?? "Student";

  const allQuestionIds = useMemo(() => questions.map((question) => question.id), [questions]);
  const sectionQuestions = useMemo(
    () => (currentSection ? questions.filter((question) => question.section_id === currentSection.id) : questions),
    [questions, currentSection]
  );

  const submitHookMessage = useMemo(() => {
    if (!submitRequested) return null;
    return "Submit confirmation hook reached. Final submit API integration is intentionally pending in MVP scope.";
  }, [submitRequested]);

  if (invalidAttemptId) {
    return (
      <div className="min-h-screen bg-slate-100 px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-700">Invalid attempt id</h1>
          <button
            type="button"
            onClick={() => navigate("/student/exams")}
            className="mt-4 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">Loading exam attempt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-700">Unable to load attempt</h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/student/exams")}
            className="mt-4 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  if (unsupportedData || !runtimeData || !questions.length) {
    return (
      <div className="min-h-screen bg-slate-100 px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-semibold text-amber-900">Runtime data not supported</h1>
          <p className="mt-2 text-sm text-amber-800">
            This attempt payload does not contain full question content required for the exam runtime screen.
          </p>
          <button
            type="button"
            onClick={() => navigate("/student/exams")}
            className="mt-4 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#ececec]">
      <ExamHeader
        examTitle={runtimeData.exam.title}
        remainingSeconds={remainingSeconds}
        autosaveState={autosaveState}
        autosaveError={autosaveError}
        focusWarning={focusWarning}
        onDismissFocusWarning={() => setFocusWarning(false)}
      />

      <SectionTabs
        sections={sections}
        activeSectionId={currentSection?.id ?? null}
        onSelect={selectSection}
      />

      {submitHookMessage && (
        <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-800">
          {submitHookMessage}
          <button
            type="button"
            onClick={() => setSubmitRequested(false)}
            className="ml-3 rounded border border-indigo-300 px-2 py-0.5 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 p-0">
        <div className="grid h-full min-h-0 lg:grid-cols-[1fr_385px]">
          <main className="min-h-0 ">
            <div className="h-full overflow-y-auto p-0">
              <QuestionPanel
                question={currentQuestion}
                answer={currentAnswer}
                readOnly={readOnly}
                onAnswerChange={(value) => {
                  if (!currentQuestionId) return;
                  setQuestionAnswer(currentQuestionId, value);
                }}
              />
            </div>
          </main>

          <aside className="hidden min-h-0 lg:block">
            <div className="h-full overflow-y-auto p-0">
              <QuestionPalette
                questions={sectionQuestions}
                allQuestionIds={allQuestionIds}
                currentSectionTitle={activeSectionTitle}
                studentName={studentName}
                currentQuestionId={currentQuestionId}
                statusByQuestionId={paletteStateByQuestionId}
                onJump={jumpToQuestion}
              />
            </div>
          </aside>
        </div>
      </div>

      <div className="border-t border-slate-300 bg-[#f1f1f1] px-4 py-3">
        <ActionBar
          readOnly={readOnly}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onMarkReviewNext={() => {
            if (!currentQuestionId) return;
            if (!isMarkedForReview) {
              toggleQuestionReview(currentQuestionId);
            }
            if (!hasNext) return;
            const nextQuestion = questions[currentQuestionIndex + 1];
            if (nextQuestion) {
              jumpToQuestion(nextQuestion.id);
            }
          }}
          onClear={() => {
            if (!currentQuestionId) return;
            clearQuestionAnswer(currentQuestionId);
          }}
          onPrevious={goToPrevious}
          onSaveNext={() => {
            void saveAndNext();
          }}
          onSubmit={() => setSubmitRequested(true)}
        />
      </div>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="fixed bottom-24 right-4 z-20 rounded bg-[#2185d0] px-4 py-2 text-sm font-semibold text-white shadow-lg lg:hidden"
      >
        Question Palette
      </button>

      {paletteOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setPaletteOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full  max-w-[92vw] overflow-y-auto bg-[#e9eef2]"
            onClick={(event) => event.stopPropagation()}
          >
            <QuestionPalette
              questions={sectionQuestions}
              allQuestionIds={allQuestionIds}
              currentSectionTitle={activeSectionTitle}
              studentName={studentName}
              currentQuestionId={currentQuestionId}
              statusByQuestionId={paletteStateByQuestionId}
              onJump={(questionId) => {
                jumpToQuestion(questionId);
                setPaletteOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
