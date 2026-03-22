import type { AutosaveState } from "@/features/exam-runtime/types";

interface ExamHeaderProps {
  examTitle: string;
  remainingSeconds: number | null;
  autosaveState: AutosaveState;
  autosaveError: string | null;
  focusWarning: boolean;
  onDismissFocusWarning: () => void;
}

const formatTimer = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return "--:--:--";
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const autosaveLabelMap: Record<AutosaveState, string> = {
  idle: "Idle",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed",
};

const getTimerClass = (remainingSeconds: number | null) => {
  if (remainingSeconds !== null && remainingSeconds <= 60) return "text-red-600 animate-pulse";
  if (remainingSeconds !== null && remainingSeconds <= 300) return "text-yellow-600";
  return "text-slate-900";
};

export default function ExamHeader({
  examTitle,
  remainingSeconds,
  autosaveState,
  autosaveError,
  focusWarning,
  onDismissFocusWarning,
}: ExamHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-300 bg-white">
      <div className="flex h-11 items-center justify-between bg-[#2f2f2f] px-4 md:px-5">
        <p className="truncate text-base font-semibold text-yellow-300">{examTitle}</p>
        <div className="hidden items-center gap-2 text-sm font-semibold text-white lg:flex">
          <span className="rounded border border-slate-500 bg-[#3a3a3a] px-3 py-1">Tools</span>
          <span className="rounded border border-slate-500 bg-[#3a3a3a] px-3 py-1">Accessibility</span>
          <span className="rounded border border-slate-500 bg-[#3a3a3a] px-3 py-1">Question Paper</span>
          <span className="rounded border border-slate-500 bg-[#3a3a3a] px-3 py-1">Instructions</span>
        </div>
      </div>

      <div className="flex h-10 items-center justify-between border-b border-slate-300 px-4 md:px-5">
        <p className="text-l font-semibold text-slate-700">Section</p>
        <div className="flex items-center gap-4">
          <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
            Autosave: {autosaveLabelMap[autosaveState]}
          </span>
          <p className={`text-l font-semibold ${getTimerClass(remainingSeconds)}`}>
            Time Left : {formatTimer(remainingSeconds)}
          </p>
        </div>
      </div>

      {focusWarning && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 md:px-5">
          <div className="flex items-center justify-between">
            <p>Tab/window focus changed during attempt. Keep this screen active while taking the exam.</p>
            <button
              type="button"
              onClick={onDismissFocusWarning}
              className="ml-4 rounded border border-amber-300 px-2 py-1 text-xs font-semibold hover:bg-amber-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {autosaveError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 md:px-5">{autosaveError}</div>
      )}
    </header>
  );
}
