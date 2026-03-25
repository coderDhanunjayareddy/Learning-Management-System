import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface ExamRuntimeErrorBoundaryProps {
  children: ReactNode;
}

interface ExamRuntimeErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export default class ExamRuntimeErrorBoundary extends Component<
  ExamRuntimeErrorBoundaryProps,
  ExamRuntimeErrorBoundaryState
> {
  state: ExamRuntimeErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): ExamRuntimeErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unknown runtime error",
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Exam runtime render crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-100 px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="text-xl font-semibold text-rose-700">Exam screen failed to render</h1>
          <p className="mt-2 text-sm text-rose-700">
            {this.state.message || "Unexpected error in exam runtime UI."}
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded bg-rose-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Reload
            </button>
            <Link
              to="/student/exams"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to Exams
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
