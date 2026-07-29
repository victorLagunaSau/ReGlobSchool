-- Fix DELETE policy to allow deletion without lead existence check
DROP POLICY IF EXISTS "Users can delete their own lead contacts" ON public.lead_contacts;

CREATE POLICY "Users can delete lead contacts"
  ON public.lead_contacts
  FOR DELETE
  USING (auth.role() = 'authenticated');
