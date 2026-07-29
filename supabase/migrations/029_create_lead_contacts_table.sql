-- Create lead_contacts table for storing phone and email contacts
CREATE TABLE public.lead_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('telefono', 'email')),
  nombre TEXT NOT NULL,
  cargo TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_lead_contacts_lead_id ON public.lead_contacts(lead_id);
CREATE INDEX idx_lead_contacts_tipo ON public.lead_contacts(tipo);

-- Enable RLS
ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to read/write their own lead contacts
CREATE POLICY "Users can view lead contacts for leads they can access"
  ON public.lead_contacts
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_contacts.lead_id
    )
  );

CREATE POLICY "Users can insert lead contacts for leads they can access"
  ON public.lead_contacts
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_contacts.lead_id
    )
  );

CREATE POLICY "Users can update their own lead contacts"
  ON public.lead_contacts
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_contacts.lead_id
    )
  );

CREATE POLICY "Users can delete their own lead contacts"
  ON public.lead_contacts
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_contacts.lead_id
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lead_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_contacts_updated_at_trigger
BEFORE UPDATE ON public.lead_contacts
FOR EACH ROW
EXECUTE FUNCTION update_lead_contacts_updated_at();
