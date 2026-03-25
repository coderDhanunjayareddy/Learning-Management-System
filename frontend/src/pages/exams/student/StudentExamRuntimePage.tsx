import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import ExamHeader from "@/features/exam-runtime/components/ExamHeader";
import SectionTabs from "@/features/exam-runtime/components/SectionTabs";
import QuestionPanel from "@/features/exam-runtime/components/QuestionPanel";
import QuestionPalette from "@/features/exam-runtime/components/QuestionPalette";
import ExamTimerBar from "@/features/exam-runtime/components/ExamTimerBar";
import ActionBar from "@/features/exam-runtime/components/ActionBar";
import ExamRuntimeErrorBoundary from "@/features/exam-runtime/components/ExamRuntimeErrorBoundary";
import { useExamRuntime } from "@/features/exam-runtime/useExamRuntime";


function StudentExamRuntimePageContent() {
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
    loadAttempt,
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

    submitLoading,
    submitError,
    setSubmitError,
    lastSubmitOutcome,
    setQuestionAnswer,
    toggleQuestionReview,
    clearResponseAndSave,
    goToPrevious,
    saveAndNext,
    markForReviewAndNext,
    jumpToQuestion,
    selectSection,
    submitCurrentAttempt,
  } = runtime;

  const [instructionAccepted, setInstructionAccepted] = useState(false);

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

  const getTrimmedHtml = (value: unknown): string => {
    if (typeof value === "string") return value.trim();
    return "";
  };

  const examInstructionsHtml = useMemo(
    () => getTrimmedHtml(runtimeData?.exam.instructions),
    [runtimeData?.exam.instructions]
  );

  const sectionInstructions = useMemo(
    () =>
      sections
        .map((section) => ({
          id: section.id,
          title: section.title,
          instructions: getTrimmedHtml(section.instructions),
        }))
        .filter((section) => section.instructions.length > 0),
    [sections]
  );

  useEffect(() => {
    setInstructionAccepted(false);
  }, [runtimeData?.attempt?.id]);

  useEffect(() => {
    if (!lastSubmitOutcome?.submitted) return;
    if (!lastSubmitOutcome.examId) return;
    navigate(`/student/exams/${lastSubmitOutcome.examId}/result`, {
      replace: true,
    });
  }, [lastSubmitOutcome, navigate]);

  const handleSubmit = async () => {
    const outcome = await submitCurrentAttempt();
    if (!outcome.submitted && outcome.message) {
      toast.error(outcome.message);
    }
  };


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
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => {
                void loadAttempt();
              }}
              className="rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate("/student/exams")}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to Exams
            </button>
          </div>
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

  if (!instructionAccepted) {
    return (
      <div className="min-h-screen bg-[#e5e5e5]">
        <header className="bg-[#2185d0] px-4 py-3 text-center">
          <h1 className="text-lg font-bold tracking-wide text-white md:text-2xl">GENERAL INSTRUCTIONS</h1>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
          <p className="text-center text-base font-semibold text-slate-700">Please read the instructions carefully</p>

          <section className="mt-5 text-sm leading-6 text-slate-800 md:text-[15px]">
            <h2 className="text-lg font-semibold text-slate-800 underline underline-offset-4">General Instructions:</h2>

            {examInstructionsHtml ? (
              <div
                className="prose prose-sm mt-3 max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: examInstructionsHtml }}
              />
            ) : (
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>
                  Total duration of exam is{" "}
                  <span className="font-semibold">
                    {runtimeData.exam.total_duration_minutes ? `${runtimeData.exam.total_duration_minutes} minutes` : "--"}.
                  </span>
                </li>
                <li>
                  The countdown timer displayed in the top-right corner shows remaining exam time. When time reaches zero,
                  the exam is auto-submitted.
                </li>
                <li>
                  Use section tabs and question palette to navigate quickly. Current attempt number:{" "}
                  <span className="font-semibold">#{runtimeData.attempt.attempt_number}</span>.
                </li>
                <li>
                  Save responses using <span className="font-semibold">Save &amp; Next</span> regularly. Mark questions
                  for review when needed.
                </li>
                <li>
                  Do not refresh or close this tab during the attempt. For this attempt you have{" "}
                  <span className="font-semibold">{questions.length}</span> questions.
                </li>
              </ol>
            )}
          </section>

          <section className="mt-6 text-sm leading-6 text-slate-800 md:text-[15px]">
            <h3 className="text-lg font-semibold text-slate-800 underline underline-offset-4">Question Palette Legend:</h3>
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-4 text-right">1.</span>
                <span className="h-6 w-6 border border-slate-400 bg-white" />
                <p>You have not visited the question yet.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 text-right">2.</span>
                <span className="h-6 w-6 bg-[#f16013]" style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }} />
                <p>You have not answered the question.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 text-right">3.</span>
                <span className="h-6 w-6 bg-[#76b82a]" />
                <p>You have answered the question.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 text-right">4.</span>
                <span className="h-6 w-6 rounded-full bg-[#7a56b8]" />
                <p>You have NOT answered the question, but have marked it for review.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 text-right">5.</span>
                <span className="relative h-6 w-6 rounded-full bg-[#6f51b7]">
                  <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-[#76b82a]" />
                </span>
                <p>The question(s) marked as Answered and Marked for Review will be considered for evaluation.</p>
              </div>
            </div>
          </section>

          {sectionInstructions.length > 0 && (
            <section className="mt-6 text-sm leading-6 text-slate-800 md:text-[15px]">
              <h3 className="text-lg font-semibold text-slate-800 underline underline-offset-4">Section Instructions:</h3>
              <div className="mt-3 space-y-4">
                {sectionInstructions.map((section) => (
                  <article key={section.id}>
                    <h4 className="font-semibold text-slate-900">{section.title}</h4>
                    <div
                      className="prose prose-sm mt-1 max-w-none text-slate-700"
                      dangerouslySetInnerHTML={{ __html: section.instructions }}
                    />
                  </article>
                ))}
              </div>
            </section>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 pt-4">
            <button
              type="button"
              onClick={() => navigate("/student/exams")}
              className="rounded border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Back to Exams
            </button>
            <button
              type="button"
              onClick={() => setInstructionAccepted(true)}
              className="rounded bg-[#2185d0] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1778c2]"
            >
              I have read the instructions, Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#ececec]">
      <ExamHeader
        examTitle={runtimeData.exam.title}
        autosaveError={autosaveError}
        focusWarning={focusWarning}
        onDismissFocusWarning={() => setFocusWarning(false)}
      />

      {submitError && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {submitError}
        </div>
      )}

      <div className=" grid min-h-0 flex-1 p-0 lg:grid-cols-[1fr_385px]">
        <div className="flex h-full min-h-0 flex-col">
          <ExamTimerBar
            remainingSeconds={remainingSeconds}
            autosaveState={autosaveState}
          />
          <SectionTabs
            sections={sections}
            activeSectionId={currentSection?.id ?? null}
            onSelect={selectSection}
          />
          <main className="min-h-0 flex-1">
            <div className="h-full overflow-y-auto p-0">
              <QuestionPanel
                question={currentQuestion}
                answer={currentAnswer}
                readOnly={readOnly || submitLoading}
                onAnswerChange={(value) => {
                  if (!currentQuestionId) return;
                  setQuestionAnswer(currentQuestionId, value);
                }}
              />
            </div>
          </main>
        </div>
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

      <div className="border-t border-slate-300 bg-[#f1f1f1] px-4 py-3">
        <ActionBar
          readOnly={readOnly || submitLoading}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onMarkReviewNext={() => {
            if (!currentQuestionId) return;
            if (!isMarkedForReview) {
              toggleQuestionReview(currentQuestionId);
            }
            void markForReviewAndNext();
          }}
          onClear={() => {
            if (!currentQuestionId) return;
            void clearResponseAndSave(currentQuestionId);
          }}
          onPrevious={goToPrevious}
          onSaveNext={() => {
            void saveAndNext();
          }}
          onSubmit={() => {
            setSubmitError(null);
            void handleSubmit();
          }}
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

export default function StudentExamRuntimePage() {
  return (
    <ExamRuntimeErrorBoundary>
      <StudentExamRuntimePageContent />
    </ExamRuntimeErrorBoundary>
  );
}




