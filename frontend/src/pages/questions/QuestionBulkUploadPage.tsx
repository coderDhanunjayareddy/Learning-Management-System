import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { QuestionFolder } from "@/types/questionFolder";

type CsvRow = Record<string, string>;

type BulkQuestionPayload = {
  question_type: string;
  question_text: string;
  options: Array<{ id: string; text: string; is_correct?: boolean }> | null;
  correct_answer: string | string[] | number | boolean;
  subject_id: number;
  chapter_id: number;
  topic_id: number | null;
  difficulty_level: string;
  exam_tags: string[];
  marks_positive: number;
  marks_negative: number;
  solution: string | null;
  solution_video_url: string | null;
  school_id: number | null;
  status?: string;
};

const normalizeFolder = (item: any): QuestionFolder => ({
  id: item.id,
  name: item.name ?? "Untitled Folder",
  description: item.description ?? "",
  questionCount: Number(item.questionCount ?? item.question_count ?? 0),
});

const parseJsonCell = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    return trimmed;
  }
};

const parseRequiredInt = (value: string | undefined, fieldName: string, rowNumber: number) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Row ${rowNumber}: ${fieldName} must be an integer`);
  }
  return parsed;
};

const parseNullableInt = (value: string | undefined) => {
  if (!value || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const normalizeOptions = (
  rawOptions: string | undefined,
  rowNumber: number
): Array<{ id: string; text: string; is_correct?: boolean }> => {
  if (!rawOptions || !rawOptions.trim()) {
    return [];
  }

  const parsed = parseJsonCell(rawOptions);
  if (Array.isArray(parsed)) {
    return parsed.map((option, index) => {
      if (typeof option === "string") {
        return {
          id: `opt-${index + 1}`,
          text: option,
        };
      }

      if (!option || typeof option !== "object") {
        throw new Error(`Row ${rowNumber}: invalid option format`);
      }

      const typedOption = option as Record<string, unknown>;
      return {
        id: String(typedOption.id ?? `opt-${index + 1}`),
        text: String(typedOption.text ?? typedOption.label ?? ""),
        is_correct:
          typedOption.is_correct === undefined ? undefined : Boolean(typedOption.is_correct),
      };
    });
  }

  if (typeof parsed === "string") {
    return parsed
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item, index) => ({
        id: `opt-${index + 1}`,
        text: item,
      }));
  }

  throw new Error(`Row ${rowNumber}: options must be JSON array or pipe-delimited string`);
};

const normalizeCorrectAnswer = (
  rawAnswer: string | undefined,
  questionType: string,
  rowNumber: number
) => {
  if (!rawAnswer || !rawAnswer.trim()) {
    throw new Error(`Row ${rowNumber}: correct_answer is required`);
  }

  const parsed = parseJsonCell(rawAnswer);
  if (questionType === "true_false") {
    if (typeof parsed === "boolean") return parsed;
    const normalized = String(parsed).toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    throw new Error(`Row ${rowNumber}: true_false question needs true or false as correct_answer`);
  }

  if (questionType === "numerical") {
    const numeric = Number(parsed);
    if (Number.isNaN(numeric)) {
      throw new Error(`Row ${rowNumber}: numerical question needs numeric correct_answer`);
    }
    return numeric;
  }

  if (questionType === "mcq_multiple") {
    if (Array.isArray(parsed)) return parsed.map((item) => String(item));
    if (typeof parsed === "string") {
      return parsed
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return typeof parsed === "string" ? parsed.trim() : (parsed as string | number | boolean);
};

const normalizeCsvRow = (row: CsvRow, rowNumber: number): BulkQuestionPayload => {
  const questionType = (row.question_type || "mcq_single").trim();
  const questionText = (row.question_text || "").trim();

  if (!questionText) {
    throw new Error(`Row ${rowNumber}: question_text is required`);
  }

  const subjectId = parseRequiredInt(row.subject_id, "subject_id", rowNumber);
  const chapterId = parseRequiredInt(row.chapter_id, "chapter_id", rowNumber);
  const topicId = parseNullableInt(row.topic_id);

  const options = normalizeOptions(row.options, rowNumber);
  const correctAnswer = normalizeCorrectAnswer(row.correct_answer, questionType, rowNumber);

  if (questionType.startsWith("mcq") && options.length === 0) {
    throw new Error(`Row ${rowNumber}: options are required for MCQ`);
  }

  const marksPositive =
    row.marks_positive && row.marks_positive.trim() ? Number(row.marks_positive) : 4;
  const marksNegative =
    row.marks_negative && row.marks_negative.trim() ? Number(row.marks_negative) : 0;
  if (Number.isNaN(marksPositive) || Number.isNaN(marksNegative)) {
    throw new Error(`Row ${rowNumber}: marks_positive and marks_negative must be numbers`);
  }

  const examTags = (row.exam_tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const payload: BulkQuestionPayload = {
    question_type: questionType,
    question_text: questionText,
    options: options.length > 0 ? options : null,
    correct_answer: correctAnswer,
    subject_id: subjectId,
    chapter_id: chapterId,
    topic_id: topicId,
    difficulty_level: (row.difficulty_level || "medium").trim() || "medium",
    exam_tags: examTags,
    marks_positive: marksPositive,
    marks_negative: marksNegative,
    solution: row.solution?.trim() ? row.solution.trim() : null,
    solution_video_url: row.solution_video_url?.trim() ? row.solution_video_url.trim() : null,
    school_id: parseNullableInt(row.school_id),
  };

  if (row.status && row.status.trim()) {
    payload.status = row.status.trim();
  }

  return payload;
};

export default function QuestionBulkUploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [folderOptions, setFolderOptions] = useState<QuestionFolder[]>([]);
  const [uploading, setUploading] = useState(false);

  const folderFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("folderId") ?? "";
  }, [location.search]);

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const res = await api.get("/question-folders");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setFolderOptions(payload.map(normalizeFolder));
      } catch (err) {
        setFolderOptions([]);
      }
    };
    loadFolders();
  }, []);

  const activeFolder = selectedFolder || folderFromQuery;

  const handleUpload = async () => {
    if (!bulkFile) {
      alert("Please select a file to upload.");
      return;
    }

    if (!bulkFile.name.toLowerCase().endsWith(".csv")) {
      alert("Only CSV files are supported right now.");
      return;
    }

    setUploading(true);
    try {
      const csvText = await bulkFile.text();
      const parsed = Papa.parse<CsvRow>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
      }

      const rows = parsed.data.filter((row) =>
        Object.values(row || {}).some((value) => String(value || "").trim().length > 0)
      );
      if (rows.length === 0) {
        throw new Error("CSV has no data rows.");
      }

      const questions: BulkQuestionPayload[] = [];
      const rowErrors: string[] = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        try {
          questions.push(normalizeCsvRow(row, rowNumber));
        } catch (err) {
          rowErrors.push(err instanceof Error ? err.message : `Row ${rowNumber}: invalid row`);
        }
      });

      if (rowErrors.length > 0) {
        throw new Error(rowErrors.slice(0, 5).join("\n"));
      }

      const res = await api.post("/questions/bulk-upload", {
        questions,
        folder_id: activeFolder || null,
      });

      const createdCount = Number(res.data?.created_count ?? 0);
      const failedCount = Number(res.data?.failed_count ?? 0);
      if (failedCount > 0) {
        const firstFailure = res.data?.failed?.[0]?.error
          ? `\nFirst error: ${res.data.failed[0].error}`
          : "";
        alert(`Bulk upload finished. Created: ${createdCount}, Failed: ${failedCount}.${firstFailure}`);
      } else {
        alert(`Bulk upload successful. Created: ${createdCount} questions.`);
      }

      setBulkFile(null);
      navigate("/question-bank");
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || "Bulk upload failed";
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Bulk Upload"
      description="Upload CSV or Excel files to add questions in bulk."
      actions={
        <button
          onClick={() => navigate("/question-bank")}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-700">Drop your file here</p>
              <p className="mt-1 text-xs text-slate-500">Supported: .csv</p>
              <label className="mt-4 inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Select File
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
                />
              </label>
              {bulkFile && (
                <div className="mt-3 text-xs text-slate-600">
                  Selected: <span className="font-semibold">{bulkFile.name}</span>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Required CSV columns: question_type, question_text, correct_answer, subject_id, chapter_id.
              Optional: options, topic_id, difficulty_level, exam_tags, marks_positive, marks_negative, solution,
              solution_video_url, school_id, status.
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Upload Settings</h3>
            <label className="mt-4 block text-xs font-semibold text-slate-500">Folder</label>
            <select
              value={activeFolder}
              onChange={(event) => setSelectedFolder(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="">Select a folder</option>
              {folderOptions.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Files will be linked to the selected folder.
            </p>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>
          </div>
        </div>
      </div>
    </QuestionBankLayout>
  );
}
