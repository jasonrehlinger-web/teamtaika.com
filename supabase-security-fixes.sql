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

-- =============================================================================
-- OPTIONAL VERIFICATION (run as a normal client session, should be a no-op):
--   UPDATE profiles SET role='super_admin' WHERE id = auth.uid();
--   SELECT role FROM profiles WHERE id = auth.uid();   -- still 'client'
--
-- NOTE (M2, storage): the storage RLS policies key the first path segment on
-- auth.uid(), but js/portal.js uploadFile() builds paths as
-- "<projectId>/<type>/..." (first segment is the projectId, not the user id),
-- so CLIENT uploads/downloads may be denied. Verify a real client upload in
-- the portal; if it fails, either change uploadFile() to prefix the path with
-- the user id, or change the storage policies to key off project ownership.
-- =============================================================================
