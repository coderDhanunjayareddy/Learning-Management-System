import { useEffect, useMemo, useRef } from "react";
import { ensureMathJax } from "@/components/ui/mathjax";

declare global {
  interface Window {
    ClassicEditor?: any;
    __ckeditor5LoadingPromise?: Promise<void>;
  }
}

const CKEDITOR5_SRC =
  "https://cdn.ckeditor.com/ckeditor5/41.4.2/classic/ckeditor.js";

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });

const ensureCkeditor5 = async () => {
  if (window.ClassicEditor) return;
  if (!window.__ckeditor5LoadingPromise) {
    window.__ckeditor5LoadingPromise = loadScript(CKEDITOR5_SRC);
  }
  await window.__ckeditor5LoadingPromise;
};


interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  height = 180,
}: RichTextEditorProps) {
  const editorRef = useRef<any>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const lastValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editorConfig = useMemo(
    () => ({
      placeholder,
      toolbar: [
        "heading",
        "|",
        "bold",
        "italic",
        "link",
        "bulletedList",
        "numberedList",
        "|",
        "blockQuote",
        "imageUpload",
        "insertTable",
        "|",
        "undo",
        "redo",
      ],
      table: {
        contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
      },
      extraPlugins: [
        (editor: any) => {
          editor.plugins.get("FileRepository").createUploadAdapter = (
            loader: any,
          ) => ({
            upload: () =>
              loader.file.then(
                (file: File) =>
                  new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve({ default: reader.result });
                    reader.onerror = (error) => reject(error);
                    reader.onabort = () => reject(new Error("Upload aborted"));
                    reader.readAsDataURL(file);
                  }),
              ),
            abort: () => {},
          });
        },
      ],
    }),
    [placeholder],
  );

  const applyEditorHeight = (editor: any) => {
    const editable = editor?.ui?.view?.editable?.element;
    if (editable) {
      editable.style.minHeight = `${height}px`;
    }
  };

  useEffect(() => {
    if (!hostRef.current) return;
    let destroyed = false;

    const init = async () => {
      await ensureMathJax();
      await ensureCkeditor5();
      if (destroyed || !window.ClassicEditor) return;
      if (editorRef.current) return;

      const editor = await window.ClassicEditor.create(hostRef.current, editorConfig);
      editorRef.current = editor;
      editor.setData(value || "");
      lastValueRef.current = value || "";
      applyEditorHeight(editor);

      editor.model.document.on("change:data", () => {
        const data = editor.getData();
        lastValueRef.current = data;
        onChangeRef.current(data);
      });
    };

    init();

    return () => {
      destroyed = true;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      if (hostRef.current) {
        hostRef.current.innerHTML = "";
      }
    };
  }, [editorConfig]);

  useEffect(() => {
    if (editorRef.current) {
      applyEditorHeight(editorRef.current);
    }
  }, [height]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (lastValueRef.current !== value) {
      editor.setData(value || "");
      lastValueRef.current = value || "";
    }
  }, [value]);

  const handleInsertLatex = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const latex = window.prompt("Enter LaTeX (without delimiters):", "");
    if (!latex) return;
    editor.model.change((writer: any) => {
      const insertPosition = editor.model.document.selection.getFirstPosition();
      writer.insertText(`\\(${latex}\\)`, insertPosition);
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-2 py-1">
        <span className="text-xs text-slate-500">MathJax: use \\( ... \\) or $$ ... $$</span>
        <button
          type="button"
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          onClick={handleInsertLatex}
        >
          Insert LaTeX
        </button>
      </div>
      <div ref={hostRef} />
    </div>
  );
}
