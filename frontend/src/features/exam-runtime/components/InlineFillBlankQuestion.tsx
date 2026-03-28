import { createElement, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { ensureMathJax } from "@/components/ui/mathjax";
import { sanitizeHtml } from "@/utils/htmlSanitizer";

interface InlineFillBlankQuestionProps {
  html: string;
  valuesByBlankId: Record<string, string>;
  readOnly: boolean;
  onBlankChange: (blankId: string, value: string) => void;
}

const PLACEHOLDER_PATTERN = /\{\{([^}]+)\}\}/g;

const mapAttributeName = (name: string) => {
  switch (name) {
    case "class":
      return "className";
    case "colspan":
      return "colSpan";
    case "rowspan":
      return "rowSpan";
    default:
      return name;
  }
};

const extractPlaceholders = (html: string) =>
  Array.from(html.matchAll(PLACEHOLDER_PATTERN)).map((match) => match[1].trim()).filter(Boolean);

export const getInlineBlankPlaceholderIds = extractPlaceholders;

export default function InlineFillBlankQuestion({
  html,
  valuesByBlankId,
  readOnly,
  onBlankChange,
}: InlineFillBlankQuestionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html]);

  useEffect(() => {
    let mounted = true;
    const typeset = async () => {
      await ensureMathJax();
      if (!mounted || !window.MathJax || !containerRef.current) return;
      if (window.MathJax.typesetPromise) {
        await window.MathJax.typesetPromise([containerRef.current]);
      } else if (window.MathJax.typeset) {
        window.MathJax.typeset([containerRef.current]);
      }
    };

    void typeset();
    return () => {
      mounted = false;
    };
  }, [sanitizedHtml, valuesByBlankId]);

  const content = useMemo(() => {
    if (typeof window === "undefined") return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedHtml, "text/html");

    const renderText = (text: string, path: string) => {
      const segments = text.split(/(\{\{[^}]+\}\})/g);
      return segments.map((segment, index) => {
        const match = segment.match(/^\{\{([^}]+)\}\}$/);
        if (!match) return segment;

        const blankId = match[1].trim();
        return (
          <input
            key={`${path}-blank-${blankId}-${index}`}
            type="text"
            value={valuesByBlankId[blankId] ?? ""}
            onChange={(event) => onBlankChange(blankId, event.target.value)}
            disabled={readOnly}
            className="mx-1 inline-block min-w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 align-middle focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 md:min-w-32 md:text-base"
          />
        );
      });
    };

    const renderNode = (node: ChildNode, path: string): ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        return renderText(node.textContent ?? "", path);
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const element = node as HTMLElement;
      const props: Record<string, unknown> = { key: path };
      Array.from(element.attributes).forEach((attribute) => {
        props[mapAttributeName(attribute.name)] = attribute.value;
      });

      const children = Array.from(element.childNodes).flatMap((child, index) =>
        renderNode(child, `${path}-${index}`)
      );

      return createElement(element.tagName.toLowerCase(), props, children.length ? children : undefined);
    };

    return Array.from(doc.body.childNodes).flatMap((node, index) => renderNode(node, `node-${index}`));
  }, [onBlankChange, readOnly, sanitizedHtml, valuesByBlankId]);

  return (
    <div ref={containerRef} className="text-lg leading-relaxed text-slate-900 md:text-xl">
      {content}
    </div>
  );
}
