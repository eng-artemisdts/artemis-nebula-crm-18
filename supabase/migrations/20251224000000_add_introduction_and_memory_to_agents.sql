-- Add should_introduce_itself and memory_amount columns to ai_interaction_settings table
-- should_introduce_itself: boolean to control if agent should introduce itself at conversation start
-- memory_amount: text to define memory capacity for the agent (e.g., "short", "medium", "long", or specific tokens)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_interaction_settings' 
    AND column_name = 'should_introduce_itself'
  ) THEN
    ALTER TABLE public.ai_interaction_settings
    ADD COLUMN should_introduce_itself BOOLEAN DEFAULT true;

    COMMENT ON COLUMN public.ai_interaction_settings.should_introduce_itself IS 'Whether the agent should introduce itself at the start of conversations';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_interaction_settings' 
    AND column_name = 'memory_amount'
  ) THEN
    ALTER TABLE public.ai_interaction_settings
    ADD COLUMN memory_amount TEXT DEFAULT '20';

    COMMENT ON COLUMN public.ai_interaction_settings.memory_amount IS 'Number of messages the agent should keep in memory (as text, e.g., "10", "20", "50")';
  END IF;
END $$;

