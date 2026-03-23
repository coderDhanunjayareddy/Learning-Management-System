interface ExamHeaderProps {
  examTitle: string;
  autosaveError: string | null;
  focusWarning: boolean;
  onDismissFocusWarning: () => void;
}

export default function ExamHeader({
  examTitle,
  autosaveError,
  focusWarning,
  onDismissFocusWarning,
}: ExamHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-300 bg-white">
      <div className="flex h-9 items-center justify-between bg-[#2f2f2f] px-4 md:px-5">
        <p className="truncate text-base font-semibold text-yellow-300">{examTitle}</p>
        <div className="hidden items-center gap-2 text-xs font-semibold text-white lg:flex">
          <span className="rounded border border-slate-500 bg-[#3a3a3a] px-3 py-0.5">Tools</span>
          <span className="rounded border border-slate-500 bg-[#3a3a3a] px-3 py-0.5">Accessibility</span>
          <span className="rounded border border-slate-500 bg-[#3a3a3a] px-3 py-0.5">Question Paper</span>
          <span className="rounded border border-slate-500 bg-[#3a3a3a] px-3 py-0.5">Instructions</span>
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
