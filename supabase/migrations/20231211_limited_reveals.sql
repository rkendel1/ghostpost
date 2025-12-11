-- Limited Reveals Feature Tables
-- Run this SQL in your Supabase SQL Editor to add limited reveals functionality

-- Table: limited_secrets
-- Tracks posts with reveal limits
CREATE TABLE IF NOT EXISTS limited_secrets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    max_reveals INTEGER, -- NULL means unlimited reveals
    current_reveals INTEGER DEFAULT 0 NOT NULL,
    is_expired BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: reveal_events
-- Records individual reveal events for analytics
CREATE TABLE IF NOT EXISTS reveal_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id TEXT NOT NULL,
    reveal_number INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    user_fingerprint TEXT, -- Anonymous user identifier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_limited_secrets_post_id ON limited_secrets(post_id);
CREATE INDEX IF NOT EXISTS idx_limited_secrets_user_id ON limited_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_limited_secrets_is_expired ON limited_secrets(is_expired);
CREATE INDEX IF NOT EXISTS idx_reveal_events_post_id ON reveal_events(post_id);
CREATE INDEX IF NOT EXISTS idx_reveal_events_timestamp ON reveal_events(timestamp);

-- Enable Row Level Security
ALTER TABLE limited_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reveal_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for limited_secrets
-- Allow users to read their own limited secrets
CREATE POLICY "Users can view their own limited secrets"
ON limited_secrets FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to create limited secrets
CREATE POLICY "Users can create limited secrets"
ON limited_secrets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow public read access to limited secret status (only necessary columns for decode page)
-- This policy restricts access to only the fields needed for display, hiding user_id
CREATE POLICY "Anyone can view limited secret status (restricted)"
ON limited_secrets FOR SELECT
USING (true);
-- Note: While this allows reading all columns, the API endpoints should only return
-- the necessary fields (post_id, current_reveals, max_reveals, is_expired).
-- To fully restrict at DB level, use views or functions instead of direct table access.

-- RLS Policies for reveal_events
-- Allow users to view reveal events for their posts
CREATE POLICY "Users can view reveal events for their posts"
ON reveal_events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM limited_secrets
        WHERE limited_secrets.post_id = reveal_events.post_id
        AND limited_secrets.user_id = auth.uid()
    )
);

-- Allow anyone to insert reveal events (needed for decode tracking)
CREATE POLICY "Anyone can insert reveal events"
ON reveal_events FOR INSERT
WITH CHECK (true);

-- Update trigger for limited_secrets.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_limited_secrets_updated_at
BEFORE UPDATE ON limited_secrets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE limited_secrets IS 'Tracks posts with reveal limits (limited edition secrets)';
COMMENT ON TABLE reveal_events IS 'Records each reveal event for analytics and FOMO tracking';
COMMENT ON COLUMN limited_secrets.max_reveals IS 'Maximum number of reveals allowed. NULL = unlimited';
COMMENT ON COLUMN limited_secrets.current_reveals IS 'Current number of reveals that have occurred';
COMMENT ON COLUMN limited_secrets.is_expired IS 'True when max_reveals has been reached';

-- Atomic increment function for reveals with race condition protection
-- This ensures that reveal increments are atomic and prevents over-revealing
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

COMMENT ON FUNCTION increment_reveal_count IS 'Atomically increments reveal count with race condition protection';

