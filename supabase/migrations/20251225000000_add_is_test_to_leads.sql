-- Add is_test column to leads table
-- This column marks leads created in the playground for testing purposes
-- Leads with is_test = true should only be visible in the playground

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_leads_is_test ON public.leads(is_test);

-- Update existing leads to have is_test = false (if null)
UPDATE public.leads
SET is_test = FALSE
WHERE is_test IS NULL;

-- Add comment to column
COMMENT ON COLUMN public.leads.is_test IS 'Indicates if this lead is a test lead created in the playground. Test leads should not be visible outside the playground.';

