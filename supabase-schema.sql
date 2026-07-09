-- =============================================================================
-- Taika Language Services — Client Portal Database Schema
-- PostgreSQL / Supabase
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ---------------------------------------------------------------------------
-- HELPER FUNCTION: is_admin()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;


-- ---------------------------------------------------------------------------
-- TABLE: profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text        NOT NULL,
  full_name     text,
  organization  text,
  phone         text,
  role          text        NOT NULL DEFAULT 'client'
                            CHECK (role IN ('client', 'admin', 'super_admin')),
  is_active     boolean     NOT NULL DEFAULT true,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------------
-- TABLE: services
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id            uuid           NOT NULL DEFAULT gen_random_uuid(),
  name          text           NOT NULL,
  slug          text           NOT NULL,
  description   text,
  base_price    numeric(10,2),
  price_unit    text,
  is_active     boolean        NOT NULL DEFAULT true,
  sort_order    integer        NOT NULL DEFAULT 0,
  created_at    timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT services_pkey    PRIMARY KEY (id),
  CONSTRAINT services_slug_key UNIQUE (slug)
);


-- ---------------------------------------------------------------------------
-- TABLE: projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id                  uuid           NOT NULL DEFAULT gen_random_uuid(),
  client_id           uuid           REFERENCES profiles(id),
  assigned_to         uuid           REFERENCES profiles(id),
  service_id          uuid           REFERENCES services(id),
  service_name        text,
  title               text           NOT NULL,
  description         text,
  source_language     text,
  target_languages    text[],
  status              text           NOT NULL DEFAULT 'submitted'
                                     CHECK (status IN (
                                       'submitted', 'reviewing', 'quoted',
                                       'approved', 'in_progress', 'review',
                                       'delivered', 'completed', 'cancelled'
                                     )),
  priority            text           NOT NULL DEFAULT 'standard'
                                     CHECK (priority IN ('standard', 'rush', 'urgent')),
  due_date            date,
  quote_amount        numeric(10,2),
  quote_note          text,
  client_notes        text,
  admin_notes         text,
  mt_used             boolean        NOT NULL DEFAULT false,
  mt_source_language  text,
  mt_target_language  text,
  page_count          integer,
  word_count          integer,
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT projects_pkey PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------------
-- TABLE: project_files
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_files (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  project_id   uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by  uuid        REFERENCES profiles(id),
  file_type    text        NOT NULL
               CHECK (file_type IN ('source', 'delivery', 'reference', 'invoice')),
  file_name    text        NOT NULL,
  file_path    text        NOT NULL,
  file_size    bigint,
  mime_type    text,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_files_pkey PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------------
-- TABLE: messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  project_id   uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id    uuid        REFERENCES profiles(id),
  sender_role  text,
  body         text        NOT NULL,
  is_internal  boolean     NOT NULL DEFAULT false,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT messages_pkey PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------------
-- TABLE: project_status_history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_status_history (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  project_id   uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  changed_by   uuid        REFERENCES profiles(id),
  from_status  text,
  to_status    text        NOT NULL,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_status_history_pkey PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------------
-- TRIGGER FUNCTION: set_updated_at()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------------
-- TRIGGER FUNCTION: handle_new_user()
-- Creates a profile row automatically when a new auth user is created.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, organization, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'organization',
    'client'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ---------------------------------------------------------------------------
-- SEED DATA: services
-- ---------------------------------------------------------------------------
INSERT INTO services (name, slug, description, base_price, price_unit, sort_order) VALUES
  ('Certified Translation',    'certified-translation',    'USCIS-accepted certified translation with signed certificate of accuracy.',  24.99,  'page',         1),
  ('Legal Translation',        'legal-translation',        'Contracts, court documents, and legal correspondence.',                      29.99,  'page',         2),
  ('Medical Translation',      'medical-translation',      'Clinical records, reports, and pharmaceutical documents.',                   29.99,  'page',         3),
  ('Website Localization',     'website-localization',     'Full website or app localization including UI strings and metadata.',        NULL,   'custom quote', 4),
  ('Interpretation In-Person', 'interpretation-in-person', 'Consecutive or simultaneous interpretation at your location.',              120.00, 'hour',         5),
  ('Interpretation Remote',    'interpretation-remote',    'Phone or video remote interpreting (VRI/OPI).',                             95.00,  'hour',         6),
  ('Transcription',            'transcription',            'Audio or video transcription into text.',                                    1.50,  'minute',       7),
  ('Captioning',               'captioning',               'Closed captions and subtitles for video content.',                          2.00,  'minute',       8),
  ('Desktop Publishing',       'desktop-publishing',       'Typesetting and layout for translated documents.',                          NULL,   'custom quote', 9),
  ('508 Compliance',           '508-compliance',           'Section 508 / WCAG accessibility remediation for documents and web.',       NULL,   'custom quote', 10),
  ('AI Automation',            'ai-automation',            'Custom AI workflow automation for translation and localization operations.', NULL,   'custom quote', 11),
  ('Managed Translation',      'managed-translation',      'End-to-end managed language services program.',                             NULL,   'custom quote', 12)
ON CONFLICT (slug) DO NOTHING;


-- ---------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files          ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_status_history ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- RLS POLICIES: profiles
-- ---------------------------------------------------------------------------

-- Users can read their own profile
CREATE POLICY "profiles: users read own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "profiles: admins read all"
  ON profiles FOR SELECT
  USING (is_admin());

-- Users can update their own profile
CREATE POLICY "profiles: users update own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "profiles: admins update all"
  ON profiles FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- IMPORTANT: RLS above restricts WHICH ROWS a client may update, but not WHICH
-- COLUMNS — without this trigger a client could set their own role to
-- 'super_admin'. This trigger reverts privileged columns for non-admin, non-
-- service-role callers. (Also in supabase-security-fixes.sql for existing DBs.)
CREATE OR REPLACE FUNCTION guard_profile_privileged_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT (is_admin() OR auth.role() = 'service_role') THEN
    NEW.role        := OLD.role;
    NEW.is_active   := OLD.is_active;
    NEW.blacklisted := OLD.blacklisted;
    NEW.email       := OLD.email;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON profiles;
CREATE TRIGGER trg_guard_profile_privileged_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION guard_profile_privileged_columns();


-- ---------------------------------------------------------------------------
-- RLS POLICIES: projects
-- ---------------------------------------------------------------------------

-- Clients see only their own projects
CREATE POLICY "projects: clients read own"
  ON projects FOR SELECT
  USING (client_id = auth.uid());

-- Admins see all projects
CREATE POLICY "projects: admins read all"
  ON projects FOR SELECT
  USING (is_admin());

-- Clients can create projects for themselves
CREATE POLICY "projects: clients insert own"
  ON projects FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Admins can create projects for any client
CREATE POLICY "projects: admins insert any"
  ON projects FOR INSERT
  WITH CHECK (is_admin());

-- Clients can update their own projects only while status is 'submitted'
CREATE POLICY "projects: clients update own submitted"
  ON projects FOR UPDATE
  USING (client_id = auth.uid() AND status = 'submitted')
  WITH CHECK (client_id = auth.uid());

-- Admins can update any project
CREATE POLICY "projects: admins update all"
  ON projects FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- RLS POLICIES: project_files
-- ---------------------------------------------------------------------------

-- Clients can see files for their own projects
CREATE POLICY "project_files: clients read own"
  ON project_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
        AND projects.client_id = auth.uid()
    )
  );

-- Admins can see all files
CREATE POLICY "project_files: admins read all"
  ON project_files FOR SELECT
  USING (is_admin());

-- Clients can upload files to their own projects
CREATE POLICY "project_files: clients insert own"
  ON project_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
        AND projects.client_id = auth.uid()
    )
  );

-- Admins can upload files to any project
CREATE POLICY "project_files: admins insert any"
  ON project_files FOR INSERT
  WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- RLS POLICIES: messages
-- ---------------------------------------------------------------------------

-- Clients see non-internal messages on their own projects
CREATE POLICY "messages: clients read own non-internal"
  ON messages FOR SELECT
  USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = messages.project_id
        AND projects.client_id = auth.uid()
    )
  );

-- Admins see all messages
CREATE POLICY "messages: admins read all"
  ON messages FOR SELECT
  USING (is_admin());

-- Clients can post non-internal messages on their own projects
CREATE POLICY "messages: clients insert own non-internal"
  ON messages FOR INSERT
  WITH CHECK (
    is_internal = false
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = messages.project_id
        AND projects.client_id = auth.uid()
    )
  );

-- Admins can post any message (including internal notes)
CREATE POLICY "messages: admins insert any"
  ON messages FOR INSERT
  WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- RLS POLICIES: project_status_history
-- ---------------------------------------------------------------------------

-- Clients can view status history for their own projects
CREATE POLICY "project_status_history: clients read own"
  ON project_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_status_history.project_id
        AND projects.client_id = auth.uid()
    )
  );

-- Admins can view all status history
CREATE POLICY "project_status_history: admins read all"
  ON project_status_history FOR SELECT
  USING (is_admin());

-- Admins can insert status history entries
CREATE POLICY "project_status_history: admins insert"
  ON project_status_history FOR INSERT
  WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- STORAGE BUCKET
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- STORAGE RLS POLICIES: storage.objects (project-files bucket)
-- File path convention: <user_uuid>/<project_uuid>/<filename>
-- The first path segment is always the owning user's UUID.
-- ---------------------------------------------------------------------------

-- Authenticated users can upload to paths under their own user-id folder
CREATE POLICY "storage: authenticated upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

-- Clients can download files from their own user-id folder; admins download anything
CREATE POLICY "storage: clients download own; admins download all"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

-- Clients can delete from their own folder; admins can delete any file
CREATE POLICY "storage: clients delete own; admins delete all"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

-- Admins can update (rename/move) any object; clients update only their own folder
CREATE POLICY "storage: clients update own; admins update all"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'project-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
