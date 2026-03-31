# Spectropy LMS Database Context

Source: backend/SPECTROPY_LMS_Schema_v1.1.2_Supabase_Complete.sql
Scope: PostgreSQL schema + migration steps up through v1.1 (multi-tenant features)

## Core Tables
- users: platform users. Fields: id, email (citext), full_name, password_hash (bcrypt), role, is_active, created_at, last_login_at, client_id, user_id.
- admin_permissions: one-to-one with users(admins). Permission flags.
- courses: created_by user, published flag, timestamps, client_id, school_id.
- content_items: hierarchical course content with parent_id. Types: folder, video, text, pdf, scorm, audio. Includes content_url, order_index, metadata jsonb.
- enrollments: user-to-course with role (teacher or student). Unique (user_id, course_id).
- student_attempts: SCORM tracking per user/content_item. Fields include attempt_no, score_raw, completion_status, suspend_data, total_time, started_at, finished_at. Unique (user_id, content_item_id, attempt_no).
- certificates: per user + course. Unique (user_id, course_id).
- community_content: client activity posts with UUID id, school_name, area, state, date, session, title, description, media jsonb, created_by (users.id).
- programs: question-bank program master per client. Fields: id, client_id, name, code, is_active, created_at, updated_at.
- grades: question-bank grade master under program. Fields: id, program_id, grade_number, is_active, created_at, updated_at.

## Multi-Tenant / Organization Model (v1.1 migration)
- clients: organizations (name, slug, timezone, settings, is_active).
- schools: campuses/branches under clients.
- school_memberships: users linked to schools with role_scope (school_owner, teacher, student, admin).
- batches: groups within a school and client.
- batch_members: users linked to batches.
- content_packs: bundles of courses.
- content_pack_items: join table content_packs <-> courses.
- content_entitlements: time-bound content access for clients (either specific content or a pack).
- role_permissions: per-role permission map; client_id can be NULL for global defaults.
- audit_logs: action audit trail with before/after JSONB and metadata.

## Relationships (Highlights)
- users.id -> admin_permissions.admin_id (1:1)
- users.id -> courses.created_by (1:many)
- courses.id -> content_items.course_id (1:many)
- content_items.id -> content_items.parent_id (self-hierarchy)
- users.id -> enrollments.user_id (1:many), courses.id -> enrollments.course_id (1:many)
- users.id -> student_attempts.user_id (1:many), content_items.id -> student_attempts.content_item_id (1:many)
- users.id + courses.id -> certificates (1 per pair)
- programs.id -> grades.program_id (1:many)
- grades.id -> subjects.grade_id (1:many)
- clients.id -> schools.client_id, batches.client_id, role_permissions.client_id, audit_logs.client_id
- schools.id -> school_memberships.school_id, batches.school_id
- users.id -> school_memberships.user_id, batch_members.user_id
- content_entitlements references either content_items or content_packs (constraint requires one)

## Roles and Permissions
- User roles: super_admin, content_authorizer, client_admin, school_owner, teacher, student.
- user_has_permission(p_user_id, p_permission) checks client-specific permissions first, then global defaults.
- Default permissions inserted for each role (global entries where client_id is NULL).
- New curriculum permissions: `programs.read/create/update/delete`, `grades.read/create/update/delete`.

## Triggers and Functions
- update_timestamp() updates updated_at on rows.
- Triggers for: courses, content_items, clients, schools, school_memberships, batches, content_packs.
- log_audit() inserts into audit_logs and returns id.
- client_has_content_access() checks active entitlement for a content item (direct or via a pack's courses).

## Views
- user_hierarchy: user with client/school membership context.
- client_content_access: content with entitlement status and has_active_access flag.

## Indexes (selected)
- content_items(course_id, parent_id)
- enrollments(user_id, course_id)
- student_attempts(user_id, content_item_id)
- schools(client_id, status)
- batches(client_id, school_id, is_active)
- role_permissions(client_id, role)
- audit_logs(client_id, actor_id, entity_type, action, created_at)
- content_entitlements(client_id, status, start_at, end_at)

## Migration Notes / Deltas
- users.role constraint updated multiple times; final set includes 6 roles.
- users.role column widened to VARCHAR(12).
- enrollments table dropped and recreated to include role (teacher or student).
- content_items.item_type includes audio.
- sample data inserted for clients/schools; super_admin role update for super@lms.com.
- data integrity check queries present for enrollments.
