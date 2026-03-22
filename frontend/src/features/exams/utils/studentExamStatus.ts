import type { StudentExamStatus } from "@/features/exams/types/studentExam";

const isValidDate = (value: Date) => !Number.isNaN(value.getTime());

export const computeStudentExamStatus = (
  exam: { start_datetime?: string | null; end_datetime?: string | null },
  now: Date = new Date()
): StudentExamStatus => {
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
