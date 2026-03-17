import type { ExamStatus } from "../types";

const isValidDate = (value: Date) => !Number.isNaN(value.getTime());

export const computeExamStatus = (
  exam: { start_datetime?: string | null; end_datetime?: string | null },
  now: Date = new Date()
): ExamStatus | null => {
  const startRaw = exam.start_datetime;
  const endRaw = exam.end_datetime;
  if (!startRaw || !endRaw) return null;

  const start = new Date(startRaw);
  const end = new Date(endRaw);
  if (!isValidDate(start) || !isValidDate(end)) return null;

  if (now < start) return "draft";
  if (now > end) return "completed";
  return "active";
};
