import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Batch {
  id: number;
  name: string;
  school_id: number;
}

interface Member {
  id: number;
  full_name: string;
  email: string;
}

export default function TeacherBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);

  const loadBatches = async () => {
    const res = await api.get('/org/batches');
    setBatches(res.data);
  };

  const loadMembers = async (batchId: string) => {
    const res = await api.get(`/org/batches/${batchId}/members`);
    setMembers(res.data);
  };

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      loadMembers(selectedBatch);
    }
  }, [selectedBatch]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">My Batches</h1>
      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Select a batch</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.name}
            </option>
          ))}
        </select>
        <div className="mt-4 space-y-2">
          {members.map((member) => (
            <div key={member.id} className="rounded-xl border border-slate-100 p-3">
              <div className="font-semibold">{member.full_name}</div>
              <div className="text-xs text-slate-500">{member.email}</div>
            </div>
          ))}
          {selectedBatch && members.length === 0 && (
            <div className="text-sm text-slate-500">No members in this batch yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}


