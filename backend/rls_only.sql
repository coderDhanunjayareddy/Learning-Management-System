-- 8. ROW LEVEL SECURITY (SUPABASE)
-- Requires JWT claims: client_id, role
-- =====================================

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION app_client_id()
RETURNS INTEGER AS $$
  SELECT NULLIF((auth.jwt() ->> 'client_id'), '')::INTEGER;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_role()
RETURNS TEXT AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', '');
$$ LANGUAGE sql STABLE;

-- CLIENTS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY clients_tenant_isolation ON clients
  FOR ALL
  USING (app_role() = 'super_admin' OR id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR id = app_client_id());

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- ADMIN PERMISSIONS (scoped by user's client)
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_permissions_tenant_isolation ON admin_permissions
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = admin_id AND u.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = admin_id AND u.client_id = app_client_id()
    )
  );

-- SCHOOLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY schools_tenant_isolation ON schools
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- SCHOOL MEMBERSHIPS (scoped by school->client)
ALTER TABLE school_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY school_memberships_tenant_isolation ON school_memberships
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM schools s
      WHERE s.id = school_id AND s.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM schools s
      WHERE s.id = school_id AND s.client_id = app_client_id()
    )
  );

-- BATCHES
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY batches_tenant_isolation ON batches
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- BATCH MEMBERS (scoped by batch->client)
ALTER TABLE batch_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY batch_members_tenant_isolation ON batch_members
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM batches b
      WHERE b.id = batch_id AND b.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM batches b
      WHERE b.id = batch_id AND b.client_id = app_client_id()
    )
  );

-- COURSES
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY courses_tenant_isolation ON courses
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- CONTENT ITEMS (scoped by course->client)
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_items_tenant_isolation ON content_items
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.client_id = app_client_id()
    )
  );

-- ENROLLMENTS (scoped by course->client)
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY enrollments_tenant_isolation ON enrollments
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.client_id = app_client_id()
    )
  );

-- STUDENT ATTEMPTS (scoped by content->course->client)
ALTER TABLE student_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_attempts_tenant_isolation ON student_attempts
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM content_items ci
      JOIN courses c ON ci.course_id = c.id
      WHERE ci.id = content_item_id AND c.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM content_items ci
      JOIN courses c ON ci.course_id = c.id
      WHERE ci.id = content_item_id AND c.client_id = app_client_id()
    )
  );

-- CERTIFICATES (scoped by course->client)
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY certificates_tenant_isolation ON certificates
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.client_id = app_client_id()
    )
  );

-- CONTENT PACKS (platform-only by default)
ALTER TABLE content_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_packs_platform_only ON content_packs
  FOR ALL
  USING (app_role() = 'super_admin')
  WITH CHECK (app_role() = 'super_admin');

-- CONTENT PACK ITEMS (platform-only by default)
ALTER TABLE content_pack_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_pack_items_platform_only ON content_pack_items
  FOR ALL
  USING (app_role() = 'super_admin')
  WITH CHECK (app_role() = 'super_admin');

-- CONTENT ENTITLEMENTS
ALTER TABLE content_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_entitlements_tenant_isolation ON content_entitlements
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- ROLE PERMISSIONS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_permissions_select ON role_permissions
  FOR SELECT
  USING (app_role() = 'super_admin' OR client_id = app_client_id() OR client_id IS NULL);
CREATE POLICY role_permissions_insert ON role_permissions
  FOR INSERT
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());
CREATE POLICY role_permissions_update ON role_permissions
  FOR UPDATE
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());
CREATE POLICY role_permissions_delete ON role_permissions
  FOR DELETE
  USING (app_role() = 'super_admin' OR client_id = app_client_id());

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_permissions_select ON user_permissions
  FOR SELECT
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_id AND u.client_id = app_client_id()
    )
  );
CREATE POLICY user_permissions_insert ON user_permissions
  FOR INSERT
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_id AND u.client_id = app_client_id()
    )
  );
CREATE POLICY user_permissions_update ON user_permissions
  FOR UPDATE
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_id AND u.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_id AND u.client_id = app_client_id()
    )
  );
CREATE POLICY user_permissions_delete ON user_permissions
  FOR DELETE
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_id AND u.client_id = app_client_id()
    )
  );

-- AUDIT LOGS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- SUBJECTS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY subjects_tenant_isolation ON subjects
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- CHAPTERS (scoped by subject->client)
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY chapters_tenant_isolation ON chapters
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = subject_id AND s.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = subject_id AND s.client_id = app_client_id()
    )
  );

-- TOPICS (scoped by chapter->subject->client)
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY topics_tenant_isolation ON topics
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM chapters ch
      JOIN subjects s ON ch.subject_id = s.id
      WHERE ch.id = chapter_id AND s.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM chapters ch
      JOIN subjects s ON ch.subject_id = s.id
      WHERE ch.id = chapter_id AND s.client_id = app_client_id()
    )
  );

-- QUESTIONS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY questions_tenant_isolation ON questions
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- EXAMS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY exams_tenant_isolation ON exams
  FOR ALL
  USING (app_role() = 'super_admin' OR client_id = app_client_id())
  WITH CHECK (app_role() = 'super_admin' OR client_id = app_client_id());

-- EXAM SECTIONS (scoped by exam->client)
ALTER TABLE exam_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_sections_tenant_isolation ON exam_sections
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_id AND e.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_id AND e.client_id = app_client_id()
    )
  );

-- EXAM QUESTIONS (scoped by exam->client)
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_questions_tenant_isolation ON exam_questions
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM exam_sections es
      JOIN exams e ON es.exam_id = e.id
      WHERE es.id = section_id AND e.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM exam_sections es
      JOIN exams e ON es.exam_id = e.id
      WHERE es.id = section_id AND e.client_id = app_client_id()
    )
  );

-- EXAM ATTEMPTS (scoped by exam->client)
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_attempts_tenant_isolation ON exam_attempts
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_id AND e.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_id AND e.client_id = app_client_id()
    )
  );

-- EXAM RESPONSES (scoped by exam->client)
ALTER TABLE exam_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_responses_tenant_isolation ON exam_responses
  FOR ALL
  USING (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      WHERE ea.id = attempt_id AND e.client_id = app_client_id()
    )
  )
  WITH CHECK (
    app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      WHERE ea.id = attempt_id AND e.client_id = app_client_id()
    )
  );


