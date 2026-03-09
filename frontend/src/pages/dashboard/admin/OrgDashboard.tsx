import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import BulkSetup from './BulkSetup';

type TabKey = 'schools' | 'schoolMembers' | 'batches' | 'batchMembers' | 'roles' | 'users' | 'bulkSetup';

interface School {
  id: number;
  name: string;
  school_code?: string | null;
  status: string;
}

interface Batch {
  id: number;
  name: string;
  school_id: number;
  is_active: boolean;
}

interface RolePermission {
  id: number;
  role: string;
  permission: string;
  granted: boolean;
  client_id: number | null;
}

interface Membership {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  role_scope: string;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export default function OrgDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('schools');
  const [schools, setSchools] = useState<School[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [schoolMembers, setSchoolMembers] = useState<Membership[]>([]);
  const [batchMembers, setBatchMembers] = useState<Membership[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  const [schoolForm, setSchoolForm] = useState({ name: '', school_code: '' });
  const [batchForm, setBatchForm] = useState({ name: '', school_id: '' });
  const [schoolMemberForm, setSchoolMemberForm] = useState({ user_id: '', role_scope: 'teacher', is_primary: false });
  const [batchMemberForm, setBatchMemberForm] = useState({ user_id: '', is_primary: false });
  const [roleForm, setRoleForm] = useState({ role: 'teacher', permission: 'courses.read', granted: true });
  const [userForm, setUserForm] = useState({ email: '', full_name: '', password: '', role: 'teacher', school_id: '' });

  const loadSchools = async () => {
    const res = await api.get('/org/schools');
    setSchools(res.data);
  };

  const loadBatches = async (schoolId?: string) => {
    const query = schoolId ? `?school_id=${schoolId}` : '';
    const res = await api.get(`/org/batches${query}`);
    setBatches(res.data);
  };

  const loadSchoolMembers = async (schoolId: string) => {
    const res = await api.get(`/org/schools/${schoolId}/memberships`);
    setSchoolMembers(res.data);
  };

  const loadBatchMembers = async (batchId: string) => {
    const res = await api.get(`/org/batches/${batchId}/members`);
    setBatchMembers(res.data);
  };

  const loadRolePermissions = async () => {
    const role = user?.role;
    if (!role || (role !== 'super_admin' && role !== 'client_admin')) return;
    const res = await api.get('/org/role-permissions?scope=client');
    setRolePermissions(res.data);
  };

  const loadUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  useEffect(() => {
    loadSchools();
    loadBatches();
    loadUsers();
  }, []);

  useEffect(() => {
    loadRolePermissions();
  }, [user?.role]);

  useEffect(() => {
    if (selectedSchoolId) loadSchoolMembers(selectedSchoolId);
  }, [selectedSchoolId]);

  useEffect(() => {
    if (selectedBatchId) loadBatchMembers(selectedBatchId);
  }, [selectedBatchId]);

  const createSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/org/schools', schoolForm);
    setSchoolForm({ name: '', school_code: '' });
    loadSchools();
  };

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/org/batches', batchForm);
    setBatchForm({ name: '', school_id: '' });
    loadBatches(batchForm.school_id);
  };

  const addSchoolMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId) return;
    await api.post(`/org/schools/${selectedSchoolId}/memberships`, schoolMemberForm);
    setSchoolMemberForm({ user_id: '', role_scope: 'teacher', is_primary: false });
    loadSchoolMembers(selectedSchoolId);
  };

  const addBatchMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    await api.post(`/org/batches/${selectedBatchId}/members`, batchMemberForm);
    setBatchMemberForm({ user_id: '', is_primary: false });
    loadBatchMembers(selectedBatchId);
  };

  const upsertRolePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/org/role-permissions', roleForm);
    setRoleForm({ role: 'teacher', permission: 'courses.read', granted: true });
    loadRolePermissions();
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/users', userForm);
    setUserForm({ email: '', full_name: '', password: '', role: 'teacher', school_id: '' });
    loadUsers();
  };

  const tabs: { key: TabKey; label: string; roles?: string[] }[] = [
    { key: 'schools', label: 'Schools', roles: ['super_admin', 'client_admin', 'school_owner'] },
    { key: 'schoolMembers', label: 'School Members', roles: ['super_admin', 'client_admin', 'school_owner'] },
    { key: 'batches', label: 'Batches', roles: ['super_admin', 'client_admin', 'school_owner'] },
    { key: 'batchMembers', label: 'Batch Members', roles: ['super_admin', 'client_admin', 'school_owner', 'teacher'] },
    { key: 'roles', label: 'Role Permissions', roles: ['super_admin', 'client_admin'] },
    { key: 'users', label: 'Users', roles: ['super_admin', 'client_admin', 'school_owner'] },
    { key: 'bulkSetup', label: 'Bulk Upload', roles: ['super_admin', 'client_admin', 'school_owner'] },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Dashboard
          </button>
          <h2 className="text-lg font-semibold text-slate-900">Organization Setup</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {tabs
            .filter((tab) => !tab.roles || tab.roles.includes(user?.role || ''))
            .map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  activeTab === tab.key ? 'bg-blue-900 text-white' : 'bg-white text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {activeTab === 'schools' && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Schools</h3>
              <div className="mt-4 space-y-3">
                {schools.map((school) => (
                  <div key={school.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="font-semibold">{school.name}</div>
                    <div className="text-xs text-slate-500">Code: {school.school_code || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={createSchool} className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Create School</h3>
              <div className="mt-4 space-y-3">
                <input
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  placeholder="School name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={schoolForm.school_code}
                  onChange={(e) => setSchoolForm({ ...schoolForm, school_code: e.target.value })}
                  placeholder="School code"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white">
                  Create School
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'schoolMembers' && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 space-y-3">
                {schoolMembers.map((member) => (
                  <div key={member.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="font-semibold">{member.full_name}</div>
                    <div className="text-xs text-slate-500">
                      {member.email} â€¢ {member.role_scope}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={addSchoolMember} className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Add School Member</h3>
              <div className="mt-4 space-y-3">
                <input
                  value={schoolMemberForm.user_id}
                  onChange={(e) => setSchoolMemberForm({ ...schoolMemberForm, user_id: e.target.value })}
                  placeholder="User ID"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <select
                  value={schoolMemberForm.role_scope}
                  onChange={(e) => setSchoolMemberForm({ ...schoolMemberForm, role_scope: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="school_owner">School Owner</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white">
                  Add Member
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'batches' && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Batches</h3>
              <div className="mt-4 space-y-3">
                {batches.map((batch) => (
                  <div key={batch.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="font-semibold">{batch.name}</div>
                    <div className="text-xs text-slate-500">School ID: {batch.school_id}</div>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={createBatch} className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Create Batch</h3>
              <div className="mt-4 space-y-3">
                <select
                  value={batchForm.school_id}
                  onChange={(e) => setBatchForm({ ...batchForm, school_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
                <input
                  value={batchForm.name}
                  onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                  placeholder="Batch name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white">
                  Create Batch
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'batchMembers' && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
              <div className="mt-4 space-y-3">
                {batchMembers.map((member) => (
                  <div key={member.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="font-semibold">{member.full_name}</div>
                    <div className="text-xs text-slate-500">{member.email}</div>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={addBatchMember} className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Add Batch Member</h3>
              <div className="mt-4 space-y-3">
                <input
                  value={batchMemberForm.user_id}
                  onChange={(e) => setBatchMemberForm({ ...batchMemberForm, user_id: e.target.value })}
                  placeholder="User ID"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white">
                  Add Member
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'roles' && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Role Permissions</h3>
              <div className="mt-4 space-y-2">
                {rolePermissions.map((perm) => (
                  <div key={perm.id} className="rounded-xl border border-slate-100 p-3 text-sm">
                    <div className="font-semibold">{perm.role}</div>
                    <div className="text-xs text-slate-500">{perm.permission}</div>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={upsertRolePermission} className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Add Permission</h3>
              <div className="mt-4 space-y-3">
                <input
                  value={roleForm.permission}
                  onChange={(e) => setRoleForm({ ...roleForm, permission: e.target.value })}
                  placeholder="Permission"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <select
                  value={roleForm.role}
                  onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="client_admin">Client Admin</option>
                  <option value="school_owner">School Owner</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
                <button className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white">
                  Save Permission
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Users</h3>
              <div className="mt-4 space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="font-semibold">{u.full_name}</div>
                    <div className="text-xs text-slate-500">{u.email} â€¢ {u.role}</div>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={createUser} className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Create User</h3>
              <div className="mt-4 space-y-3">
                <input
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="Email"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Password"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="school_owner">School Owner</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
                <input
                  value={userForm.school_id}
                  onChange={(e) => setUserForm({ ...userForm, school_id: e.target.value })}
                  placeholder="School ID (optional)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white">
                  Create User
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'bulkSetup' && (
          <section className="mt-6">
            <BulkSetup />
          </section>
        )}
      </div>
    </div>
  );
}


