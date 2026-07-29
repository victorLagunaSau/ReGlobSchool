-- Add es_tomador_decision boolean field to lead_contacts
ALTER TABLE public.lead_contacts
ADD COLUMN es_tomador_decision BOOLEAN DEFAULT false;

-- Add index for filtering
CREATE INDEX idx_lead_contacts_es_tomador_decision ON public.lead_contacts(es_tomador_decision);
