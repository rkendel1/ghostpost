-- Fix Post ID Types for Limited Reveals Association
-- Run this SQL in Supabase SQL Editor to standardize post_id types and add foreign keys
-- Assumes existing post_id values in limited_secrets/reveal_events are valid UUID strings

-- Drop dependent RLS policy before type change
DROP POLICY IF EXISTS "Users can view reveal events for their posts" ON reveal_events;

-- Alter limited_secrets.post_id to UUID
ALTER TABLE limited_secrets 
ALTER COLUMN post_id TYPE UUID USING post_id::UUID;

-- Alter reveal_events.post_id to UUID
ALTER TABLE reveal_events 
ALTER COLUMN post_id TYPE UUID USING post_id::UUID;

-- Drop existing indexes if needed (recreate after type change)
DROP INDEX IF EXISTS idx_limited_secrets_post_id;
DROP INDEX IF EXISTS idx_reveal_events_post_id;

-- Recreate indexes with UUID type
CREATE INDEX idx_limited_secrets_post_id ON limited_secrets(post_id);
CREATE INDEX idx_reveal_events_post_id ON reveal_events(post_id);

-- Recreate RLS policy after type change (logic unchanged, types now UUID)
CREATE POLICY "Users can view reveal events for their posts"
ON reveal_events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM limited_secrets
        WHERE limited_secrets.post_id = reveal_events.post_id
        AND limited_secrets.user_id = auth.uid()
    )
);

-- Add foreign key constraints to link to posts.post_id
-- Assumes posts.post_id is the linking UUID
ALTER TABLE limited_secrets 
ADD CONSTRAINT fk_limited_secrets_post_id 
FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE;

ALTER TABLE reveal_events 
ADD CONSTRAINT fk_reveal_events_post_id 
FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE;

-- Update RLS policies if needed (no changes required, but verify)
-- Existing policies use post_id, which now matches UUID type

-- Update the RPC function to cast input to UUID for consistency
-- and handle potential type errors
DROP FUNCTION IF EXISTS increment_reveal_count(TEXT, TEXT);

CREATE OR REPLACE FUNCTION increment_reveal_count(
    p_post_id TEXT,
    p_user_fingerprint TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_post_uuid UUID := p_post_id::UUID;  -- Cast to UUID early for validation
    v_secret limited_secrets%ROWTYPE;
    v_new_count INTEGER;
    v_is_expired BOOLEAN;
    v_reveal_number INTEGER;
    v_post_exists BOOLEAN;
BEGIN
    -- Verify post exists in posts table
    SELECT EXISTS(SELECT 1 FROM posts WHERE post_id = v_post_uuid) INTO v_post_exists;
    IF NOT v_post_exists THEN
        -- Post not found, treat as unlimited or error; here return unlimited
        RETURN json_build_object(
            'success', true,
            'reveal_number', NULL,
            'total_reveals', NULL,
            'remaining', NULL,
            'is_unlimited', true
        );
    END IF;

    -- Lock the row for update to prevent race conditions
    SELECT * INTO v_secret
    FROM limited_secrets
    WHERE post_id = v_post_uuid
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
        WHERE post_id = v_post_uuid;
        
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
    WHERE post_id = v_post_uuid;

    -- Insert reveal event with UUID post_id
    INSERT INTO reveal_events (post_id, reveal_number, user_fingerprint)
    VALUES (v_post_uuid, v_new_count, p_user_fingerprint);

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
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'invalid_post_id',
            'message', 'Post ID is not a valid UUID'
        );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_reveal_count IS 'Atomically increments reveal count with race condition protection and UUID validation';

-- Comments for new constraints
COMMENT ON CONSTRAINT fk_limited_secrets_post_id ON limited_secrets IS 'Links limited secrets to posts via post_id UUID';
COMMENT ON CONSTRAINT fk_reveal_events_post_id ON reveal_events IS 'Links reveal events to posts via post_id UUID';