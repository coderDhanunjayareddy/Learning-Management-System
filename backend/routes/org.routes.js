import { Router } from 'express';
import {
  listSchools,
  createSchool,
  updateSchool,
  deactivateSchool,
  listSchoolMemberships,
  addSchoolMembership,
  removeSchoolMembership,
  listBatches,
  createBatch,
  updateBatch,
  deactivateBatch,
  listBatchMembers,
  addBatchMember,
  removeBatchMember,
  listRolePermissions,
  upsertRolePermission,
  deleteRolePermission,
} from '../controllers/hierarchy.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Schools
router.get('/schools', requireRole(['super_admin', 'client_admin', 'school_owner']), listSchools);
router.post('/schools', requireRole(['super_admin', 'client_admin']), createSchool);
router.patch('/schools/:id', requireRole(['super_admin', 'client_admin', 'school_owner']), updateSchool);
router.delete('/schools/:id', requireRole(['super_admin', 'client_admin']), deactivateSchool);

// School memberships
router.get('/schools/:schoolId/memberships', requireRole(['super_admin', 'client_admin', 'school_owner']), listSchoolMemberships);
router.post('/schools/:schoolId/memberships', requireRole(['super_admin', 'client_admin', 'school_owner']), addSchoolMembership);
router.delete('/schools/:schoolId/memberships/:userId', requireRole(['super_admin', 'client_admin', 'school_owner']), removeSchoolMembership);

// Batches
router.get('/batches', requireRole(['super_admin', 'client_admin', 'school_owner', 'teacher', 'student']), listBatches);
router.post('/batches', requireRole(['super_admin', 'client_admin', 'school_owner']), createBatch);
router.patch('/batches/:id', requireRole(['super_admin', 'client_admin', 'school_owner']), updateBatch);
router.delete('/batches/:id', requireRole(['super_admin', 'client_admin', 'school_owner']), deactivateBatch);

// Batch members
router.get('/batches/:batchId/members', requireRole(['super_admin', 'client_admin', 'school_owner', 'teacher', 'student']), listBatchMembers);
router.post('/batches/:batchId/members', requireRole(['super_admin', 'client_admin', 'school_owner', 'teacher']), addBatchMember);
router.delete('/batches/:batchId/members/:userId', requireRole(['super_admin', 'client_admin', 'school_owner', 'teacher']), removeBatchMember);

// Role permissions (super admin only)
router.get('/role-permissions', requireRole(['super_admin', 'client_admin']), listRolePermissions);
router.post('/role-permissions', requireRole(['super_admin', 'client_admin']), upsertRolePermission);
router.delete('/role-permissions/:id', requireRole(['super_admin']), deleteRolePermission);

export default router;
