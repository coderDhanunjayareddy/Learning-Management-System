import type { AutosaveState } from "@/features/exam-runtime/types";

interface ExamTimerBarProps {
    remainingSeconds: number | null;
    autosaveState: AutosaveState;
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

export default function ExamTimerBar({ remainingSeconds, autosaveState }: ExamTimerBarProps) {
    return (
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-300 bg-white px-4 md:px-5">
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
    );
}