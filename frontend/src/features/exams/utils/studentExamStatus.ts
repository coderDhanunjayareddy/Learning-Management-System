import type { StudentExamStatus } from "@/features/exams/types/studentExam";

const isValidDate = (value: Date) => !Number.isNaN(value.getTime());
const KNOWN_STATUSES: StudentExamStatus[] = [
  "upcoming",
  "ongoing",
  "completed",
  "max_attempts_reached",
  "expired",
  "unknown",
];

export const computeStudentExamStatus = (
  exam: {
    start_datetime?: string | null;
    end_datetime?: string | null;
    computed_status?: string | null;
    status?: string | null;
  },
  now: Date = new Date()
): StudentExamStatus => {
  const explicitStatus = String(exam.computed_status ?? exam.status ?? "").trim().toLowerCase();
  if (KNOWN_STATUSES.includes(explicitStatus as StudentExamStatus)) {
    return explicitStatus as StudentExamStatus;
  }

  const startRaw = exam.start_datetime;
  const endRaw = exam.end_datetime;

  if (!startRaw || !endRaw) return "unknown";

  const start = new Date(startRaw);
  const end = new Date(endRaw);

  if (!isValidDate(start) || !isValidDate(end)) return "unknown";

  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "ongoing";
};
