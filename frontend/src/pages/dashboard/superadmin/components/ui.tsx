import React from 'react';

export function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
      {caption && <div className="mt-1 text-xs text-slate-500">{caption}</div>}
    </div>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
      {children}
    </label>
  );
}

export function PrimaryButton({
  children,
  type = 'button',
  disabled,
  onClick,
  className = '',
}: {
  children: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
        disabled ? 'cursor-not-allowed bg-slate-300' : 'bg-[#073b8a] hover:bg-[#16263b]'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
        disabled
          ? 'cursor-not-allowed border-slate-100 text-slate-400'
          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function ActionCard({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        {actionLabel}
      </button>
    </div>
  );
}
