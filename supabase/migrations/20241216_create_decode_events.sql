-- Decode Events Table for Universal Tracking
-- Tracks all decode attempts (limited and unlimited) for analytics
-- Run this SQL in your Supabase SQL Editor or via supabase db push

-- Table: decode_events
-- Records each decode attempt across all posts (privacy-first, anonymous)
CREATE TABLE IF NOT EXISTS public.decode_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id TEXT NOT NULL, -- Reference to the post (encoded ID)
    user_fingerprint TEXT, -- Anonymous user identifier (optional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance and queries
CREATE INDEX IF NOT EXISTS idx_decode_events_post_id ON public.decode_events(post_id);
CREATE INDEX IF NOT EXISTS idx_decode_events_created_at ON public.decode_events(created_at);

-- Enable Row Level Security
ALTER TABLE public.decode_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can insert decode events (for universal tracking from extension)
CREATE POLICY "Anyone can insert decode events"
ON public.decode_events FOR INSERT
WITH CHECK (true);

-- Users can view decode events for their own posts
CREATE POLICY "Users can view their own decode events"
ON public.decode_events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM posts
        WHERE posts.post_id = decode_events.post_id::UUID
        AND posts.user_id = auth.uid()
    )
);

-- Comments for documentation
COMMENT ON TABLE public.decode_events IS 'Tracks all decode attempts (limited/unlimited) for post analytics';
COMMENT ON COLUMN public.decode_events.post_id IS 'Encoded post ID from the decoded message';
COMMENT ON COLUMN public.decode_events.user_fingerprint IS 'Anonymous browser fingerprint for repeat decode tracking';
COMMENT ON COLUMN public.decode_events.created_at IS 'Timestamp of the decode attempt';

-- Function to get decode count for a post (for API responses)
CREATE OR REPLACE FUNCTION get_decode_count(p_post_id TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.decode_events
        WHERE post_id = p_post_id
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_decode_count IS 'Returns the total number of decode attempts for a post';