import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import api from '@/lib/api';

type CsvRow = Record<string, string>;

type BulkResult = {
  success: number;
  failed: number;
  errors: string[];
};

const parseCsvLine = (line: string) => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((value) => value.replace(/^"|"$/g, '').trim());
};

const parseCsv = (text: string): CsvRow[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
};

const downloadTemplate = (name: string, headers: string[]) => {
  const csv = `${headers.join(',')}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

type BulkCardProps = {
  title: string;
  description: string;
  templateName: string;
  headers: string[];
  onUploadRows: (rows: CsvRow[]) => Promise<BulkResult>;
};

function BulkCard({ title, description, templateName, headers, onUploadRows }: BulkCardProps) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => rows.slice(0, 3), [rows]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    setResult(null);
    setError(parsed.length === 0 ? 'No rows detected in CSV.' : null);
  };

  const handleUpload = async () => {
    if (rows.length === 0) {
      setError('Please upload a CSV with rows.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const uploadResult = await onUploadRows(rows);
      setResult(uploadResult);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Bulk upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <button
          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => downloadTemplate(templateName, headers)}
        >
          Download Template
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? 'Uploading...' : 'Upload CSV'}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {rows.length > 0 ? (
        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
          <div className="font-semibold text-slate-700">Preview ({rows.length} rows)</div>
          <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(preview, null, 2)}</pre>
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-lg border border-slate-100 bg-white p-3 text-sm">
          <p className="font-semibold text-slate-700">Upload Summary</p>
          <p className="text-slate-600">Success: {result.success}</p>
          <p className="text-slate-600">Failed: {result.failed}</p>
          {result.errors.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-600">
              {result.errors.slice(0, 5).map((msg, index) => (
                <li key={`${msg}-${index}`}>{msg}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const headers = {
  schools: [
    'name',
    'school_code',
    'board',
    'affiliation_no',
    'address_line1',
    'city',
    'state',
    'pincode',
    'country',
    'timezone',
    'phone',
    'email',
    'principal_name',
  ],
  users: ['full_name', 'email', 'password', 'role', 'school_id', 'user_id'],
  schoolMembers: ['school_id', 'user_id', 'role_scope', 'is_primary'],
  batches: ['school_id', 'name', 'code', 'metadata'],
  batchMembers: ['batch_id', 'user_id', 'is_primary'],
};

export default function BulkSetup() {
  const uploadSchools = async (rows: CsvRow[]): Promise<BulkResult> => {
    let success = 0;
    const errors: string[] = [];
    for (const [index, row] of rows.entries()) {
      try {
        await api.post('/org/schools', {
          name: row.name,
          school_code: row.school_code || null,
          board: row.board || null,
          affiliation_no: row.affiliation_no || null,
          address_line1: row.address_line1 || null,
          city: row.city || null,
          state: row.state || null,
          pincode: row.pincode || null,
          country: row.country || null,
          timezone: row.timezone || null,
          phone: row.phone || null,
          email: row.email || null,
          principal_name: row.principal_name || null,
        });
        success += 1;
      } catch (err: any) {
        errors.push(`Row ${index + 1}: ${err?.response?.data?.error || 'Failed to create school'}`);
      }
    }
    return { success, failed: rows.length - success, errors };
  };

  const uploadUsers = async (rows: CsvRow[]): Promise<BulkResult> => {
    let success = 0;
    const errors: string[] = [];
    for (const [index, row] of rows.entries()) {
      try {
        await api.post('/users', {
          full_name: row.full_name,
          email: row.email,
          password: row.password,
          role: row.role,
          school_id: row.school_id ? Number(row.school_id) : undefined,
          user_id: row.user_id || undefined,
        });
        success += 1;
      } catch (err: any) {
        errors.push(`Row ${index + 1}: ${err?.response?.data?.error || 'Failed to create user'}`);
      }
    }
    return { success, failed: rows.length - success, errors };
  };

  const uploadSchoolMembers = async (rows: CsvRow[]): Promise<BulkResult> => {
    let success = 0;
    const errors: string[] = [];
    for (const [index, row] of rows.entries()) {
      try {
        const schoolId = Number(row.school_id);
        await api.post(`/org/schools/${schoolId}/memberships`, {
          user_id: Number(row.user_id),
          role_scope: row.role_scope,
          is_primary: row.is_primary === 'true' || row.is_primary === '1',
        });
        success += 1;
      } catch (err: any) {
        errors.push(`Row ${index + 1}: ${err?.response?.data?.error || 'Failed to add school member'}`);
      }
    }
    return { success, failed: rows.length - success, errors };
  };

  const uploadBatches = async (rows: CsvRow[]): Promise<BulkResult> => {
    let success = 0;
    const errors: string[] = [];
    for (const [index, row] of rows.entries()) {
      try {
        const metadata = row.metadata ? JSON.parse(row.metadata) : undefined;
        await api.post('/org/batches', {
          school_id: Number(row.school_id),
          name: row.name,
          code: row.code || null,
          metadata,
        });
        success += 1;
      } catch (err: any) {
        errors.push(`Row ${index + 1}: ${err?.response?.data?.error || 'Failed to create batch'}`);
      }
    }
    return { success, failed: rows.length - success, errors };
  };

  const uploadBatchMembers = async (rows: CsvRow[]): Promise<BulkResult> => {
    let success = 0;
    const errors: string[] = [];
    for (const [index, row] of rows.entries()) {
      try {
        const batchId = Number(row.batch_id);
        await api.post(`/org/batches/${batchId}/members`, {
          user_id: Number(row.user_id),
          is_primary: row.is_primary === 'true' || row.is_primary === '1',
        });
        success += 1;
      } catch (err: any) {
        errors.push(`Row ${index + 1}: ${err?.response?.data?.error || 'Failed to add batch member'}`);
      }
    }
    return { success, failed: rows.length - success, errors };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Bulk Setup</h2>
        <p className="text-sm text-slate-600">
          Upload CSVs to register schools, users, memberships, and batches in bulk.
        </p>
      </div>

      <BulkCard
        title="Bulk Schools Upload"
        description="Create multiple schools at once. Use the template CSV."
        templateName="schools-template.csv"
        headers={headers.schools}
        onUploadRows={uploadSchools}
      />

      <BulkCard
        title="Bulk Users Upload"
        description="Create teachers, students, and school owners. Role values: school_owner, teacher, student."
        templateName="users-template.csv"
        headers={headers.users}
        onUploadRows={uploadUsers}
      />

      <BulkCard
        title="Bulk School Memberships"
        description="Assign users to schools with role scope."
        templateName="school-memberships-template.csv"
        headers={headers.schoolMembers}
        onUploadRows={uploadSchoolMembers}
      />

      <BulkCard
        title="Bulk Batches Upload"
        description="Create batches/classes. Metadata column can contain JSON."
        templateName="batches-template.csv"
        headers={headers.batches}
        onUploadRows={uploadBatches}
      />

      <BulkCard
        title="Bulk Batch Members"
        description="Assign students/teachers to batches."
        templateName="batch-members-template.csv"
        headers={headers.batchMembers}
        onUploadRows={uploadBatchMembers}
      />
    </div>
  );
}
