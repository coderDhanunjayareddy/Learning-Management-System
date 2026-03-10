import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { QuestionFolder } from "@/types/questionFolder";
import type { CurriculumItem } from "@/types/questionBank";

const normalizeFolder = (item: any): QuestionFolder => ({
  id: item.id,
  name: item.name ?? "Untitled Folder",
  description: item.description ?? "",
  questionCount: Number(item.questionCount ?? item.question_count ?? 0),
});

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.subject_id ?? item.chapter_id ?? item.topic_id,
      name: item.name ?? item.title ?? "Untitled",
      subject_id: item.subject_id ?? null,
      chapter_id: item.chapter_id ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

export default function QuestionBulkUploadPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [folders, setFolders] = useState<QuestionFolder[]>([]);
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters, setChapters] = useState<CurriculumItem[]>([]);
  const [topics, setTopics] = useState<CurriculumItem[]>([]);

  const [selectedFolder, setSelectedFolder] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");

  const folderFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("folderId") ?? "";
  }, [location.search]);

  const activeFolder = selectedFolder || folderFromQuery;

  useEffect(() => {
    const loadFoldersAndSubjects = async () => {
      try {
        const [foldersRes, subjectsRes] = await Promise.all([
          api.get("/question-folders"),
          api.get("/subjects"),
        ]);

        const foldersPayload = Array.isArray(foldersRes.data)
          ? foldersRes.data
          : Array.isArray(foldersRes.data?.data)
          ? foldersRes.data.data
          : [];
        setFolders(foldersPayload.map(normalizeFolder));

        const subjectsPayload = Array.isArray(subjectsRes.data)
          ? subjectsRes.data
          : Array.isArray(subjectsRes.data?.data)
          ? subjectsRes.data.data
          : [];
        setSubjects(normalizeCurriculum(subjectsPayload));
      } catch (err) {
        setFolders([]);
        setSubjects([]);
      }
    };

    loadFoldersAndSubjects();
  }, []);

  useEffect(() => {
    const loadChapters = async () => {
      if (!selectedSubjectId) {
        setChapters([]);
        setSelectedChapterId("");
        setTopics([]);
        setSelectedTopicId("");
        return;
      }

      try {
        const res = await api.get(`/subjects/${selectedSubjectId}/chapters`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setChapters(normalizeCurriculum(payload));
      } catch {
        setChapters([]);
      }
    };

    loadChapters();
  }, [selectedSubjectId]);

  useEffect(() => {
    const loadTopics = async () => {
      if (!selectedChapterId) {
        setTopics([]);
        setSelectedTopicId("");
        return;
      }

      try {
        const res = await api.get(`/chapters/${selectedChapterId}/topics`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setTopics(normalizeCurriculum(payload));
      } catch {
        setTopics([]);
      }
    };

    loadTopics();
  }, [selectedChapterId]);

  const handleUpload = async () => {
    if (!bulkFile) {
      alert("Please select a file to upload.");
      return;
    }

    const filename = bulkFile.name.toLowerCase();
    if (!filename.endsWith(".csv") && !filename.endsWith(".docx")) {
      alert("Unsupported file type. Allowed: .csv, .docx");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", bulkFile);
      if (activeFolder) formData.append("folder_id", String(activeFolder));
      if (selectedSubjectId) formData.append("default_subject_id", selectedSubjectId);
      if (selectedChapterId) formData.append("default_chapter_id", selectedChapterId);
      if (selectedTopicId) formData.append("default_topic_id", selectedTopicId);

      const res = await api.post("/questions/bulk-upload", formData);

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
      const status = err?.response?.status;
      if (status === 401) {
        alert("Your session expired. Please login again and retry upload.");
      } else {
        const firstFailure = err?.response?.data?.failed?.[0];
        const firstFailureMessage =
          firstFailure?.row_number && firstFailure?.error
            ? `Row ${firstFailure.row_number}: ${firstFailure.error}`
            : firstFailure?.error || null;
        const message =
          err?.response?.data?.error ||
          firstFailureMessage ||
          err?.message ||
          "Bulk upload failed";
        alert(message);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Bulk Upload"
      description="Upload CSV or Word (.docx) files to create questions in bulk."
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
              <p className="mt-1 text-xs text-slate-500">Supported: .csv, .docx</p>
              <label className="mt-4 inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Select File
                <input
                  type="file"
                  accept=".csv,.docx"
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
              CSV: include question_type, question_text, correct_answer, subject_id, chapter_id.
              DOCX: use lines like "Question:", options "A) ...", and "Answer:".
              For DOCX, use default Subject and Chapter on the right when IDs are not in the file.
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
              <option value="">Select folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={String(folder.id)}>
                  {folder.name}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-xs font-semibold text-slate-500">Default Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(event) => {
                setSelectedSubjectId(event.target.value);
                setSelectedChapterId("");
                setSelectedTopicId("");
              }}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={String(subject.id)}>
                  {subject.name}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-xs font-semibold text-slate-500">Default Chapter</label>
            <select
              value={selectedChapterId}
              onChange={(event) => {
                setSelectedChapterId(event.target.value);
                setSelectedTopicId("");
              }}
              disabled={!selectedSubjectId}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Select chapter</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={String(chapter.id)}>
                  {chapter.name}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-xs font-semibold text-slate-500">Default Topic (optional)</label>
            <select
              value={selectedTopicId}
              onChange={(event) => setSelectedTopicId(event.target.value)}
              disabled={!selectedChapterId}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Select topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={String(topic.id)}>
                  {topic.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>
          </div>
        </div>
      </div>
    </QuestionBankLayout>
  );
}
