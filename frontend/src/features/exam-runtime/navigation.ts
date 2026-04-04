export interface ExamContentRouteContext {
  courseId: number | null;
  contentId: number | null;
}

const toPositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const emptyExamContentRouteContext = (): ExamContentRouteContext => ({
  courseId: null,
  contentId: null,
});

export const getExamContentRouteContextFromState = (state: unknown): ExamContentRouteContext => {
  if (!state || typeof state !== "object") {
    return emptyExamContentRouteContext();
  }

  const source = state as Record<string, unknown>;
  return {
    courseId: toPositiveInt(source.courseId),
    contentId: toPositiveInt(source.contentId),
  };
};

export const getExamContentRouteContextFromSearch = (search: string): ExamContentRouteContext => {
  const params = new URLSearchParams(search);
  return {
    courseId: toPositiveInt(params.get("courseId")),
    contentId: toPositiveInt(params.get("contentId")),
  };
};

export const mergeExamContentRouteContexts = (
  ...contexts: Array<ExamContentRouteContext | null | undefined>
): ExamContentRouteContext => {
  const merged = emptyExamContentRouteContext();

  contexts.forEach((context) => {
    if (!context) return;
    if (!merged.courseId) merged.courseId = toPositiveInt(context.courseId);
    if (!merged.contentId) merged.contentId = toPositiveInt(context.contentId);
  });

  return merged;
};

export const buildExamContentRouteSearch = (context: ExamContentRouteContext): string => {
  const contentId = toPositiveInt(context.contentId);
  if (!contentId) return "";

  const params = new URLSearchParams();
  const courseId = toPositiveInt(context.courseId);
  if (courseId) {
    params.set("courseId", String(courseId));
  }
  params.set("contentId", String(contentId));

  const query = params.toString();
  return query ? `?${query}` : "";
};

export const buildExamContentRouteState = (context: ExamContentRouteContext) => {
  const courseId = toPositiveInt(context.courseId);
  const contentId = toPositiveInt(context.contentId);
  return {
    courseId,
    contentId,
  };
};

export const buildExamContentRoutePath = (context: ExamContentRouteContext): string | null => {
  const contentId = toPositiveInt(context.contentId);
  if (!contentId) return null;

  const courseId = toPositiveInt(context.courseId);
  if (courseId) {
    return `/student/course/${courseId}/content/${contentId}`;
  }

  return `/content/${contentId}`;
};
