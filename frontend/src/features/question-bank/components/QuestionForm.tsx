import { useEffect, useMemo, useState } from "react";
import type {
  CorrectAnswer,
  CurriculumItem,
  Question,
  QuestionOption,
  QuestionType,
} from "@/types/questionBank";
import RichTextEditor from "@/components/ui/RichTextEditor";

interface QuestionFormProps {
  open?: boolean;
  variant?: "modal" | "page";
  initialQuestion?: Question | null;
  subjects: CurriculumItem[];
  chapters: CurriculumItem[];
  topics: CurriculumItem[];
  onClose: () => void;
  onSave: (payload: Omit<Question, "id">, isEdit: boolean) => void;
}

const makeId = () => `opt-${Math.random().toString(36).slice(2, 8)}`;

const makeDefaultOptions = () =>
  Array.from({ length: 4 }).map(() => ({ id: makeId(), text: "" }));

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "").trim();

export default function QuestionForm({
  open = true,
  variant = "page",
  initialQuestion,
  subjects,
  chapters,
  topics,
  onClose,
  onSave,
}: QuestionFormProps) {
  const [questionType, setQuestionType] = useState<QuestionType>("mcq_single");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<QuestionOption[]>(makeDefaultOptions());
  const [correctAnswer, setCorrectAnswer] = useState<CorrectAnswer>(null);
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState<Question["difficulty_level"]>("easy");
  const [marksPositive, setMarksPositive] = useState(4);
  const [marksNegative, setMarksNegative] = useState(1);
  const [tags, setTags] = useState("");

  const availableChapters = useMemo(
    () => chapters.filter((chapter) => !subjectId || String(chapter.subject_id) === subjectId),
    [chapters, subjectId]
  );
  const availableTopics = useMemo(
    () => topics.filter((topic) => !chapterId || String(topic.chapter_id) === chapterId),
    [topics, chapterId]
  );

  useEffect(() => {
    if (!open) return;
    if (initialQuestion) {
      setQuestionType(initialQuestion.question_type);
      setQuestionText(initialQuestion.question_text);
      setOptions(initialQuestion.options?.length ? initialQuestion.options : makeDefaultOptions());
      setCorrectAnswer(initialQuestion.correct_answer ?? null);
      setSubjectId(initialQuestion.subject_id ? String(initialQuestion.subject_id) : "");
      setChapterId(initialQuestion.chapter_id ? String(initialQuestion.chapter_id) : "");
      setTopicId(initialQuestion.topic_id ? String(initialQuestion.topic_id) : "");
      setDifficulty(initialQuestion.difficulty_level);
      setMarksPositive(initialQuestion.marks_positive);
      setMarksNegative(initialQuestion.marks_negative);
      setTags(initialQuestion.exam_tags?.join(", ") ?? "");
      return;
    }
    setQuestionType("mcq_single");
    setQuestionText("");
    setOptions(makeDefaultOptions());
    setCorrectAnswer(null);
    setSubjectId("");
    setChapterId("");
    setTopicId("");
    setDifficulty("easy");
    setMarksPositive(4);
    setMarksNegative(1);
    setTags("");
  }, [open, initialQuestion]);

  const handleTypeChange = (nextType: QuestionType) => {
    setQuestionType(nextType);
    if (nextType === "mcq_single" || nextType === "mcq_multiple") {
      if (options.length === 0) setOptions(makeDefaultOptions());
      if (nextType === "mcq_single" && Array.isArray(correctAnswer)) {
        setCorrectAnswer(correctAnswer[0] ?? null);
      }
      if (nextType === "mcq_multiple" && typeof correctAnswer === "string") {
        setCorrectAnswer(correctAnswer ? [correctAnswer] : []);
      }
    } else if (nextType === "true_false") {
      setCorrectAnswer(true);
    } else if (nextType === "numerical") {
      setCorrectAnswer(null);
    }
  };

  const updateOptionText = (id: string, value: string) => {
    setOptions((prev) => prev.map((option) => (option.id === id ? { ...option, text: value } : option)));
  };

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((option) => option.id !== id));
    if (questionType === "mcq_single" && correctAnswer === id) {
      setCorrectAnswer(null);
    }
    if (questionType === "mcq_multiple" && Array.isArray(correctAnswer)) {
      setCorrectAnswer(correctAnswer.filter((optionId) => optionId !== id));
    }
  };

  const toggleMultiCorrect = (id: string) => {
    setCorrectAnswer((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      if (next.includes(id)) return next.filter((opt) => opt !== id);
      next.push(id);
      return next;
    });
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripHtml(questionText)) {
      alert("Question text is required.");
      return;
    }

    if (
      (questionType === "mcq_single" || questionType === "mcq_multiple") &&
      options.some((option) => !stripHtml(option.text))
    ) {
      alert("All options must have text.");
      return;
    }

    const parsedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const finalOptions =
      questionType === "mcq_single" || questionType === "mcq_multiple"
        ? options.map((option) => ({
            ...option,
            is_correct:
              questionType === "mcq_single"
                ? option.id === correctAnswer
                : Array.isArray(correctAnswer)
                ? correctAnswer.includes(option.id)
                : false,
          }))
        : undefined;

    onSave(
      {
        question_type: questionType,
        question_text: questionText.trim(),
        options: finalOptions,
        correct_answer: correctAnswer ?? null,
        subject_id: subjectId || null,
        chapter_id: chapterId || null,
        topic_id: topicId || null,
        difficulty_level: difficulty,
        marks_positive: Number(marksPositive) || 0,
        marks_negative: Number(marksNegative) || 0,
        exam_tags: parsedTags,
        created_by: initialQuestion?.created_by,
        created_at: initialQuestion?.created_at,
        status: initialQuestion?.status ?? "draft",
        review_note: initialQuestion?.review_note,
      },
      Boolean(initialQuestion)
    );
  };

  if (!open) return null;

  const formContent = (
    <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Question Type</label>
              <select
                value={questionType}
                onChange={(event) => handleTypeChange(event.target.value as QuestionType)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="mcq_single">MCQ Single</option>
                <option value="mcq_multiple">MCQ Multiple</option>
                <option value="numerical">Numerical</option>
                <option value="true_false">True/False</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Difficulty</label>
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as Question["difficulty_level"])}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Question Text</label>
            <div className="mt-2">
              <RichTextEditor
                value={questionText}
                onChange={setQuestionText}
                placeholder="Enter the question text"
                height={200}
              />
            </div>
          </div>

          {(questionType === "mcq_single" || questionType === "mcq_multiple") && (
            <div>
              <label className="text-xs font-semibold text-slate-500">Options</label>
              <div className="mt-2 space-y-3">
                {options.map((option, index) => (
                  <div key={option.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
                    {questionType === "mcq_single" ? (
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <input
                          type="radio"
                          name="correct"
                          checked={correctAnswer === option.id}
                          onChange={() => setCorrectAnswer(option.id)}
                        />
                        Mark as correct
                      </label>
                    ) : (
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <input
                          type="checkbox"
                          checked={Array.isArray(correctAnswer) && correctAnswer.includes(option.id)}
                          onChange={() => toggleMultiCorrect(option.id)}
                        />
                        Mark as correct
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => removeOption(option.id)}
                      className="self-end rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
                    >
                      Remove
                    </button>
                    <div>
                      <label className="text-xs font-semibold text-slate-500">
                        Option {index + 1}
                      </label>
                      <div className="mt-2">
                        <RichTextEditor
                          value={option.text}
                          onChange={(value) => updateOptionText(option.id, value)}
                          placeholder={`Option ${index + 1}`}
                          height={140}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOptions((prev) => [...prev, { id: makeId(), text: "" }])}
                className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                Add option
              </button>
            </div>
          )}

          {questionType === "numerical" && (
            <div>
              <label className="text-xs font-semibold text-slate-500">Correct Answer</label>
              <input
                type="number"
                value={typeof correctAnswer === "number" ? correctAnswer : ""}
                onChange={(event) => setCorrectAnswer(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="Enter numeric answer"
              />
            </div>
          )}

          {questionType === "true_false" && (
            <div>
              <label className="text-xs font-semibold text-slate-500">Correct Answer</label>
              <select
                value={String(correctAnswer)}
                onChange={(event) => setCorrectAnswer(event.target.value === "true")}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">Subject</label>
              <select
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setChapterId("");
                  setTopicId("");
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="">Select</option>
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
                value={chapterId}
                onChange={(event) => {
                  setChapterId(event.target.value);
                  setTopicId("");
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="">Select</option>
                {availableChapters.map((chapter) => (
                  <option key={chapter.id} value={String(chapter.id)}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Topic</label>
              <select
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="">Select</option>
                {availableTopics.map((topic) => (
                  <option key={topic.id} value={String(topic.id)}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">Marks (Positive)</label>
              <input
                type="number"
                value={marksPositive}
                onChange={(event) => setMarksPositive(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Marks (Negative)</label>
              <input
                type="number"
                value={marksNegative}
                onChange={(event) => setMarksNegative(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Exam Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="JEE, NEET, Board"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {initialQuestion ? "Save Changes" : "Create Question"}
            </button>
          </div>
    </form>
  );

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {initialQuestion ? "Edit Question" : "Create New Question"}
              </h2>
              <p className="text-xs text-slate-500">
                Keep questions concise and aligned to the syllabus.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {initialQuestion ? "Edit Question" : "Create New Question"}
          </h2>
          <p className="text-xs text-slate-500">
            Keep questions concise and aligned to the syllabus.
          </p>
        </div>
      </div>
      {formContent}
    </div>
  );
}
