-- =============================================================================
-- supabase-security-fixes.sql
-- =============================================================================
-- RUN THIS IN YOUR SUPABASE PROJECT (Dashboard → SQL Editor → New query → Run).
-- It CANNOT be applied from the website repo — these are policies/triggers on
-- your live Postgres database.
--
-- WHY (from the 2026-07-08 security review):
--
--   CRITICAL (C1): the "profiles: users update own" RLS policy only checks the
--   ROW (id = auth.uid()), not which COLUMNS change. Postgres RLS can't restrict
--   columns, so today any logged-in client can run, from the browser console:
--       supabase.from('profiles').update({ role:'super_admin', is_active:true })
--                                 .eq('id', myId)
--   ...and it succeeds — a full admin/self-approval bypass. Every admin page
--   trusts profiles.role, so this defeats the entire access model.
--
--   MEDIUM (M1): the "projects: clients update own submitted" policy lets a
--   client (while status='submitted') overwrite quote_amount / assigned_to /
--   due_date or jump status straight to approved/completed.
--
-- FIX: BEFORE-UPDATE triggers that, for non-admin / non-service-role callers,
-- revert protected columns to their previous values. The portal-admin Netlify
-- function uses the service_role key (auth.role() = 'service_role'), so it is
-- allowed through and continues to manage roles, activation, quotes, etc.
--
-- Safe to run more than once (idempotent).
-- =============================================================================

-- ── C1: lock down privileged columns on profiles ─────────────────────────────
CREATE OR REPLACE FUNCTION guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Admins (via is_admin()) and the service role (portal-admin function) may
  -- change anything. Everyone else keeps their existing role/status/etc.,
  -- while still being able to edit full_name, organization, etc.
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

-- ── M1: constrain what clients can change on their own projects ───────────────
CREATE OR REPLACE FUNCTION guard_project_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT (is_admin() OR auth.role() = 'service_role') THEN
    -- Clients may not reassign, re-quote, re-date, or re-own a project.
    NEW.assigned_to := OLD.assigned_to;
    NEW.client_id   := OLD.client_id;
    -- The only status change a client may make is submitted -> cancelled.
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_project_privileged_columns ON projects;
CREATE TRIGGER trg_guard_project_privileged_columns
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION guard_project_privileged_columns();

-- ── M2: storage RLS must key off PROJECT OWNERSHIP, not a uid path segment ────
-- The original storage policies required (storage.foldername(name))[1] to equal
-- auth.uid(). But files live under a shared project workspace and are keyed by
-- projectId, not by the uploader's uid:
--     client source uploads  ->  <projectId>/source/<file>    (js/portal.js)
--     admin delivery uploads ->  <projectId>/delivery/<file>  (admin/project.html)
-- Under the old uid-keyed policy:
--   * client uploads were DENIED (first segment was the projectId, or worse the
--     literal bucket name — an earlier bug in uploadFile(), now fixed);
--   * clients could NOT download the deliverables admins uploaded for them
--     (first segment was the projectId, never the client's uid).
-- Correct model: a user may touch an object when they are an admin, OR the
-- object's first path segment is a project they own (projects.client_id =
-- auth.uid()). This mirrors the messages / status-history policies, which also
-- gate on project ownership via EXISTS against projects.
--
-- p.id::text = (...)[1] compares as text so a non-UUID first segment can never
-- raise a cast error inside the policy (it simply matches no row).

DROP POLICY IF EXISTS "storage: authenticated upload to own folder"   ON storage.objects;
DROP POLICY IF EXISTS "storage: clients download own; admins download all" ON storage.objects;
DROP POLICY IF EXISTS "storage: clients delete own; admins delete all" ON storage.objects;
DROP POLICY IF EXISTS "storage: clients update own; admins update all" ON storage.objects;

-- Upload: admins anywhere; clients only under a project they own.
CREATE POLICY "storage: upload to owned project or admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-files'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND p.client_id = auth.uid()
      )
    )
  );

-- Download/list: admins anything; clients files on projects they own.
CREATE POLICY "storage: read owned project or admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND p.client_id = auth.uid()
      )
    )
  );

-- Delete: admins anything; clients files on projects they own.
CREATE POLICY "storage: delete owned project or admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND p.client_id = auth.uid()
      )
    )
  );

-- Update (rename/move): admins anything; clients files on projects they own.
CREATE POLICY "storage: update owned project or admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND p.client_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    bucket_id = 'project-files'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND p.client_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- OPTIONAL VERIFICATION (run as a normal client session, should be a no-op):
--   UPDATE profiles SET role='super_admin' WHERE id = auth.uid();
--   SELECT role FROM profiles WHERE id = auth.uid();   -- still 'client'
--
-- STORAGE (M2): after running this, do one real portal round-trip:
--   1. Log in as a client, submit a project WITH a source file  -> upload OK.
--   2. As an admin, upload a delivery file on that project       -> upload OK.
--   3. Back as the client, download that delivery file           -> download OK.
-- =============================================================================
