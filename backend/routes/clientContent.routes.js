import { Router } from 'express';
import {
  bulkLinkPackContentToCourse,
  getLicensedPackItems,
  linkLicensedContentToCourse,
  listLicensedContent,
  listLicensedPacks,
  removeLinkedContentFromCourse,
} from '../services/clientContent.service.js';
import { authenticateToken, attachClientContext, checkPermission, loadPermissions, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get(
  '/client/licensed-packs',
  requireRole(['client_admin']),
  attachClientContext,
  loadPermissions,
  checkPermission('courses.read'),
  listLicensedPacks
);

router.get(
  '/client/licensed-packs/:id/items',
  requireRole(['client_admin']),
  attachClientContext,
  loadPermissions,
  checkPermission('courses.read'),
  getLicensedPackItems
);

router.get(
  '/client/licensed-content',
  requireRole(['client_admin']),
  attachClientContext,
  loadPermissions,
  checkPermission('courses.read'),
  listLicensedContent
);

router.post(
  '/admin/courses/:courseId/linked-content',
  requireRole(['client_admin']),
  attachClientContext,
  loadPermissions,
  checkPermission('courses.update'),
  linkLicensedContentToCourse
);

router.post(
  '/admin/courses/:courseId/linked-content/bulk',
  requireRole(['client_admin']),
  attachClientContext,
  loadPermissions,
  checkPermission('courses.update'),
  bulkLinkPackContentToCourse
);

router.delete(
  '/admin/courses/:courseId/linked-content/:linkedContentId',
  requireRole(['client_admin']),
  attachClientContext,
  loadPermissions,
  checkPermission('courses.update'),
  removeLinkedContentFromCourse
);

export default router;
