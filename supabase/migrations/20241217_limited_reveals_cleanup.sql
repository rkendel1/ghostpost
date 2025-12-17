-- Limited Reveals Schema Cleanup
-- Removes redundancy, merges reveal_events into decode_events
-- Run this SQL in your Supabase SQL Editor or via supabase db push
-- This migration assumes existing data; it migrates reveal_events to decode_events before dropping

-- Step 1: Drop redundant max_reveals column from posts (data in limited_secrets)
ALTER TABLE IF EXISTS public.posts DROP COLUMN IF EXISTS max_reveals;

-- Step 2: Add columns to decode_events for limited reveals data
ALTER TABLE IF EXISTS public.decode_events
ADD COLUMN IF NOT EXISTS is_limited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reveal_number INTEGER,
ADD COLUMN IF NOT EXISTS max_reveals INTEGER;

-- Step 4: Migrate data from reveal_events to decode_events (conditional if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reveal_events'
    ) THEN
        -- Insert reveal events as limited decodes (preserve timestamp, fingerprint, number)
        INSERT INTO public.decode_events (post_id, user_fingerprint, created_at, is_limited, reveal_number, max_reveals)
        SELECT 
            re.post_id,
            re.user_fingerprint,
            re.timestamp,  -- Use reveal_events timestamp
            true,
            re.reveal_number,
            ls.max_reveals  -- Get max from limited_secrets
        FROM public.reveal_events re
        LEFT JOIN public.limited_secrets ls ON re.post_id = ls.post_id;
    END IF;
END $$;

-- Step 5: Drop reveal_events table, indexes, policies
DROP POLICY IF EXISTS "Users can view reveal events for their posts" ON public.reveal_events;
DROP POLICY IF EXISTS "Anyone can insert reveal events" ON public.reveal_events;
DROP TRIGGER IF EXISTS update_limited_secrets_updated_at ON public.limited_secrets;  -- Keep this if needed elsewhere
ALTER TABLE IF EXISTS public.reveal_events DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS public.reveal_events;
DROP INDEX IF EXISTS idx_reveal_events_post_id;
DROP INDEX IF EXISTS idx_reveal_events_timestamp;

-- Step 5: Update RLS on decode_events for limited inserts
-- Allow insert with is_limited=true only if limited_secrets exists for post_id
DROP POLICY IF EXISTS "Anyone can insert decode events" ON public.decode_events;
CREATE POLICY "Public insert decode events (unlimited or limited if secrets exist)"
ON public.decode_events FOR INSERT
WITH CHECK (
    NOT is_limited OR 
    EXISTS (
        SELECT 1 FROM limited_secrets ls 
        WHERE ls.post_id = decode_events.post_id
    )
);

-- Keep existing select policy
-- Users can view their own decode events (unchanged)

-- Step 7: Update increment_reveal_count function
-- Now inserts to decode_events instead of reveal_events
CREATE OR REPLACE FUNCTION increment_reveal_count(
    p_post_id TEXT,
    p_user_fingerprint TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_secret limited_secrets%ROWTYPE;
    v_new_count INTEGER;
    v_is_expired BOOLEAN;
    v_reveal_number INTEGER;
BEGIN
    -- Lock the row for update to prevent race conditions
    SELECT * INTO v_secret
    FROM limited_secrets
    WHERE post_id = p_post_id
    FOR UPDATE;

    -- If no record exists, return success (unlimited reveals)
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', true,
            'reveal_number', NULL,
            'total_reveals', NULL,
            'remaining', NULL,
            'is_unlimited', true
        );
    END IF;

    -- Check if already expired
    IF v_secret.is_expired THEN
        RETURN json_build_object(
            'success', false,
            'error', 'expired'
        );
    END IF;

    -- Check if limit would be exceeded
    IF v_secret.max_reveals IS NOT NULL AND v_secret.current_reveals >= v_secret.max_reveals THEN
        -- Mark as expired
        UPDATE limited_secrets
        SET is_expired = true, updated_at = NOW()
        WHERE post_id = p_post_id;
        
        RETURN json_build_object(
            'success', false,
            'error', 'expired'
        );
    END IF;

    -- Increment the counter
    v_new_count := v_secret.current_reveals + 1;
    v_is_expired := (v_secret.max_reveals IS NOT NULL AND v_new_count >= v_secret.max_reveals);

    UPDATE limited_secrets
    SET 
        current_reveals = v_new_count,
        is_expired = v_is_expired,
        updated_at = NOW()
    WHERE post_id = p_post_id;

    -- Insert to decode_events (merged from reveal_events)
    INSERT INTO decode_events (post_id, user_fingerprint, is_limited, reveal_number, max_reveals)
    VALUES (p_post_id, p_user_fingerprint, true, v_new_count, v_secret.max_reveals);

    -- Return success with details
    RETURN json_build_object(
        'success', true,
        'reveal_number', v_new_count,
        'total_reveals', v_secret.max_reveals,
        'remaining', CASE 
            WHEN v_secret.max_reveals IS NULL THEN NULL 
            ELSE v_secret.max_reveals - v_new_count 
        END,
        'is_unlimited', false
    );
END;
$$ LANGUAGE plpgsql;

-- Step 8: Update get_decode_count function to support limited_only filter
CREATE OR REPLACE FUNCTION get_decode_count(p_post_id TEXT, p_limited_only BOOLEAN DEFAULT false)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.decode_events
        WHERE post_id = p_post_id
        AND (NOT p_limited_only OR is_limited = true)
    );
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_decode_events_is_limited ON public.decode_events(is_limited);
CREATE INDEX IF NOT EXISTS idx_decode_events_reveal_number ON public.decode_events(reveal_number);
CREATE INDEX IF NOT EXISTS idx_decode_events_max_reveals ON public.decode_events(max_reveals);
CREATE INDEX IF NOT EXISTS idx_decode_events_limited_post ON public.decode_events(post_id) WHERE is_limited = true;

-- Comments for documentation
COMMENT ON COLUMN public.decode_events.is_limited IS 'True if this decode was a limited reveal';
COMMENT ON COLUMN public.decode_events.reveal_number IS 'Reveal sequence number for limited posts (null for unlimited)';
COMMENT ON COLUMN public.decode_events.max_reveals IS 'Max reveals for limited posts (null for unlimited)';

COMMENT ON FUNCTION get_decode_count IS 'Returns total decode attempts for a post; optional limited_only filter for reveal counts';

-- Re-enable RLS on decode_events if disabled
ALTER TABLE public.decode_events ENABLE ROW LEVEL SECURITY;

-- Migration complete: Schema now unified, redundancy removed