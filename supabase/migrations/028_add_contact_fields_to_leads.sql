-- Migration: Add dynamic contact and qualification fields to leads
-- Stores additional phones/emails collected during contact attempts,
-- interest level tracking with history, and importance rating

ALTER TABLE public.leads
  ADD COLUMN contact_phones JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN contact_emails JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN interest_level TEXT CHECK (interest_level IN ('Alto', 'Medio', 'Bajo')),
  ADD COLUMN importance_level INT CHECK (importance_level IN (1, 2, 3)),
  ADD COLUMN contact_notes TEXT,
  ADD COLUMN interest_history JSONB DEFAULT '[]'::jsonb;

-- Create indexes for performance
CREATE INDEX idx_leads_interest_level ON public.leads(interest_level);
CREATE INDEX idx_leads_importance_level ON public.leads(importance_level);

-- Schema for contact_phones and contact_emails:
-- [
--   {
--     "value": "+52 444 813 7477",
--     "source": "lead" | "decision_maker" | "manual",
--     "added_at": "2026-07-29T12:34:56Z",
--     "decision_maker_id": "uuid" (if source = decision_maker)
--   }
-- ]

-- Schema for interest_history:
-- [
--   {
--     "from": "Bajo",
--     "to": "Medio",
--     "changed_at": "2026-07-29T12:34:56Z",
--     "changed_by": "user_id"
--   }
-- ]
