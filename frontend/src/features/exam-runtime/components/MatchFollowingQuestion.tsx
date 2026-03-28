import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  buildMatchAnswer,
  getOptionHtml,
  normalizeMatchAnswer,
} from "@/features/exam-runtime/questionHelpers";
import type { RuntimeMatchOptionSet } from "@/features/exam-runtime/types";

interface MatchFollowingQuestionProps {
  options: RuntimeMatchOptionSet;
  answer: unknown;
  readOnly: boolean;
  onAnswerChange: (value: unknown) => void;
}

interface ConnectorLine {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export default function MatchFollowingQuestion({
  options,
  answer,
  readOnly,
  onAnswerChange,
}: MatchFollowingQuestionProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const leftRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [activeLeftId, setActiveLeftId] = useState<string | null>(null);
  const [lines, setLines] = useState<ConnectorLine[]>([]);

  const normalizedAnswer = useMemo(() => normalizeMatchAnswer(answer), [answer]);
  const pairByLeftId = useMemo(
    () => new Map(normalizedAnswer.pairs.map((pair) => [pair.left_id, pair.right_id])),
    [normalizedAnswer]
  );
  const pairByRightId = useMemo(
    () => {
      const map = new Map<string, string[]>();
      normalizedAnswer.pairs.forEach((pair) => {
        const current = map.get(pair.right_id) ?? [];
        current.push(pair.left_id);
        map.set(pair.right_id, current);
      });
      return map;
    },
    [normalizedAnswer]
  );
  const rightById = useMemo(
    () => new Map(options.right.map((item) => [item.id, item])),
    [options.right]
  );

  const recalculateLines = useCallback(() => {
    const board = boardRef.current;
    if (!board) {
      setLines([]);
      return;
    }

    const boardRect = board.getBoundingClientRect();
    const nextLines = normalizedAnswer.pairs
      .map((pair) => {
        const leftElement = leftRefs.current[pair.left_id];
        const rightElement = rightRefs.current[pair.right_id];
        if (!leftElement || !rightElement) return null;

        const leftRect = leftElement.getBoundingClientRect();
        const rightRect = rightElement.getBoundingClientRect();

        return {
          key: `${pair.left_id}-${pair.right_id}`,
          x1: leftRect.right - boardRect.left,
          y1: leftRect.top - boardRect.top + leftRect.height / 2,
          x2: rightRect.left - boardRect.left,
          y2: rightRect.top - boardRect.top + rightRect.height / 2,
        };
      })
      .filter((line): line is ConnectorLine => Boolean(line));

    setLines(nextLines);
  }, [normalizedAnswer]);

  useLayoutEffect(() => {
    recalculateLines();
  }, [recalculateLines]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      recalculateLines();
    });

    observer.observe(board);
    Object.values(leftRefs.current).forEach((node) => {
      if (node) observer.observe(node);
    });
    Object.values(rightRefs.current).forEach((node) => {
      if (node) observer.observe(node);
    });

    const handleResize = () => recalculateLines();
    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [options.left, options.right, recalculateLines]);

  const handleLeftClick = (leftId: string) => {
    if (readOnly) return;
    setActiveLeftId((current) => (current === leftId ? null : leftId));
  };

  const handleRightClick = (rightId: string) => {
    if (readOnly || !activeLeftId) return;
    onAnswerChange(buildMatchAnswer(answer, activeLeftId, rightId));
    setActiveLeftId(null);
  };

  const clearLeftMapping = (leftId: string) => {
    if (readOnly) return;
    const currentRightId = pairByLeftId.get(leftId);
    if (!currentRightId) return;
    onAnswerChange({
      pairs: normalizedAnswer.pairs.filter((pair) => pair.left_id !== leftId),
    });
    if (activeLeftId === leftId) {
      setActiveLeftId(null);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm text-slate-600">
          Click a left item, then click its matching item on the right. Existing matches are connected below.
        </p>
      </div>

      <div ref={boardRef} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {lines.map((line) => (
            <g key={line.key}>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#fb923c"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx={line.x1} cy={line.y1} r="4" fill="#ea580c" />
              <circle cx={line.x2} cy={line.y2} r="4" fill="#ea580c" />
            </g>
          ))}
        </svg>

        <div className="relative z-10 grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Left
            </div>
            {options.left.map((leftOption, index) => {
              const mappedRightId = pairByLeftId.get(leftOption.id) ?? null;
              const mappedRight = mappedRightId ? rightById.get(mappedRightId) : null;
              const isActive = activeLeftId === leftOption.id;

              return (
                <div key={leftOption.id} className="space-y-2">
                  <button
                    ref={(node) => {
                      leftRefs.current[leftOption.id] = node;
                    }}
                    type="button"
                    onClick={() => handleLeftClick(leftOption.id)}
                    disabled={readOnly}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                        : mappedRightId
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                    } ${readOnly ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-xs font-semibold text-slate-500">{index + 1}.</span>
                      <span className="min-w-0 text-sm leading-relaxed text-slate-900 md:text-base">
                        <span dangerouslySetInnerHTML={{ __html: getOptionHtml(leftOption.text) }} />
                      </span>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 px-1">
                    {isActive ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        Select from right
                      </span>
                    ) : null}
                    {mappedRight ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Matched: {stripHtml(getOptionHtml(mappedRight.text))}
                      </span>
                    ) : null}
                    {mappedRightId && !readOnly ? (
                      <button
                        type="button"
                        onClick={() => clearLeftMapping(leftOption.id)}
                        className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-700"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Right
            </div>
            {options.right.map((rightOption, index) => {
              const linkedLeftIds = pairByRightId.get(rightOption.id) ?? [];
              const isLinked = linkedLeftIds.length > 0;
              const canAssign = Boolean(activeLeftId) && !readOnly;

              return (
                <button
                  key={rightOption.id}
                  ref={(node) => {
                    rightRefs.current[rightOption.id] = node;
                  }}
                  type="button"
                  onClick={() => handleRightClick(rightOption.id)}
                  disabled={readOnly || !activeLeftId}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    canAssign
                      ? "border-blue-300 bg-blue-50 hover:border-blue-500"
                      : isLinked
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white"
                  } ${readOnly || !activeLeftId ? "cursor-not-allowed" : "cursor-pointer"} ${
                    readOnly ? "opacity-80" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-xs font-semibold text-slate-500">{index + 1}.</span>
                      <span className="min-w-0 text-sm leading-relaxed text-slate-900 md:text-base">
                        <span dangerouslySetInnerHTML={{ __html: getOptionHtml(rightOption.text) }} />
                      </span>
                    </div>
                    {isLinked ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Linked {linkedLeftIds.length > 1 ? `(${linkedLeftIds.length})` : ""}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
