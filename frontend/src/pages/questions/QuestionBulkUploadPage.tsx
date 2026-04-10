import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { QuestionFolder } from "@/types/questionFolder";

const normalizeFolder = (item: Record<string, unknown>): QuestionFolder => ({
  id: (item.id as string | number) ?? "",
  name: typeof item.name === "string" ? item.name : "Untitled Folder",
  description: typeof item.description === "string" ? item.description : "",
  questionCount: Number(item.questionCount ?? item.question_count ?? 0),
});

export default function QuestionBulkUploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [folderOptions, setFolderOptions] = useState<QuestionFolder[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
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
      } catch {
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

    setUploadErrors([]);
    setUploading(true);
    try {
      const extension = bulkFile.name.split(".").pop()?.toLowerCase();
      if (extension === "docx") {
        const formData = new FormData();
        formData.append("file", bulkFile);
        if (activeFolder) formData.append("folder_id", activeFolder);

        const res = await api.post("/questions/bulk-upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data?.errors?.length) {
          setUploadErrors(res.data.errors.map((err: { message?: string }) => err.message ?? String(err)));
        } else {
          alert(`Uploaded ${res.data?.inserted ?? 0} questions successfully.`);
          navigate("/question-bank");
        }
      } else {
        alert("CSV/XLSX upload will be supported next. Please upload a .docx file.");
      }
    } catch (error) {
      const message =
        typeof error === "object" && error && "response" in error
          ? (error as { response?: { data?: { error?: unknown } } }).response?.data?.error
          : null;
      setUploadErrors([typeof message === "string" ? message : "Failed to upload file."]);
    } finally {
      setUploading(false);
      setBulkFile(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("/questions/bulk-upload/template", { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "question-bank-template.docx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download template.");
    }
  };

  return (
    <QuestionBankLayout
      title="Bulk Upload"
      description="Upload DOCX template files to add questions in bulk."
      actions={
        <button
          onClick={() => navigate("/question-bank")}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-700">Drop your file here</p>
              <p className="mt-1 text-xs text-slate-500">Supported: .docx (table template)</p>
              <label className="mt-4 inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Select File
                <input
                  type="file"
                  accept=".docx"
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

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Download DOCX Template
              </button>
              <span>Use the provided table format for bulk upload.</span>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Instructions</h3>
              <p className="mt-2 text-xs text-slate-500">
                Fill the DOCX template table exactly as provided. One row = one question.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                <li>Type: mcq_single, mcq_multiple, true_false, numerical, short_answer, match_following, fill_in_blank.</li>
                <li>Question: rich text content (images/tables allowed).</li>
                <li>Options: separate with semicolons (A;B;C;D) for MCQ.</li>
                <li>Correct Answer: use option letters (A/B/...) for MCQ, true/false for True/False, number for Numerical.</li>
                <li>Match Pairs: format like L1=R1;L2=R2 (matches by order).</li>
                <li>Blanks: format like blank1=ans1|ans2;blank2=ans3.</li>
                <li>Category: optional category/tag value (example: algebra, grammar, reading).</li>
                <li>Program, Grade, Subject, Chapter, Topic can be provided as IDs or names inside the file.</li>
                <li>Linked passages are managed separately. Upload answerable questions first, then attach a passage from the question form if needed.</li>
              </ul>
              <p className="mt-3 text-xs text-slate-500">If a column is not applicable, leave it empty.</p>

              <div className="mt-4">
                <div className="text-xs font-semibold text-slate-500">DOCX Template (Dummy Sample)</div>
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="border border-slate-200 px-2 py-1">Type</th>
                        <th className="border border-slate-200 px-2 py-1">Question</th>
                        <th className="border border-slate-200 px-2 py-1">Options</th>
                        <th className="border border-slate-200 px-2 py-1">Correct Answer</th>
                        <th className="border border-slate-200 px-2 py-1">Match Pairs</th>
                        <th className="border border-slate-200 px-2 py-1">Blanks</th>
                        <th className="border border-slate-200 px-2 py-1">Solution</th>
                        <th className="border border-slate-200 px-2 py-1">Difficulty</th>
                        <th className="border border-slate-200 px-2 py-1">Marks+</th>
                        <th className="border border-slate-200 px-2 py-1">Marks-</th>
                        <th className="border border-slate-200 px-2 py-1">Tags</th>
                        <th className="border border-slate-200 px-2 py-1">Program</th>
                        <th className="border border-slate-200 px-2 py-1">Grade</th>
                        <th className="border border-slate-200 px-2 py-1">Subject</th>
                        <th className="border border-slate-200 px-2 py-1">Chapter</th>
                        <th className="border border-slate-200 px-2 py-1">Topic</th>
                        <th className="border border-slate-200 px-2 py-1">Category</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      <tr>
                        <td className="border border-slate-200 px-2 py-1">mcq_single</td>
                        <td className="border border-slate-200 px-2 py-1">What is 2 + 2?</td>
                        <td className="border border-slate-200 px-2 py-1">2;3;4;5</td>
                        <td className="border border-slate-200 px-2 py-1">C</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">2 + 2 = 4.</td>
                        <td className="border border-slate-200 px-2 py-1">easy</td>
                        <td className="border border-slate-200 px-2 py-1">4</td>
                        <td className="border border-slate-200 px-2 py-1">1</td>
                        <td className="border border-slate-200 px-2 py-1">math,arithmetic</td>
                        <td className="border border-slate-200 px-2 py-1">Catalyst</td>
                        <td className="border border-slate-200 px-2 py-1">6</td>
                        <td className="border border-slate-200 px-2 py-1">Math</td>
                        <td className="border border-slate-200 px-2 py-1">Basics</td>
                        <td className="border border-slate-200 px-2 py-1">Addition</td>
                        <td className="border border-slate-200 px-2 py-1">direct question</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-200 px-2 py-1">fill_in_blank</td>
                        <td className="border border-slate-200 px-2 py-1">{"Water freezes at {{blank1}}�C."}</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">{"blank1=0|zero"}</td>
                        <td className="border border-slate-200 px-2 py-1">At standard pressure, water freezes at 0�C.</td>
                        <td className="border border-slate-200 px-2 py-1">easy</td>
                        <td className="border border-slate-200 px-2 py-1">2</td>
                        <td className="border border-slate-200 px-2 py-1">0</td>
                        <td className="border border-slate-200 px-2 py-1">science</td>
                        <td className="border border-slate-200 px-2 py-1">Spark</td>
                        <td className="border border-slate-200 px-2 py-1">7</td>
                        <td className="border border-slate-200 px-2 py-1">Science</td>
                        <td className="border border-slate-200 px-2 py-1">Physics</td>
                        <td className="border border-slate-200 px-2 py-1">States</td>
                        <td className="border border-slate-200 px-2 py-1">similar question</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  This table mirrors the DOCX template structure. Use the template for uploads.
                </p>
              </div>
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
            <p className="mt-2 text-xs text-slate-500">Files will be linked to the selected folder.</p>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>

            {uploadErrors.length > 0 && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <p className="font-semibold">Upload errors:</p>
                <ul className="mt-1 list-disc pl-4">
                  {uploadErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </QuestionBankLayout>
  );
}
