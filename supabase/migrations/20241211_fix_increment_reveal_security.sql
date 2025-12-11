-- Fix increment_reveal_count function to use SECURITY DEFINER
-- This allows the function to bypass RLS policies and properly update limited_secrets
-- Without this, anonymous users calling the function cannot lock rows with FOR UPDATE

CREATE OR REPLACE FUNCTION increment_reveal_count(
    p_post_id TEXT,
    p_user_fingerprint TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER -- This is the key fix - function runs with owner's permissions
SET search_path = public -- Security: prevent search_path attacks
AS $$
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

    -- Insert reveal event
    INSERT INTO reveal_events (post_id, reveal_number, user_fingerprint)
    VALUES (p_post_id, v_new_count, p_user_fingerprint);

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

COMMENT ON FUNCTION increment_reveal_count IS 'Atomically increments reveal count with race condition protection. Uses SECURITY DEFINER to bypass RLS for atomic operations.';
