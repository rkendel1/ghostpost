-- Posts Table for GhostPost
-- Run this SQL in your Supabase SQL Editor or via supabase db push
-- to create the posts table for storing encoded social media posts

-- Table: posts
-- Stores encoded posts with visible and secret messages
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL UNIQUE,
    content TEXT NOT NULL, -- Full encoded content for the post
    platform TEXT NOT NULL, -- e.g., 'twitter', 'linkedin'
    visible_message TEXT, -- Publicly visible part of the message
    secret_message TEXT, -- Hidden secret message
    secret_type TEXT DEFAULT 'text' NOT NULL, -- Type of secret (text, image, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_post_id ON public.posts(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_platform ON public.posts(platform);

-- Enable Row Level Security
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
-- Users can view, insert, update, delete their own posts
CREATE POLICY "Users can manage their own posts"
ON public.posts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update trigger for posts.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.posts IS 'Stores encoded posts with visible and secret messages for GhostPost';
COMMENT ON COLUMN public.posts.post_id IS 'Unique identifier for the post, used across limited reveals';
COMMENT ON COLUMN public.posts.content IS 'Full encoded content ready for posting to social media';
COMMENT ON COLUMN public.posts.visible_message IS 'The visible part of the post that anyone can see';
COMMENT ON COLUMN public.posts.secret_message IS 'The hidden secret message revealed via GhostPost';
COMMENT ON COLUMN public.posts.secret_type IS 'Type of secret content (default: text)';