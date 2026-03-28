import type {
  RuntimeFillBlankAnswer,
  RuntimeFillBlankEntry,
  RuntimeMatchFollowingAnswer,
  RuntimeMatchOptionSet,
  RuntimeMatchPair,
  RuntimeOption,
  RuntimeQuestion,
  RuntimeQuestionOptions,
} from "@/features/exam-runtime/types";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toOptionText = (value: unknown): RuntimeOption["text"] => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;

  const source = asRecord(value);
  if (typeof source.html === "string") return { html: source.html };
  if (typeof source.text === "string") return source.text;
  if (typeof source.label === "string") return source.label;
  return String(value);
};

const normalizeOptionList = (value: unknown): RuntimeOption[] => {
  if (!Array.isArray(value)) return [];

  return value.map((option, index) => {
    const source = asRecord(option);
    const optionId = source.id ?? index + 1;
    const optionText = source.text ?? source.label ?? option;

    return {
      id: String(optionId),
      text: toOptionText(optionText),
    };
  });
};

export const normalizeQuestionOptions = (
  value: unknown,
  questionType?: string
): RuntimeQuestionOptions => {
  if (questionType === "match_following") {
    if (Array.isArray(value)) {
      const left: RuntimeOption[] = [];
      const right: RuntimeOption[] = [];

      value.forEach((option, index) => {
        const source = asRecord(option);
        const side = String(source.side ?? "").toLowerCase();
        const normalized = {
          id: String(source.id ?? index + 1),
          text: toOptionText(source.text ?? source.label ?? option),
        };

        if (side === "right") {
          right.push(normalized);
        } else {
          left.push(normalized);
        }
      });

      return { left, right };
    }

    const source = asRecord(value);
    if (Array.isArray(source.left) || Array.isArray(source.right)) {
      return {
        left: normalizeOptionList(source.left),
        right: normalizeOptionList(source.right),
      };
    }

    return { left: [], right: [] };
  }

  if (Array.isArray(value)) {
    return normalizeOptionList(value);
  }

  if (value && typeof value === "object") {
    return Object.entries(asRecord(value)).map(([key, text]) => ({
      id: String(key),
      text: toOptionText(text),
    }));
  }

  return [];
};

export const isMatchOptions = (options: RuntimeQuestionOptions): options is RuntimeMatchOptionSet =>
  !Array.isArray(options);

const normalizeTextToken = (value: unknown) => String(value ?? "").trim();

const splitPlaceholderIds = (html: string) =>
  Array.from(html.matchAll(/\{\{([^}]+)\}\}/g)).map((match) => match[1].trim()).filter(Boolean);

export const extractQuestionHtml = (value: RuntimeQuestion["question_text"]) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.html === "string") return value.html;
  return "";
};

export const getOptionHtml = (value: RuntimeOption["text"]) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.html === "string") return value.html;
  if (value === null || value === undefined) return "";
  return String(value);
};

export const getBlankIds = (question: Pick<RuntimeQuestion, "blank_ids" | "question_text">) => {
  const explicit = Array.isArray(question.blank_ids)
    ? question.blank_ids.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (explicit.length > 0) return explicit;
  return splitPlaceholderIds(extractQuestionHtml(question.question_text));
};

export const normalizeMatchAnswer = (value: unknown): RuntimeMatchFollowingAnswer => {
  const fromPairs = Array.isArray(asRecord(value).pairs)
    ? (asRecord(value).pairs as unknown[])
    : Array.isArray(value)
      ? value
      : [];

  const pairs = fromPairs
    .map((item) => {
      const source = asRecord(item);
      const leftId = normalizeTextToken(source.left_id);
      const rightId = normalizeTextToken(source.right_id);
      if (!leftId || !rightId) return null;
      return { left_id: leftId, right_id: rightId };
    })
    .filter((item): item is RuntimeMatchPair => Boolean(item));

  return { pairs };
};

export const normalizeFillBlankAnswer = (
  value: unknown,
  blankIds: string[] = []
): RuntimeFillBlankAnswer => {
  const source = asRecord(value);
  const fromBlanks = Array.isArray(source.blanks)
    ? source.blanks
    : Array.isArray(value)
      ? value
      : null;

  if (fromBlanks) {
    const blanks = fromBlanks
      .map((item, index) => {
        const entry = asRecord(item);
        const id = normalizeTextToken(entry.id ?? blankIds[index]);
        const blankValue = entry.value ?? entry.answer ?? entry.raw ?? "";
        if (!id) return null;
        return { id, value: String(blankValue ?? "") };
      })
      .filter((item): item is RuntimeFillBlankEntry => Boolean(item));

    return { blanks };
  }

  if (source && Object.keys(source).length > 0) {
    const blanks = Object.entries(source)
      .filter(([key]) => key !== "blanks")
      .map(([key, item]) => ({ id: String(key), value: String(item ?? "") }));
    if (blanks.length > 0) return { blanks };
  }

  if (typeof value === "string" && blankIds.length === 1) {
    return { blanks: [{ id: blankIds[0], value }] };
  }

  return { blanks: [] };
};

export const normalizeAnswerForQuestion = (question: RuntimeQuestion, value: unknown) => {
  if (question.question_type === "match_following") {
    return normalizeMatchAnswer(value);
  }

  if (question.question_type === "fill_in_blank") {
    return normalizeFillBlankAnswer(value, getBlankIds(question));
  }

  return value;
};

export const isQuestionAttemptedValue = (value: unknown) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;

    if (Array.isArray(source.pairs)) {
      return source.pairs.some((item) => {
        const pair = asRecord(item);
        return normalizeTextToken(pair.left_id).length > 0 && normalizeTextToken(pair.right_id).length > 0;
      });
    }

    if (Array.isArray(source.blanks)) {
      return source.blanks.some((item) => normalizeTextToken(asRecord(item).value).length > 0);
    }

    if (Array.isArray(source.answer_ids)) return source.answer_ids.length > 0;
    if (Array.isArray(source.answers)) return source.answers.length > 0;
    if (source.answer !== undefined) return normalizeTextToken(source.answer).length > 0;
    if (source.value !== undefined) return normalizeTextToken(source.value).length > 0;

    return Object.values(source).some((item) => normalizeTextToken(item).length > 0);
  }

  return true;
};

export const buildMatchAnswer = (
  currentAnswer: unknown,
  leftId: string,
  rightId: string
): RuntimeMatchFollowingAnswer => {
  const nextPairs = normalizeMatchAnswer(currentAnswer).pairs.filter((pair) => pair.left_id !== leftId);
  if (rightId) {
    nextPairs.push({ left_id: leftId, right_id: rightId });
  }
  return { pairs: nextPairs };
};

export const getSelectedMatchValue = (value: unknown, leftId: string) =>
  normalizeMatchAnswer(value).pairs.find((pair) => pair.left_id === leftId)?.right_id ?? "";

export const buildFillBlankAnswer = (
  currentAnswer: unknown,
  blankIds: string[],
  blankId: string,
  nextValue: string
): RuntimeFillBlankAnswer => {
  const current = normalizeFillBlankAnswer(currentAnswer, blankIds);
  const nextMap = new Map(current.blanks.map((item) => [item.id, item.value]));
  nextMap.set(blankId, nextValue);

  const orderedIds = blankIds.length ? blankIds : Array.from(nextMap.keys());
  const blanks = orderedIds
    .filter((id) => id)
    .map((id) => ({ id, value: nextMap.get(id) ?? "" }));

  return { blanks };
};

export const emptyAnswerForQuestion = (question: RuntimeQuestion) => {
  if (question.question_type === "match_following") {
    return { pairs: [] } satisfies RuntimeMatchFollowingAnswer;
  }

  if (question.question_type === "fill_in_blank") {
    return {
      blanks: getBlankIds(question).map((id) => ({ id, value: "" })),
    } satisfies RuntimeFillBlankAnswer;
  }

  return null;
};
