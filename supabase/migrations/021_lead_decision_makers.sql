-- Create lead_decision_makers table
CREATE TABLE public.lead_decision_makers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cargo TEXT,
  telefono TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_lead_decision_makers_lead_id ON public.lead_decision_makers(lead_id);
CREATE INDEX idx_lead_decision_makers_created_at ON public.lead_decision_makers(created_at DESC);

-- RLS Policy
ALTER TABLE public.lead_decision_makers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see decision makers for leads they own
CREATE POLICY lead_decision_makers_owner_only ON public.lead_decision_makers
  FOR ALL USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE owner_id = auth.uid()
    )
  );

-- Policy for authorized users (admin)
CREATE POLICY lead_decision_makers_authorized ON public.lead_decision_makers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND authorized = true
    )
  );
