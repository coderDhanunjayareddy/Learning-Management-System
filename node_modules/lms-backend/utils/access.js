// backend/utils/access.js
import pool from '../config/db.js';

export const isSuperAdmin = (req) => req.user?.role === 'super_admin';

export const ensureClientScope = async (clientId, req) => {
  if (isSuperAdmin(req)) return true;
  const requesterClientId = req.user?.client_id;
  return Boolean(requesterClientId) && requesterClientId === clientId;
};

export const getSchoolContext = async (schoolId) => {
  const result = await pool.query(
    `SELECT id, client_id FROM schools WHERE id = $1`,
    [schoolId]
  );
  return result.rows[0] || null;
};

export const getBatchContext = async (batchId) => {
  const result = await pool.query(
    `SELECT id, client_id, school_id FROM batches WHERE id = $1`,
    [batchId]
  );
  return result.rows[0] || null;
};

export const isSchoolOwnerForSchool = async (schoolId, userId) => {
  const result = await pool.query(
    `
    SELECT 1
    FROM school_memberships
    WHERE school_id = $1
      AND user_id = $2
      AND role_scope IN ('school_owner', 'admin')
      AND status = 'active'
    `,
    [schoolId, userId]
  );
  return result.rows.length > 0;
};

export const isSchoolMember = async (schoolId, userId) => {
  const result = await pool.query(
    `
    SELECT 1
    FROM school_memberships
    WHERE school_id = $1
      AND user_id = $2
      AND status = 'active'
    `,
    [schoolId, userId]
  );
  return result.rows.length > 0;
};

export const isBatchMember = async (batchId, userId) => {
  const result = await pool.query(
    `SELECT 1 FROM batch_members WHERE batch_id = $1 AND user_id = $2`,
    [batchId, userId]
  );
  return result.rows.length > 0;
};

export const canAccessSchool = async (schoolId, req) => {
  if (isSuperAdmin(req)) return true;
  const role = req.user?.role;
  const userId = req.user?.id;
  const requesterClientId = req.user?.client_id;
  if (!requesterClientId) return false;

  const school = await getSchoolContext(schoolId);
  if (!school || school.client_id !== requesterClientId) return false;

  if (role === 'client_admin') return true;
  if (role === 'school_owner') return isSchoolOwnerForSchool(schoolId, userId);
  if (role === 'teacher' || role === 'student') return isSchoolMember(schoolId, userId);
  return false;
};

export const canAccessBatch = async (batchId, req) => {
  if (isSuperAdmin(req)) return true;
  const role = req.user?.role;
  const userId = req.user?.id;
  const requesterClientId = req.user?.client_id;
  if (!requesterClientId) return false;

  const batch = await getBatchContext(batchId);
  if (!batch || batch.client_id !== requesterClientId) return false;

  if (role === 'client_admin') return true;
  if (role === 'school_owner') return isSchoolOwnerForSchool(batch.school_id, userId);
  if (role === 'teacher' || role === 'student') return isBatchMember(batchId, userId);
  return false;
};
