export const prettyPackItemType = (value: string) => {
  if (value === 'exam') return 'Quiz';
  if (value === 'pdf') return 'PDF';
  if (value === 'video') return 'Video';
  return value;
};

export const formatCourseMeta = (grade: string | null, subject: string | null) =>
  [grade, subject].filter(Boolean).join(' | ') || 'No grade/subject';

export const formatCourseScope = (clientId: number | null) =>
  clientId === null ? 'Global' : `Client ${clientId}`;
