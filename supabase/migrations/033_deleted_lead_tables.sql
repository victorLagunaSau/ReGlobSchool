-- Create deleted_lead_interactions table
CREATE TABLE IF NOT EXISTS deleted_lead_interactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  original_interaction_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  interaction_type varchar NOT NULL,
  actor_id uuid,
  action_label varchar,
  message text,
  metadata jsonb,
  original_created_at timestamp with time zone,
  deleted_by uuid,
  deletion_reason text,
  archived_at timestamp with time zone DEFAULT now()
);

-- Create deleted_lead_documents table
CREATE TABLE IF NOT EXISTS deleted_lead_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  original_document_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  nombre varchar NOT NULL,
  entregado boolean DEFAULT false,
  aceptado_estado varchar DEFAULT 'pendiente',
  original_created_at timestamp with time zone,
  deleted_by uuid,
  deletion_reason text,
  archived_at timestamp with time zone DEFAULT now()
);

-- Create deleted_document_submissions table
CREATE TABLE IF NOT EXISTS deleted_document_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  original_submission_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  document_id uuid NOT NULL,
  status varchar NOT NULL,
  file_url text,
  file_path text,
  submitted_at timestamp with time zone,
  accepted_at timestamp with time zone,
  rejected_at timestamp with time zone,
  resent_at timestamp with time zone,
  original_created_at timestamp with time zone,
  deleted_by uuid,
  deletion_reason text,
  archived_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_deleted_lead_interactions_lead_id ON deleted_lead_interactions(lead_id);
CREATE INDEX idx_deleted_lead_documents_lead_id ON deleted_lead_documents(lead_id);
CREATE INDEX idx_deleted_document_submissions_lead_id ON deleted_document_submissions(lead_id);
