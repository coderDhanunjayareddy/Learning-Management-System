import { memo, useEffect, useMemo, useRef } from "react";
import { typesetMathJax } from "@/components/ui/mathjax";
import { sanitizeHtml } from "@/utils/htmlSanitizer";

interface MathHtmlProps {
  html: string;
  className?: string;
}

function MathHtml({ html, className }: MathHtmlProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html]);

  useEffect(() => {
    let mounted = true;

    const typeset = async () => {
      if (!mounted || !containerRef.current) return;
      await typesetMathJax([containerRef.current]);
    };

    void typeset();
    return () => {
      mounted = false;
    };
  }, [sanitizedHtml]);

  return (
    <span
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

export default memo(MathHtml, (prev, next) => {
  return prev.html === next.html && prev.className === next.className;
});
