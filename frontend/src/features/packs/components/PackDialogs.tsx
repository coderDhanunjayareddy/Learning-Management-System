import type { FormEvent, ReactNode } from 'react';
import { FieldLabel, GhostButton, PrimaryButton } from '@/pages/dashboard/superadmin/components/ui';
import type {
  ClientOption,
  EditableCourseFormValues,
  EditablePackFormValues,
  PackEntitlementFormValues,
  PackSummary,
} from '../types';

interface PackFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  submitting: boolean;
  form: EditablePackFormValues;
  errors: { name?: string };
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormChange: (field: keyof EditablePackFormValues, value: string) => void;
}

interface DeletePackDialogProps {
  open: boolean;
  pack: PackSummary | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface CreateCourseDialogProps {
  open: boolean;
  submitting: boolean;
  form: EditableCourseFormValues;
  errors: { name?: string; grade?: string };
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormChange: (field: keyof EditableCourseFormValues, value: string) => void;
}

interface EntitlementDialogProps {
  open: boolean;
  pack: PackSummary | null;
  clients: ClientOption[];
  clientsLoading: boolean;
  currentClientLabel?: string | null;
  submitting: boolean;
  form: PackEntitlementFormValues;
  errors: { client_id?: string; start_at?: string; end_at?: string };
  isClientLocked: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormChange: (field: keyof Omit<PackEntitlementFormValues, 'pack_id'>, value: string) => void;
}

function ModalShell({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{eyebrow}</div>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PackFormDialog({
  open,
  mode,
  submitting,
  form,
  errors,
  onClose,
  onSubmit,
  onFormChange,
}: PackFormDialogProps) {
  if (!open) return null;

  const isEdit = mode === 'edit';

  return (
    <ModalShell
      title={isEdit ? 'Edit content pack' : 'Create a new content pack'}
      eyebrow={isEdit ? 'Edit Pack' : 'Create Pack'}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <FieldLabel>Name</FieldLabel>
          <input
            value={form.name}
            onChange={(event) => onFormChange('name', event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            placeholder="Pack name"
          />
          {errors.name && <p className="mt-2 text-sm text-rose-600">{errors.name}</p>}
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={form.description}
            onChange={(event) => onFormChange('description', event.target.value)}
            className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            placeholder="Short description for this pack"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Save Changes' : 'Create Pack'}
          </PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}

export function DeletePackDialog({
  open,
  pack,
  submitting,
  onClose,
  onConfirm,
}: DeletePackDialogProps) {
  if (!open || !pack) return null;

  return (
    <ModalShell
      title="Deactivate content pack"
      eyebrow="Soft Delete"
      onClose={onClose}
    >
      <div className="mt-6 space-y-5">
        <p className="text-sm text-slate-600">
          This will mark <span className="font-semibold text-slate-900">{pack.name}</span> as inactive. Its record stays in the system, but the pack will no longer be treated as active.
        </p>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Delete here means soft delete only.
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
              submitting ? 'cursor-not-allowed bg-slate-300' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {submitting ? 'Deactivating...' : 'Deactivate Pack'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function CreateCourseDialog({
  open,
  submitting,
  form,
  errors,
  onClose,
  onSubmit,
  onFormChange,
}: CreateCourseDialogProps) {
  if (!open) return null;

  return (
    <ModalShell
      title="Create a new course"
      eyebrow="Create Course"
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          This course will be created in the platform course library and become available in the builder list.
        </div>
        <div>
          <FieldLabel>Name</FieldLabel>
          <input
            value={form.name}
            onChange={(event) => onFormChange('name', event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            placeholder="Course name"
            autoFocus
          />
          {errors.name && <p className="mt-2 text-sm text-rose-600">{errors.name}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Grade</FieldLabel>
            <input
              value={form.grade}
              onChange={(event) => onFormChange('grade', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              placeholder="Grade 8"
            />
            {errors.grade && <p className="mt-2 text-sm text-rose-600">{errors.grade}</p>}
          </div>
          <div>
            <FieldLabel>Subject</FieldLabel>
            <input
              value={form.subject}
              onChange={(event) => onFormChange('subject', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              placeholder="Science"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <GhostButton onClick={onClose} className="!w-full !rounded-xl !px-4 !py-3 !text-sm">
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Course'}
          </PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}

export function EntitlementDialog({
  open,
  pack,
  clients,
  clientsLoading,
  currentClientLabel,
  submitting,
  form,
  errors,
  isClientLocked,
  onClose,
  onSubmit,
  onFormChange,
}: EntitlementDialogProps) {
  if (!open || !pack) return null;

  return (
    <ModalShell
      title="Grant pack entitlement"
      eyebrow="Entitlement"
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <FieldLabel>Pack</FieldLabel>
          <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {pack.name}
          </div>
        </div>
        <div>
          <FieldLabel>Client</FieldLabel>
          {isClientLocked ? (
            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {currentClientLabel || `Client ${form.client_id}`}
            </div>
          ) : (
            <select
              value={form.client_id}
              onChange={(event) => onFormChange('client_id', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              disabled={clientsLoading}
            >
              <option value="">{clientsLoading ? 'Loading clients...' : 'Select client'}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          )}
          {errors.client_id && <p className="mt-2 text-sm text-rose-600">{errors.client_id}</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Start At</FieldLabel>
            <input
              type="datetime-local"
              value={form.start_at}
              onChange={(event) => onFormChange('start_at', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
            {errors.start_at && <p className="mt-2 text-sm text-rose-600">{errors.start_at}</p>}
          </div>
          <div>
            <FieldLabel>End At</FieldLabel>
            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(event) => onFormChange('end_at', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
            {errors.end_at && <p className="mt-2 text-sm text-rose-600">{errors.end_at}</p>}
          </div>
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select
            value={form.status}
            onChange={(event) => onFormChange('status', event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
          >
            <option value="active">active</option>
            <option value="pending">pending</option>
            <option value="grace">grace</option>
            <option value="expired">expired</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <GhostButton onClick={onClose} className="!w-full !rounded-xl !px-4 !py-3 !text-sm">
            Cancel
          </GhostButton>
          <PrimaryButton
            type="submit"
            disabled={submitting || !form.client_id || !form.start_at || !form.end_at}
          >
            {submitting ? 'Granting...' : 'Grant Entitlement'}
          </PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}
