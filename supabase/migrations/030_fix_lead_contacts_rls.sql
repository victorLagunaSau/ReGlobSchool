-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view lead contacts for leads they can access" ON public.lead_contacts;
DROP POLICY IF EXISTS "Users can insert lead contacts for leads they can access" ON public.lead_contacts;
DROP POLICY IF EXISTS "Users can update their own lead contacts" ON public.lead_contacts;
DROP POLICY IF EXISTS "Users can delete their own lead contacts" ON public.lead_contacts;

-- Create simplified RLS Policies: Allow authenticated users to manage lead contacts
CREATE POLICY "Users can view lead contacts"
  ON public.lead_contacts
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert lead contacts"
  ON public.lead_contacts
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update lead contacts"
  ON public.lead_contacts
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete lead contacts"
  ON public.lead_contacts
  FOR DELETE
  USING (auth.role() = 'authenticated');
