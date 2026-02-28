# Backend Routes and DB Touchpoints

Source: `backend/server.js` and `backend/routes/*.js`

This doc lists the **current** routes, what they do, and which tables they read/write.

## Base Paths
- `/api/superadmin` -> `backend/routes/superadmin.routes.js`
- `/api/admin` -> `backend/routes/admin.routes.js` + `backend/routes/enrollment.routes.js`
- `/api/auth` -> `backend/routes/auth.routes.js`
- `/api/teacher` -> `backend/routes/teacher.routes.js`
- `/api/student` -> `backend/routes/student.routes.js`
- `/api/scorm` -> `backend/routes/scorm.routes.js`
- `/api/course` -> `backend/routes/course.routes.js`
- `/api/users` -> `backend/routes/user.routes.js`
- `/api/platform` -> `backend/routes/platform.routes.js`
- `/api/org` -> `backend/routes/org.routes.js`

## Auth Routes (`/api/auth`)
- `POST /register`
  - Controller: `register` in `backend/controllers/auth.controller.js`
  - Action: inserts a user with hashed password for allowed roles (`student`, `teacher`)
  - Tables: `users` (INSERT)
- `POST /login`
  - Controller: `login` in `backend/controllers/auth.controller.js`
  - Action: validates password, updates last login
  - Tables: `users` (SELECT + UPDATE)
- `GET /me` (auth required)
  - Inline handler in `backend/routes/auth.routes.js`
  - Action: returns `req.user` from auth middleware
  - Tables: none (uses `authenticateToken` which fetches user)

## Super Admin Routes (`/api/superadmin`)
- `POST /register-admin` (auth required, role must be `super_admin`)
  - Controller: `registerAdmin` in `backend/controllers/auth.controller.js`
  - Action: creates a user with role `admin`
  - Tables: `users` (INSERT)

## Admin Routes (`/api/admin`)
Routes in `backend/routes/admin.routes.js`
- `GET /courses` (auth required)
  - Controller: `getAllCourses` in `backend/controllers/admin.controller.js`
  - Tables: `courses` (SELECT)
- `POST /courses` (auth required)
  - Controller: `createCourse`
  - Tables: `courses` (INSERT)
- `PATCH /courses/:id` (auth required)
  - Controller: `updateCourse`
  - Tables: `courses` (UPDATE)
- `DELETE /courses/:id` (auth required)
  - Controller: `deleteCourse`
  - Tables: `courses` (DELETE)
- `PATCH /courses/:id/publish` (auth required)
  - Controller: `publishCourse`
  - Tables: `courses` (UPDATE)
- `GET /courses/:courseId/content` (auth required)
  - Controller: `getCourseContent`
  - Tables: `content_items` (SELECT), `student_attempts` (LEFT JOIN)
- `POST /courses/:courseId/content` (auth required)
  - Controller: `createContentItem`
  - Action: creates only `folder` or `link` items
  - Tables: `content_items` (INSERT)
- `POST /courses/:courseId/content/upload` (auth required, file upload)
  - Controller: `uploadContentFile` in `backend/controllers/scorm.controller.js`
  - Action: uploads file to Supabase Storage, then creates content item
  - Tables: `content_items` (INSERT)
  - Storage: Supabase bucket `process.env.SUPABASE_BUCKET` (default `courses`)
- `PUT /courses/:courseId/content/:itemId/file` (auth required, file upload)
  - Controller: `updateContentFile` in `backend/controllers/scorm.controller.js`
  - Action: uploads new file, updates content item, deletes old file from storage
  - Tables: `content_items` (SELECT + UPDATE)
  - Storage: Supabase bucket `process.env.SUPABASE_BUCKET` (default `courses`)
- `DELETE /courses/:courseId/content/:id` (auth required)
  - Controller: `deleteContentItem` in `backend/controllers/content.controller.js`
  - Tables: `content_items` (SELECT + DELETE)
- `PUT /courses/:courseId/content/:id/rename` (auth required)
  - Controller: `renameContentItem` in `backend/controllers/content.controller.js`
  - Tables: `content_items` (SELECT + UPDATE)
- `GET /view/*`
  - Controller: `viewScormFile` in `backend/controllers/scorm.controller.js`
  - Action: streams file from Supabase Storage
  - Tables: none
  - Storage: Supabase bucket `course-files`

### Enrollment Routes under `/api/admin`
Routes in `backend/routes/enrollment.routes.js` mounted at `/api/admin`
- `POST /courses/:courseId/enroll-by-email` (auth required)
  - Controller: `enrollUserByEmail` in `backend/controllers/enrollment.controller.js`
  - Tables: `users` (SELECT), `enrollments` (SELECT + INSERT)
- `GET /courses/:courseId/enrollments` (auth required)
  - Controller: `getCourseEnrollments`
  - Tables: `enrollments` (SELECT), `users` (JOIN)
- `DELETE /courses/:id/enrollments/:userId` (auth required)
  - Controller: `deleteEnrollment`
  - Tables: `enrollments` (DELETE)
- `PATCH /courses/:id/enrollments/:userId` (auth required)
  - Controller: `updateEnrollmentRole`
  - Tables: `enrollments` (UPDATE)

## Course Routes (`/api/course`)
Routes in `backend/routes/course.routes.js`
- `GET /courses` (public)
  - Controller: `getAllCourses`
  - Tables: `courses` (SELECT)

## Teacher Routes (`/api/teacher`)
Routes in `backend/routes/teacher.routes.js`
- `GET /course/:courseId` (auth required)
  - Controller: `getTeacherCourse` in `backend/controllers/enrollment.controller.js`
  - Tables: `enrollments` (SELECT), `courses` (JOIN), `chapters` (SELECT), `content_items` (SELECT)
  - Note: `chapters` and `content_items.chapter_id` are referenced here but **no `chapters` table exists** in the provided SQL schema.

## Student Routes (`/api/student`)
Routes in `backend/routes/student.routes.js`
- `GET /content/:id` (auth required)
  - Controller: `getStudentContentById` in `backend/controllers/student.controller.js`
  - Tables: `content_items` (SELECT)
- `GET /enrolled-courses` (auth required)
  - Controller: `getStudentEnrolledCourses` in `backend/controllers/enrollment.controller.js`
  - Tables: `enrollments` (SELECT), `courses` (JOIN)
- `GET /course/:courseId` (auth required)
  - Controller: `getStudentCourse` in `backend/controllers/enrollment.controller.js`
  - Tables: `enrollments` (SELECT), `courses` (JOIN), `content_items` (SELECT), `student_attempts` (LATERAL SELECT)
- `POST /item-attempt` (auth required)
  - Controller: `recordItemAttempt` in `backend/controllers/studentAttempts.controller.js`
  - Tables: `student_attempts` (SELECT + INSERT/UPDATE)

## SCORM Routes (`/api/scorm`)
Routes in `backend/routes/scorm.routes.js`
- `POST /commit`
  - Controller: `saveScormProgress` in `backend/controllers/scorm.controller.js`
  - Tables: `scorm_attempts` (INSERT/UPDATE)
  - Note: `scorm_attempts` is **not** in the SQL schema; schema defines `student_attempts`.
- `GET /progress/:userId/:contentId`
  - Controller: `getScormProgress`
  - Tables: `scorm_attempts` (SELECT)
- `GET /content/:id` (auth required)
  - Controller: `getStudentContentById` in `backend/controllers/student.controller.js`
  - Tables: `content_items` (SELECT)
- `GET /signed-url`
  - Controller: `getSignedContentUrl`
  - Tables: none
  - Storage: Supabase bucket `process.env.SUPABASE_BUCKET` (default `courses`)

### Additional SCORM handler in server
- `GET /api/scorm/*` (special handler in `backend/server.js`)
  - Controller: `viewScormFile`
  - Tables: none
  - Storage: Supabase bucket `course-files`

## Users Routes (`/api/users`)
Routes in `backend/routes/user.routes.js`
- `GET /` (auth required)
  - Controller: `getAllUsers` in `backend/controllers/user.controller.js`
  - Tables: `users` (SELECT)
- `GET /stats` (auth required)
  - Controller: `getDashboardStats`
  - Tables: `users` (SELECT), `enrollments` (SELECT), `student_attempts` (SELECT)
- `POST /` (auth required)
  - Controller: `createUser` in `backend/controllers/hierarchy.controller.js`
  - Tables: `users` (INSERT), `school_memberships` (optional)
- `PATCH /:id` (auth required)
  - Controller: `updateUser`
  - Tables: `users` (UPDATE)
- `DELETE /:id` (auth required)
  - Controller: `deactivateUser`
  - Tables: `users` (UPDATE)

## Platform Routes (`/api/platform`)
Routes in `backend/routes/platform.routes.js`
- `GET /clients`
  - Controller: `listClients` in `backend/controllers/platform.controller.js`
  - Tables: `clients` (SELECT)
- `POST /clients`
  - Controller: `createClient`
  - Tables: `clients` (INSERT)
- `PATCH /clients/:id`
  - Controller: `updateClient`
  - Tables: `clients` (UPDATE)
- `DELETE /clients/:id`
  - Controller: `deactivateClient`
  - Tables: `clients` (UPDATE)
- `GET /content-packs`
  - Controller: `listContentPacks`
  - Tables: `content_packs` (SELECT)
- `POST /content-packs`
  - Controller: `createContentPack`
  - Tables: `content_packs` (INSERT)
- `PATCH /content-packs/:id`
  - Controller: `updateContentPack`
  - Tables: `content_packs` (UPDATE)
- `DELETE /content-packs/:id`
  - Controller: `deactivateContentPack`
  - Tables: `content_packs` (UPDATE)
- `POST /content-packs/:id/items`
  - Controller: `addContentPackItems`
  - Tables: `content_pack_items` (INSERT)
- `DELETE /content-packs/:id/items/:contentId`
  - Controller: `removeContentPackItem`
  - Tables: `content_pack_items` (DELETE)
- `GET /entitlements`
  - Controller: `listEntitlements`
  - Tables: `content_entitlements` (SELECT)
- `POST /entitlements`
  - Controller: `createEntitlement`
  - Tables: `content_entitlements` (INSERT)
- `PATCH /entitlements/:id`
  - Controller: `updateEntitlement`
  - Tables: `content_entitlements` (UPDATE)
- `DELETE /entitlements/:id`
  - Controller: `revokeEntitlement`
  - Tables: `content_entitlements` (UPDATE)

## Organization Routes (`/api/org`)
Routes in `backend/routes/org.routes.js`
- `GET /schools`
  - Controller: `listSchools` in `backend/controllers/hierarchy.controller.js`
  - Tables: `schools` (SELECT)
- `POST /schools`
  - Controller: `createSchool`
  - Tables: `schools` (INSERT)
- `PATCH /schools/:id`
  - Controller: `updateSchool`
  - Tables: `schools` (UPDATE)
- `DELETE /schools/:id`
  - Controller: `deactivateSchool`
  - Tables: `schools` (UPDATE)
- `GET /schools/:schoolId/memberships`
  - Controller: `listSchoolMemberships`
  - Tables: `school_memberships`, `users` (SELECT)
- `POST /schools/:schoolId/memberships`
  - Controller: `addSchoolMembership`
  - Tables: `school_memberships` (INSERT/UPDATE)
- `DELETE /schools/:schoolId/memberships/:userId`
  - Controller: `removeSchoolMembership`
  - Tables: `school_memberships` (DELETE)
- `GET /batches`
  - Controller: `listBatches`
  - Tables: `batches` (SELECT)
- `POST /batches`
  - Controller: `createBatch`
  - Tables: `batches` (INSERT)
- `PATCH /batches/:id`
  - Controller: `updateBatch`
  - Tables: `batches` (UPDATE)
- `DELETE /batches/:id`
  - Controller: `deactivateBatch`
  - Tables: `batches` (UPDATE)
- `GET /batches/:batchId/members`
  - Controller: `listBatchMembers`
  - Tables: `batch_members`, `users` (SELECT)
- `POST /batches/:batchId/members`
  - Controller: `addBatchMember`
  - Tables: `batch_members` (INSERT/UPDATE)
- `DELETE /batches/:batchId/members/:userId`
  - Controller: `removeBatchMember`
  - Tables: `batch_members` (DELETE)
- `GET /role-permissions`
  - Controller: `listRolePermissions`
  - Tables: `role_permissions` (SELECT)
- `POST /role-permissions`
  - Controller: `upsertRolePermission`
  - Tables: `role_permissions` (INSERT/UPDATE)
- `DELETE /role-permissions/:id`
  - Controller: `deleteRolePermission`
  - Tables: `role_permissions` (DELETE)

## Static Files
- `GET /uploads/*`
  - Express static serving from `uploads/` folder
  - Tables: none
