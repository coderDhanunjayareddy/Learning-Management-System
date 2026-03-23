interface ActionBarProps {
  readOnly: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  onMarkReviewNext: () => void;
  onClear: () => void;
  onPrevious: () => void;
  onSaveNext: () => void;
  onSubmit: () => void;
}

const baseSecondary =
  "rounded border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

export default function ActionBar({
  readOnly,
  hasNext,
  hasPrevious,
  onMarkReviewNext,
  onClear,
  onPrevious,
  onSaveNext,
  onSubmit,
}: ActionBarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onMarkReviewNext}
          disabled={readOnly || !hasNext}
          className={baseSecondary}
        >
          Mark for review and Next
        </button>

        <button type="button" onClick={onClear} disabled={readOnly} className={baseSecondary}>
          Clear Response
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!hasPrevious}
          className={baseSecondary}
        >
          Previous
        </button>

        <button
          type="button"
          onClick={onSaveNext}
          disabled={readOnly || !hasNext}
          className="rounded bg-[#2185d0] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1778c2] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save & Next
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={readOnly}
          className="rounded bg-[#2185d0] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1778c2] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Submit Exam
        </button>
      </div>
    </div>
  );
}

