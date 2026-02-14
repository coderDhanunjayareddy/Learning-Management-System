-- ===============================
--  Learning Management System (LMS)
--  PostgreSQL Schema (v1.0)
-- ===============================

-- Enable case-insensitive text for emails
CREATE EXTENSION IF NOT EXISTS citext;

-- =====================================
-- 1. USERS TABLE
-- =====================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email CITEXT UNIQUE NOT NULL CHECK (email ~* '^.+@.+\..+$'),
  full_name TEXT NOT NULL CHECK (LENGTH(full_name) > 0),
  password_hash TEXT NOT NULL, -- bcrypt hash only
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'student')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- =====================================
-- 2. ADMIN PERMISSIONS
-- =====================================
CREATE TABLE admin_permissions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_manage_courses BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  can_issue_certificates BOOLEAN DEFAULT FALSE,
  can_view_reports BOOLEAN DEFAULT FALSE,
  can_manage_scorm BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id)
);

-- =====================================
-- 3. COURSES
-- =====================================
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (LENGTH(title) > 0),
  description TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 4. CONTENT ITEMS (Hierarchical Structure)
-- =====================================
CREATE TABLE content_items (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('folder', 'video', 'text', 'pdf', 'scorm', 'audio', 'html', 'link')),
  title TEXT NOT NULL,
  content_url TEXT, -- For video/pdf/text/SCORM file location
  order_index INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::JSONB, -- Extra info (duration, file size, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_content_course ON content_items(course_id);
CREATE INDEX idx_content_parent ON content_items(parent_id);

-- =====================================
-- 5. ENROLLMENTS
-- =====================================
CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

CREATE INDEX idx_enroll_student ON enrollments(student_id);
CREATE INDEX idx_enroll_course ON enrollments(course_id);

-- =====================================
-- 6. SCORM ATTEMPTS (Tracking Runtime Data)
-- =====================================
CREATE TABLE student_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  attempt_no INTEGER NOT NULL DEFAULT 1,
  score_raw NUMERIC(5,2),
  completion_status VARCHAR(20)
    CHECK (completion_status IN ('not attempted', 'incomplete', 'completed', 'passed', 'failed')),
  suspend_data TEXT, -- SCORM suspend data for resume support
  total_time INTERVAL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, content_item_id, attempt_no)
);



-- =====================================
-- 7. CERTIFICATES (Auto-Issued)
-- =====================================
CREATE TABLE certificates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  certificate_url TEXT,
  UNIQUE(user_id, course_id)
);

-- =====================================
-- 8. TRIGGER (Auto-update updated_at)
-- =====================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_courses_updated
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_content_updated
BEFORE UPDATE ON content_items
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- END OF SCHEMA
-- =====================================

--change to 4 roles accept 
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('super_admin', 'admin', 'teacher', 'student'));

-- Increase length to accommodate 'super_admin' (11 chars)
ALTER TABLE users 
ALTER COLUMN role TYPE VARCHAR(12);

--drop the enrollments table 
-- Modify enrollments to support both students and teachers
--Your current table only tracks students. But teachers also need to be assigned to courses (especially if they didn’t create it).
DROP TABLE IF EXISTS enrollments;
-- Create new flexible enrollments table
CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('teacher', 'student')),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id) -- One role per course per user
);

CREATE INDEX idx_enroll_user ON enrollments(user_id);
CREATE INDEX idx_enroll_course ON enrollments(course_id);


-- Drop old constraint bez it does not accept the audio
ALTER TABLE content_items DROP CONSTRAINT content_items_item_type_check;

-- Add new one with 'audio', 'html', and 'link'
ALTER TABLE content_items
ADD CONSTRAINT content_items_item_type_check
CHECK (
  item_type = ANY (ARRAY['folder', 'video', 'text', 'pdf', 'scorm', 'audio', 'html', 'link']::text[])
);

-- Find enrollments with invalid user_id
SELECT e.id, e.user_id, e.course_id
FROM enrollments e
LEFT JOIN users u ON e.user_id = u.id
WHERE u.id IS NULL;

-- Find enrollments with invalid course_id
SELECT e.id, e.user_id, e.course_id
FROM enrollments e
LEFT JOIN courses c ON e.course_id = c.id
WHERE c.id IS NULL;

--creating the table for the client service to store the daliy activies
DROP TABLE IF EXISTS community_content;
-- Create with INTEGER created_by (matches your users.id)
CREATE TABLE community_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  area TEXT,
  state TEXT,
  date DATE,
  session TEXT CHECK (session IN ('Morning', 'Afternoon', 'Full Day', 'Workshop', 'Seminar')),
  title TEXT NOT NULL,
  description TEXT,
  media JSONB DEFAULT '[]'::JSONB,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- ✅ INTEGER, not UUID
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ===============================
-- SPECTROPY LMS Schema Migration
-- v1.0 → v1.1
-- ===============================

-- =====================================
-- 1. CREATE NEW TABLES
-- =====================================

-- 1.1 CLIENTS (formerly tenants concept)
-- Purpose: Stores organizations/institutions using the platform
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  settings JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for auto-updating updated_at
CREATE TRIGGER trg_clients_updated
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.2 SCHOOLS
-- Purpose: Stores schools/campuses/branches within a client
CREATE TABLE schools (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  school_code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  board VARCHAR(50),
  affiliation_no VARCHAR(100),
  address_line1 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  phone VARCHAR(50),
  email VARCHAR(255),
  principal_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, school_code)
);

CREATE INDEX idx_schools_client ON schools(client_id);
CREATE INDEX idx_schools_status ON schools(status);

CREATE TRIGGER trg_schools_updated
BEFORE UPDATE ON schools
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.3 SCHOOL_MEMBERSHIPS
-- Purpose: Junction table linking users to schools with role scope
CREATE TABLE school_memberships (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_scope VARCHAR(30) NOT NULL CHECK (role_scope IN ('school_owner', 'teacher', 'student', 'admin')),
  is_primary BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, user_id)
);

CREATE INDEX idx_school_memberships_school ON school_memberships(school_id);
CREATE INDEX idx_school_memberships_user ON school_memberships(user_id);
CREATE INDEX idx_school_memberships_role ON school_memberships(role_scope);

CREATE TRIGGER trg_school_memberships_updated
BEFORE UPDATE ON school_memberships
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.4 BATCHES
-- Purpose: Stores batches/groups within a school
CREATE TABLE batches (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  metadata JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batches_client ON batches(client_id);
CREATE INDEX idx_batches_school ON batches(school_id);
CREATE INDEX idx_batches_active ON batches(is_active);

CREATE TRIGGER trg_batches_updated
BEFORE UPDATE ON batches
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.5 BATCH_MEMBERS
-- Purpose: Links users to batches
CREATE TABLE batch_members (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(batch_id, user_id)
);

CREATE INDEX idx_batch_members_batch ON batch_members(batch_id);
CREATE INDEX idx_batch_members_user ON batch_members(user_id);

-- =====================================
-- 1.6 CONTENT_PACKS
-- Purpose: Bundles content items for licensing
CREATE TABLE content_packs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_content_packs_updated
BEFORE UPDATE ON content_packs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================
-- 1.7 CONTENT_PACK_ITEMS
-- Purpose: Junction table linking content items to packs
CREATE TABLE content_pack_items (
  pack_id INTEGER NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE,
  content_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  PRIMARY KEY (pack_id, content_id)
);

CREATE INDEX idx_content_pack_items_pack ON content_pack_items(pack_id);
CREATE INDEX idx_content_pack_items_content ON content_pack_items(content_id);

-- =====================================
-- 1.8 CONTENT_ENTITLEMENTS
-- Purpose: Time-bound content licensing for clients
CREATE TABLE content_entitlements (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
  pack_id INTEGER REFERENCES content_packs(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'grace', 'expired', 'revoked')),
  granted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  CONSTRAINT content_or_pack_required CHECK (content_id IS NOT NULL OR pack_id IS NOT NULL)
);

CREATE INDEX idx_content_entitlements_client ON content_entitlements(client_id);
CREATE INDEX idx_content_entitlements_status ON content_entitlements(status);
CREATE INDEX idx_content_entitlements_dates ON content_entitlements(start_at, end_at);

-- =====================================
-- 1.9 ROLE_PERMISSIONS
-- Purpose: Configurable permissions per role
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  granted BOOLEAN DEFAULT TRUE,
  UNIQUE(client_id, role, permission)
);

CREATE INDEX idx_role_permissions_client ON role_permissions(client_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role);

-- =====================================
-- 1.10 AUDIT_LOGS
-- Purpose: Tracks all important actions in the system
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  before_state JSONB,
  after_state JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_client ON audit_logs(client_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =====================================
-- 2. MODIFY EXISTING TABLES
-- =====================================

-- 2.1 MODIFY USERS TABLE
-- Add client_id column and update role constraint

-- Add client_id column (nullable for platform-level roles)
-- Add client_id (which organization does user belong to)
ALTER TABLE users ADD COLUMN client_id INTEGER REFERENCES clients(id);

-- Add user_id for client-specific identification (like employee ID)
ALTER TABLE users ADD COLUMN user_id VARCHAR(100);

-- Step 1: Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add the new constraint with updated roles
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'content_authorizer', 'client_admin', 
                  'school_owner', 'teacher', 'student'));

-- Add unique constraint for user_id within client
ALTER TABLE users ADD CONSTRAINT users_client_user_id_unique UNIQUE(client_id, user_id);

-- Create index for client_id
CREATE INDEX IF NOT EXISTS idx_users_client ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================
-- 2.2 MODIFY COURSES TABLE
-- Add client_id and school_id columns

-- Add client_id column
ALTER TABLE courses ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE;

-- Add school_id column (nullable - courses can be at client level)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_courses_client ON courses(client_id);
CREATE INDEX IF NOT EXISTS idx_courses_school ON courses(school_id);

-- =====================================
-- 3. FIX EXISTING INDEX NAMES
-- =====================================

-- Fix the incorrect index name in original schema (scorm_attempts vs student_attempts)
DROP INDEX IF EXISTS idx_scorm_user;
DROP INDEX IF EXISTS idx_scorm_content;

CREATE INDEX IF NOT EXISTS idx_student_attempts_user ON student_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_content ON student_attempts(content_item_id);

-- =====================================
-- 4. INSERT DEFAULT ROLE PERMISSIONS
-- =====================================

-- Global default permissions (client_id = NULL)
INSERT INTO role_permissions (client_id, role, permission, granted) VALUES
-- Super Admin - Full platform access
(NULL, 'super_admin', 'users.create', TRUE),
(NULL, 'super_admin', 'users.read', TRUE),
(NULL, 'super_admin', 'users.update', TRUE),
(NULL, 'super_admin', 'users.delete', TRUE),
(NULL, 'super_admin', 'schools.create', TRUE),
(NULL, 'super_admin', 'schools.read', TRUE),
(NULL, 'super_admin', 'schools.update', TRUE),
(NULL, 'super_admin', 'schools.delete', TRUE),
(NULL, 'super_admin', 'courses.create', TRUE),
(NULL, 'super_admin', 'courses.read', TRUE),
(NULL, 'super_admin', 'courses.update', TRUE),
(NULL, 'super_admin', 'courses.delete', TRUE),
(NULL, 'super_admin', 'courses.publish', TRUE),
(NULL, 'super_admin', 'batches.create', TRUE),
(NULL, 'super_admin', 'batches.read', TRUE),
(NULL, 'super_admin', 'batches.update', TRUE),
(NULL, 'super_admin', 'batches.delete', TRUE),
(NULL, 'super_admin', 'enrollments.enroll', TRUE),
(NULL, 'super_admin', 'enrollments.remove', TRUE),
(NULL, 'super_admin', 'reports.view', TRUE),
(NULL, 'super_admin', 'reports.export', TRUE),
(NULL, 'super_admin', 'certificates.issue', TRUE),
(NULL, 'super_admin', 'certificates.view', TRUE),

-- Content Authorizer - Content management only
(NULL, 'content_authorizer', 'courses.create', TRUE),
(NULL, 'content_authorizer', 'courses.read', TRUE),
(NULL, 'content_authorizer', 'courses.update', TRUE),
(NULL, 'content_authorizer', 'courses.publish', TRUE),

-- Client Admin - Full client access
(NULL, 'client_admin', 'users.create', TRUE),
(NULL, 'client_admin', 'users.read', TRUE),
(NULL, 'client_admin', 'users.update', TRUE),
(NULL, 'client_admin', 'users.delete', TRUE),
(NULL, 'client_admin', 'schools.create', TRUE),
(NULL, 'client_admin', 'schools.read', TRUE),
(NULL, 'client_admin', 'schools.update', TRUE),
(NULL, 'client_admin', 'schools.delete', TRUE),
(NULL, 'client_admin', 'courses.create', TRUE),
(NULL, 'client_admin', 'courses.read', TRUE),
(NULL, 'client_admin', 'courses.update', TRUE),
(NULL, 'client_admin', 'courses.delete', TRUE),
(NULL, 'client_admin', 'courses.publish', TRUE),
(NULL, 'client_admin', 'batches.create', TRUE),
(NULL, 'client_admin', 'batches.read', TRUE),
(NULL, 'client_admin', 'batches.update', TRUE),
(NULL, 'client_admin', 'batches.delete', TRUE),
(NULL, 'client_admin', 'enrollments.enroll', TRUE),
(NULL, 'client_admin', 'enrollments.remove', TRUE),
(NULL, 'client_admin', 'reports.view', TRUE),
(NULL, 'client_admin', 'reports.export', TRUE),
(NULL, 'client_admin', 'certificates.issue', TRUE),
(NULL, 'client_admin', 'certificates.view', TRUE),

-- School Owner - School-level access
(NULL, 'school_owner', 'users.create', TRUE),
(NULL, 'school_owner', 'users.read', TRUE),
(NULL, 'school_owner', 'users.update', TRUE),
(NULL, 'school_owner', 'schools.read', TRUE),
(NULL, 'school_owner', 'schools.update', TRUE),
(NULL, 'school_owner', 'courses.create', TRUE),
(NULL, 'school_owner', 'courses.read', TRUE),
(NULL, 'school_owner', 'courses.update', TRUE),
(NULL, 'school_owner', 'batches.create', TRUE),
(NULL, 'school_owner', 'batches.read', TRUE),
(NULL, 'school_owner', 'batches.update', TRUE),
(NULL, 'school_owner', 'batches.delete', TRUE),
(NULL, 'school_owner', 'enrollments.enroll', TRUE),
(NULL, 'school_owner', 'enrollments.remove', TRUE),
(NULL, 'school_owner', 'reports.view', TRUE),
(NULL, 'school_owner', 'certificates.view', TRUE),

-- Teacher - Batch-level access
(NULL, 'teacher', 'users.read', TRUE),
(NULL, 'teacher', 'courses.read', TRUE),
(NULL, 'teacher', 'batches.read', TRUE),
(NULL, 'teacher', 'enrollments.enroll', TRUE),
(NULL, 'teacher', 'enrollments.remove', TRUE),
(NULL, 'teacher', 'reports.view', TRUE),
(NULL, 'teacher', 'certificates.view', TRUE),

-- Student - Self access only
(NULL, 'student', 'courses.read', TRUE),
(NULL, 'student', 'certificates.view', TRUE)
ON CONFLICT (client_id, role, permission) DO NOTHING;

-- =====================================
-- 5. HELPER FUNCTIONS
-- =====================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id INTEGER,
  p_permission VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
  v_role VARCHAR(30);
  v_client_id INTEGER;
  v_granted BOOLEAN;
BEGIN
  -- Get user's role and client_id
  SELECT role, client_id INTO v_role, v_client_id
  FROM users WHERE id = p_user_id;
  
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check client-specific permission first, then global default
  SELECT granted INTO v_granted
  FROM role_permissions
  WHERE role = v_role 
    AND permission = p_permission
    AND (client_id = v_client_id OR client_id IS NULL)
  ORDER BY client_id NULLS LAST
  LIMIT 1;
  
  RETURN COALESCE(v_granted, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit(
  p_client_id INTEGER,
  p_actor_id INTEGER,
  p_action VARCHAR(100),
  p_entity_type VARCHAR(50),
  p_entity_id VARCHAR(50),
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_log_id BIGINT;
BEGIN
  INSERT INTO audit_logs (
    client_id, actor_id, action, entity_type, entity_id,
    before_state, after_state, ip_address, user_agent
  ) VALUES (
    p_client_id, p_actor_id, p_action, p_entity_type, p_entity_id,
    p_before_state, p_after_state, p_ip_address, p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check content entitlement
CREATE OR REPLACE FUNCTION client_has_content_access(
  p_client_id INTEGER,
  p_content_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM content_entitlements ce
    LEFT JOIN content_pack_items cpi ON ce.pack_id = cpi.pack_id
    WHERE ce.client_id = p_client_id
      AND ce.status = 'active'
      AND NOW() BETWEEN ce.start_at AND ce.end_at
      AND (ce.content_id = p_content_id OR cpi.content_id = p_content_id)
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- 6. VIEWS FOR COMMON QUERIES
-- =====================================

-- View: User's complete hierarchy info
CREATE OR REPLACE VIEW user_hierarchy AS
SELECT 
  u.id AS user_id,
  u.email,
  u.full_name,
  u.role,
  u.client_id,
  c.name AS client_name,
  c.slug AS client_slug,
  sm.school_id,
  s.name AS school_name,
  s.school_code,
  sm.role_scope,
  sm.is_primary AS is_primary_school
FROM users u
LEFT JOIN clients c ON u.client_id = c.id
LEFT JOIN school_memberships sm ON u.id = sm.user_id AND sm.status = 'active'
LEFT JOIN schools s ON sm.school_id = s.id;

-- =====================================
-- 6.1 FIX ROLE LENGTH FOR NEW ROLES
-- =====================================
-- NOTE: View depends on users.role, so drop/recreate when altering type.
DROP VIEW IF EXISTS user_hierarchy;

ALTER TABLE users
ALTER COLUMN role TYPE VARCHAR(30);

CREATE OR REPLACE VIEW user_hierarchy AS
SELECT 
  u.id AS user_id,
  u.email,
  u.full_name,
  u.role,
  u.client_id,
  c.name AS client_name,
  c.slug AS client_slug,
  sm.school_id,
  s.name AS school_name,
  s.school_code,
  sm.role_scope,
  sm.is_primary AS is_primary_school
FROM users u
LEFT JOIN clients c ON u.client_id = c.id
LEFT JOIN school_memberships sm ON u.id = sm.user_id AND sm.status = 'active'
LEFT JOIN schools s ON sm.school_id = s.id;

-- View: Content with entitlement status per client
CREATE OR REPLACE VIEW client_content_access AS
SELECT 
  ci.id AS content_id,
  ci.title AS content_title,
  ci.item_type,
  co.id AS course_id,
  co.title AS course_title,
  ce.client_id,
  c.name AS client_name,
  ce.status AS entitlement_status,
  ce.start_at,
  ce.end_at,
  CASE 
    WHEN ce.status = 'active' AND NOW() BETWEEN ce.start_at AND ce.end_at THEN TRUE
    ELSE FALSE
  END AS has_active_access
FROM content_items ci
JOIN courses co ON ci.course_id = co.id
LEFT JOIN content_pack_items cpi ON ci.id = cpi.content_id
LEFT JOIN content_entitlements ce ON (ce.content_id = ci.id OR ce.pack_id = cpi.pack_id)
LEFT JOIN clients c ON ce.client_id = c.id;

-- =====================================
-- 7. SAMPLE DATA FOR TESTING
-- =====================================

-- Insert sample client
INSERT INTO clients (name, slug, timezone, settings, is_active) VALUES
('Future Academy', 'future-academy', 'Asia/Kolkata', '{"theme": "default", "features": {"scorm": true}}'::JSONB, TRUE),
('Narayana Coaching', 'narayana', 'Asia/Kolkata', '{"theme": "blue"}'::JSONB, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample schools
INSERT INTO schools (client_id, school_code, name, board, city, state, status) VALUES
(1, 'MAIN', 'Future Academy Main Campus', 'CBSE', 'Hyderabad', 'Telangana', 'active'),
(1, 'NORTH', 'Future Academy North Branch', 'CBSE', 'Secunderabad', 'Telangana', 'active'),
(2, 'HQ', 'Narayana HQ Campus', 'CBSE', 'Hyderabad', 'Telangana', 'active')
ON CONFLICT (client_id, school_code) DO NOTHING;

-- Update existing super_admin user to have proper role
UPDATE users SET role = 'super_admin', client_id = NULL 
WHERE email = 'super@lms.com';

-- =====================================
-- END OF MIGRATION SCRIPT
-- =====================================
