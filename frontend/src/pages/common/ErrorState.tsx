import React from "react";
import { Link, useNavigate } from "react-router-dom";

interface ActionLink {
  label: string;
  to: string;
}

interface ErrorStateProps {
  statusCode?: string | number;
  title: string;
  message: string;
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
  showBack?: boolean;
}

export default function ErrorState({
  statusCode,
  title,
  message,
  primaryAction,
  secondaryAction,
  showBack = true,
}: ErrorStateProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        {statusCode && (
          <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
            {statusCode}
          </div>
        )}
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          {primaryAction && (
            <Link
              to={primaryAction.to}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              to={secondaryAction.to}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {secondaryAction.label}
            </Link>
          )}
          {showBack && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
