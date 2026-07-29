-- Migration: Add is_discarded flag to leads table
-- Tracks discarded leads while preserving their stage for analysis

ALTER TABLE public.leads
  ADD COLUMN is_discarded BOOLEAN DEFAULT false,
  ADD COLUMN discarded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN discard_reason TEXT;

-- Create index for filtering
CREATE INDEX idx_leads_is_discarded ON public.leads(is_discarded);
CREATE INDEX idx_leads_discarded_at ON public.leads(discarded_at);
