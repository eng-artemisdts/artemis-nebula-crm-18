-- Add INSERT policy for settings table
CREATE POLICY "Users can insert settings in their organization"
ON public.settings
FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());