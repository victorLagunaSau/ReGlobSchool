-- Complete deleted tables for lead archival system
-- Creates archive tables for: decision_makers, tasks, score_progress, imports

-- ============================================================================
-- 1. DELETED_LEAD_DECISION_MAKERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deleted_lead_decision_makers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_decision_maker_id uuid NOT NULL,
  original_lead_id uuid NOT NULL,
  lead_id uuid,
  nombre text NOT NULL,
  cargo text,
  telefono text,
  email text,
  original_created_at timestamp with time zone,
  original_updated_at timestamp with time zone,
  deleted_by uuid NOT NULL,
  deletion_reason text,
  archived_at timestamp with time zone DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_deleted_lead_decision_makers_lead_id
  ON public.deleted_lead_decision_makers(lead_id);
CREATE INDEX IF NOT EXISTS idx_deleted_lead_decision_makers_deleted_by
  ON public.deleted_lead_decision_makers(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deleted_lead_decision_makers_archived_at
  ON public.deleted_lead_decision_makers(archived_at);

-- ============================================================================
-- 2. DELETED_LEAD_TASKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deleted_lead_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_task_id uuid NOT NULL,
  original_lead_id uuid NOT NULL,
  lead_id uuid,
  task_type text,
  description text,
  scheduled_for timestamp with time zone,
  completed_at timestamp with time zone,
  status text,
  outcome text,
  channel text,
  attempt_number integer,
  modality text,
  result text,
  original_created_at timestamp with time zone,
  deleted_by uuid NOT NULL,
  deletion_reason text,
  archived_at timestamp with time zone DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_deleted_lead_tasks_lead_id
  ON public.deleted_lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_deleted_lead_tasks_deleted_by
  ON public.deleted_lead_tasks(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deleted_lead_tasks_archived_at
  ON public.deleted_lead_tasks(archived_at);

-- ============================================================================
-- 3. DELETED_LEAD_SCORE_PROGRESS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deleted_lead_score_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_lead_id uuid NOT NULL,
  lead_id uuid,
  step_id uuid,
  step_label text,
  step_stage text,
  step_weight numeric,
  original_completed_at timestamp with time zone,
  deleted_by uuid NOT NULL,
  deletion_reason text,
  archived_at timestamp with time zone DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_deleted_lead_score_progress_lead_id
  ON public.deleted_lead_score_progress(lead_id);
CREATE INDEX IF NOT EXISTS idx_deleted_lead_score_progress_deleted_by
  ON public.deleted_lead_score_progress(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deleted_lead_score_progress_archived_at
  ON public.deleted_lead_score_progress(archived_at);

-- ============================================================================
-- 4. DELETED_LEAD_IMPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deleted_lead_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_import_id uuid NOT NULL,
  original_lead_id uuid,
  lead_id uuid,
  upload_batch_id uuid,
  business_name text NOT NULL,
  business_type text,
  phone text,
  email text,
  address text,
  municipality_code text,
  status text,
  error_message text,
  zone_id text,
  owner_id uuid,
  original_created_at timestamp with time zone,
  deleted_by uuid NOT NULL,
  deletion_reason text,
  archived_at timestamp with time zone DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_deleted_lead_imports_lead_id
  ON public.deleted_lead_imports(lead_id);
CREATE INDEX IF NOT EXISTS idx_deleted_lead_imports_deleted_by
  ON public.deleted_lead_imports(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deleted_lead_imports_archived_at
  ON public.deleted_lead_imports(archived_at);
CREATE INDEX IF NOT EXISTS idx_deleted_lead_imports_upload_batch_id
  ON public.deleted_lead_imports(upload_batch_id);

-- ============================================================================
-- FOREIGN KEYS & PERMISSIONS
-- ============================================================================

-- Add foreign keys to reference profiles (deleted_by)
ALTER TABLE IF EXISTS public.deleted_lead_decision_makers
  ADD CONSTRAINT deleted_lead_decision_makers_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS public.deleted_lead_tasks
  ADD CONSTRAINT deleted_lead_tasks_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS public.deleted_lead_score_progress
  ADD CONSTRAINT deleted_lead_score_progress_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS public.deleted_lead_imports
  ADD CONSTRAINT deleted_lead_imports_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- ============================================================================
-- ROW LEVEL SECURITY (Optional - uncomment if you use RLS)
-- ============================================================================

-- Enable RLS on all deleted tables
ALTER TABLE IF EXISTS public.deleted_lead_decision_makers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deleted_lead_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deleted_lead_score_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deleted_lead_imports ENABLE ROW LEVEL SECURITY;

-- Allow users to read deleted leads they created or that were deleted by them
-- Admins can read all
CREATE POLICY IF NOT EXISTS "users_can_read_own_deleted_decision_makers"
  ON public.deleted_lead_decision_makers FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ) OR deleted_by = auth.uid());

CREATE POLICY IF NOT EXISTS "users_can_read_own_deleted_tasks"
  ON public.deleted_lead_tasks FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ) OR deleted_by = auth.uid());

CREATE POLICY IF NOT EXISTS "users_can_read_own_deleted_score_progress"
  ON public.deleted_lead_score_progress FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ) OR deleted_by = auth.uid());

CREATE POLICY IF NOT EXISTS "users_can_read_own_deleted_imports"
  ON public.deleted_lead_imports FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ) OR deleted_by = auth.uid() OR owner_id = auth.uid());

-- Prevent updates and deletes on archived data
CREATE POLICY IF NOT EXISTS "no_update_deleted_decision_makers"
  ON public.deleted_lead_decision_makers FOR UPDATE
  USING (false);

CREATE POLICY IF NOT EXISTS "no_delete_deleted_decision_makers"
  ON public.deleted_lead_decision_makers FOR DELETE
  USING (false);

CREATE POLICY IF NOT EXISTS "no_update_deleted_tasks"
  ON public.deleted_lead_tasks FOR UPDATE
  USING (false);

CREATE POLICY IF NOT EXISTS "no_delete_deleted_tasks"
  ON public.deleted_lead_tasks FOR DELETE
  USING (false);

CREATE POLICY IF NOT EXISTS "no_update_deleted_score_progress"
  ON public.deleted_lead_score_progress FOR UPDATE
  USING (false);

CREATE POLICY IF NOT EXISTS "no_delete_deleted_score_progress"
  ON public.deleted_lead_score_progress FOR DELETE
  USING (false);

CREATE POLICY IF NOT EXISTS "no_update_deleted_imports"
  ON public.deleted_lead_imports FOR UPDATE
  USING (false);

CREATE POLICY IF NOT EXISTS "no_delete_deleted_imports"
  ON public.deleted_lead_imports FOR DELETE
  USING (false);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================
COMMENT ON TABLE public.deleted_lead_decision_makers IS 'Archive of deleted lead decision makers for audit trail';
COMMENT ON TABLE public.deleted_lead_tasks IS 'Archive of deleted lead tasks for audit trail';
COMMENT ON TABLE public.deleted_lead_score_progress IS 'Archive of deleted lead score progress for audit trail';
COMMENT ON TABLE public.deleted_lead_imports IS 'Archive of deleted lead imports for audit trail';

COMMENT ON COLUMN public.deleted_lead_decision_makers.deleted_by IS 'Profile ID of user who performed deletion';
COMMENT ON COLUMN public.deleted_lead_decision_makers.deletion_reason IS 'Reason for deletion (from DeleteAction)';
COMMENT ON COLUMN public.deleted_lead_decision_makers.archived_at IS 'Timestamp when archived';

COMMENT ON COLUMN public.deleted_lead_tasks.deleted_by IS 'Profile ID of user who performed deletion';
COMMENT ON COLUMN public.deleted_lead_tasks.deletion_reason IS 'Reason for deletion';
COMMENT ON COLUMN public.deleted_lead_tasks.archived_at IS 'Timestamp when archived';

COMMENT ON COLUMN public.deleted_lead_score_progress.deleted_by IS 'Profile ID of user who performed deletion';
COMMENT ON COLUMN public.deleted_lead_score_progress.deletion_reason IS 'Reason for deletion';
COMMENT ON COLUMN public.deleted_lead_score_progress.archived_at IS 'Timestamp when archived';

COMMENT ON COLUMN public.deleted_lead_imports.deleted_by IS 'Profile ID of user who performed deletion';
COMMENT ON COLUMN public.deleted_lead_imports.deletion_reason IS 'Reason for deletion';
COMMENT ON COLUMN public.deleted_lead_imports.archived_at IS 'Timestamp when archived';
