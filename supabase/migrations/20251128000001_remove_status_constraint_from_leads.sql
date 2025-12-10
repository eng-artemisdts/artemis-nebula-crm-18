-- Remove the constraint that limits status values to fixed list
-- This allows organizations to use custom statuses
ALTER TABLE public.leads
DROP CONSTRAINT IF EXISTS valid_status;


