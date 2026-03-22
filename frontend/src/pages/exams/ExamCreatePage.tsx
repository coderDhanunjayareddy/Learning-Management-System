import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import ExamShell from "@/features/exams/components/ExamShell";
import RichTextEditor from "@/components/ui/RichTextEditor";
import type { ExamCreateFormState } from "@/features/exams/types";

const initialState: ExamCreateFormState = {
  title: "",
  description: "",
  total_duration_minutes: "",
  start_datetime: "",
  end_datetime: "",
  instructions: "",
  shuffle_questions: false,
  shuffle_options: false,
  show_result_immediately: true,
  max_attempts: "1",
  show_score: true,
  show_pass_or_fail: true,
  show_percentile: false,
  show_analytics: false,
  show_solutions_to_user: false,
  pass_percentage: "",
  variable_marks: false,
  marks_per_question: "",
  negative_marks: "",
  roundoff_marks: false,
  allow_retaking_exam: false,
  maximum_allowed_retakes: "",
  allow_retaking_only_for_failed_attempt: false,
  interval_between_retakes_minutes: "",
};

type FieldErrors = Record<string, string>;

type StepId = 1 | 2;

const formatLabel = (value: string) => value.replace(/_/g, " ");

const parseNumber = (value: string) => {
  if (value === "") return NaN;
  return Number(value);
};

const isValidDateValue = (value: string) => {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

export default function ExamCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepId>(1);
  const [form, setForm] = useState<ExamCreateFormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateField = (name: keyof ExamCreateFormState, value: string) => {
    switch (name) {
      case "title": {
        const trimmed = value.trim();
        if (!trimmed) return "Title is required";
        if (trimmed.length > 255) return "Title must be 255 characters or less";
        return "";
      }
      case "description": {
        if (value && value.length > 5000) return "Description must be 5000 characters or less";
        return "";
      }
      case "total_duration_minutes": {
        const num = parseNumber(value);
        if (Number.isNaN(num)) return "Duration is required";
        if (num <= 0) return "Duration must be greater than 0";
        return "";
      }
      case "start_datetime": {
        if (!value) return "Start time is required";
        if (!isValidDateValue(value)) return "Start time is invalid";
        return "";
      }
      case "end_datetime": {
        if (!value) return "End time is required";
        if (!isValidDateValue(value)) return "End time is invalid";
        if (isValidDateValue(form.start_datetime)) {
          const start = new Date(form.start_datetime);
          const end = new Date(value);
          if (end <= start) return "End time must be after start time";
        }
        return "";
      }
      case "max_attempts": {
        const num = parseNumber(value);
        if (Number.isNaN(num)) return "Max attempts is required";
        if (num <= 0) return "Max attempts must be greater than 0";
        return "";
      }
      default:
        return "";
    }
  };

  const validateStep1 = () => {
    const nextErrors: FieldErrors = {};
    ([
      "title",
      "description",
      "total_duration_minutes",
      "start_datetime",
      "end_datetime",
    ] as const).forEach((field) => {
      const message = validateField(field, form[field]);
      if (message) nextErrors[field] = message;
    });
    return nextErrors;
  };

  const validateStep2 = () => {
    const nextErrors: FieldErrors = {};
    const message = validateField("max_attempts", form.max_attempts);
    if (message) nextErrors.max_attempts = message;
    return nextErrors;
  };

  const isStep1Valid = useMemo(() => Object.keys(validateStep1()).length === 0, [form]);
  const isStep2Valid = useMemo(() => Object.keys(validateStep2()).length === 0, [form]);

  const handleBlur = (field: keyof ExamCreateFormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const message = validateField(field, form[field]);
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const handleChange = (field: keyof ExamCreateFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value } as ExamCreateFormState));
    if (touched[field]) {
      const nextValue = typeof value === "string" ? value : String(value);
      const message = validateField(field, nextValue);
      setErrors((prev) => ({ ...prev, [field]: message }));
    }
  };

  const goNext = () => {
    const nextErrors = validateStep1();
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    setTouched((prev) => ({
      ...prev,
      title: true,
      description: true,
      total_duration_minutes: true,
      start_datetime: true,
      end_datetime: true,
    }));
    if (Object.keys(nextErrors).length === 0) setStep(2);
  };

  const goBack = () => {
    if (step === 1) {
      navigate("/exams");
      return;
    }
    setStep(1);
  };

  const handleSubmit = async () => {
    const step2Errors = validateStep2();
    setErrors((prev) => ({ ...prev, ...step2Errors }));
    setTouched((prev) => ({ ...prev, max_attempts: true }));
    if (Object.keys(step2Errors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        total_duration_minutes: Number(form.total_duration_minutes),
        start_datetime: new Date(form.start_datetime).toISOString(),
        end_datetime: new Date(form.end_datetime).toISOString(),
        shuffle_questions: form.shuffle_questions,
        shuffle_options: form.shuffle_options,
        show_result_immediately: form.show_result_immediately,
        max_attempts: Number(form.max_attempts),
        status: "draft",
      };

      await api.post("/exams", payload);
      toast.success("Exam created successfully");
      navigate("/exams");
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to create exam.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const stepItems = [
    { id: 1, title: "Basic Info" },
    { id: 2, title: "Rules & Scoring" },
  ];

  const renderError = (field: keyof ExamCreateFormState) =>
    touched[field] && errors[field] ? (
      <p className="mt-1 text-xs text-rose-600">{errors[field]}</p>
    ) : null;

  return (
    <ExamShell title="Create Exam" description="Configure a new exam in two steps." backTo="/exams">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {stepItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    step === item.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.id}
                </div>
                <span className="text-sm font-semibold text-slate-700">{item.title}</span>
              </div>
            ))}
          </div>
        </div>

        {submitError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {submitError}
          </div>
        )}

        {step === 1 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Step 1: Basic Info</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500">Exam Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => handleChange("title", event.target.value)}
                  onBlur={() => handleBlur("title")}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="e.g. Term 1 Physics Test"
                />
                {renderError("title")}
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  onBlur={() => handleBlur("description")}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="Short description of the exam"
                />
                {renderError("description")}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={form.total_duration_minutes}
                  onChange={(event) => handleChange("total_duration_minutes", event.target.value)}
                  onBlur={() => handleBlur("total_duration_minutes")}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="180"
                />
                {renderError("total_duration_minutes")}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.start_datetime}
                  onChange={(event) => handleChange("start_datetime", event.target.value)}
                  onBlur={() => handleBlur("start_datetime")}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
                {renderError("start_datetime")}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.end_datetime}
                  onChange={(event) => handleChange("end_datetime", event.target.value)}
                  onBlur={() => handleBlur("end_datetime")}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
                {renderError("end_datetime")}
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500">Instructions</label>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    Coming soon
                  </span>
                </div>
                <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
                  <div className="pointer-events-none opacity-60">
                    <RichTextEditor
                      value={form.instructions}
                      onChange={() => undefined}
                      placeholder="Exam instructions"
                      height={180}
                      resizable={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Step 2: Rules & Scoring</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-sm font-semibold text-slate-700">Shuffle Settings</p>
                  <div className="mt-3 space-y-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={form.shuffle_questions}
                        onChange={(event) => handleChange("shuffle_questions", event.target.checked)}
                      />
                      Shuffle questions per attempt
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={form.shuffle_options}
                        onChange={(event) => handleChange("shuffle_options", event.target.checked)}
                      />
                      Shuffle options
                    </label>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-sm font-semibold text-slate-700">Result Visibility</p>
                  <div className="mt-3 space-y-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={form.show_result_immediately}
                        onChange={(event) => handleChange("show_result_immediately", event.target.checked)}
                      />
                      Show result immediately after submission
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Max Attempts</label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_attempts}
                    onChange={(event) => handleChange("max_attempts", event.target.value)}
                    onBlur={() => handleBlur("max_attempts")}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  />
                  {renderError("max_attempts")}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Scoring & Retake Rules</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  Coming soon
                </span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[
                  "show_score",
                  "show_pass_or_fail",
                  "show_percentile",
                  "show_analytics",
                  "show_solutions_to_user",
                ].map((field) => (
                  <label key={field} className="flex items-center gap-2 text-sm text-slate-400">
                    <input type="checkbox" disabled checked={(form as any)[field]} />
                    {formatLabel(field)}
                  </label>
                ))}
                {[
                  "pass_percentage",
                  "marks_per_question",
                  "negative_marks",
                  "roundoff_marks",
                  "allow_retaking_exam",
                  "maximum_allowed_retakes",
                  "allow_retaking_only_for_failed_attempt",
                  "interval_between_retakes_minutes",
                ].map((field) => (
                  <div key={field}>
                    <label className="text-xs font-semibold text-slate-400">{formatLabel(field)}</label>
                    <input
                      type="text"
                      disabled
                      value={String((form as any)[field] ?? "")}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400"
                    />
                  </div>
                ))}
                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <input type="checkbox" disabled checked={form.variable_marks} />
                  variable marks
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {step === 1 ? "Back to Exams" : "Back"}
          </button>
          <div className="flex items-center gap-2">
            {step === 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!isStep1Valid}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isStep2Valid || submitting}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create Exam"}
              </button>
            )}
          </div>
        </div>
      </div>
    </ExamShell>
  );
}

