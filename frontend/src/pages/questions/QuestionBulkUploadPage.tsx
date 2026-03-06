import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import { mockFolders } from "@/features/question-bank/data/mockFolders";

export default function QuestionBulkUploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [selectedFolder, setSelectedFolder] = useState("");

  const folderFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("folderId") ?? "";
  }, [location.search]);

  const folderOptions = useMemo(() => mockFolders, []);

  const activeFolder = selectedFolder || folderFromQuery;

  const handleUpload = () => {
    if (!bulkFile) {
      alert("Please select a file to upload.");
      return;
    }
    alert("Bulk upload queued. Backend integration pending.");
    setBulkFile(null);
    navigate("/question-bank/folders");
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
              <p className="mt-1 text-xs text-slate-500">Supported: .csv, .xlsx</p>
              <label className="mt-4 inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Select File
                <input
                  type="file"
                  accept=".csv,.xlsx"
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

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Bulk upload API is not connected yet. This UI will submit once the backend endpoint is ready.
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
              className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Upload File
            </button>
          </div>
        </div>
      </div>
    </QuestionBankLayout>
  );
}
