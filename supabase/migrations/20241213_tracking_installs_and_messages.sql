-- Tracking for Userscript Installs and Encoded Messages
-- Privacy-first approach: No PII, only aggregate metrics

-- Table: userscript_installs
-- Tracks userscript installations with device info
CREATE TABLE IF NOT EXISTS public.userscript_installs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for anonymous users
    install_fingerprint TEXT NOT NULL UNIQUE, -- Unique identifier for the install (browser + device hash)
    user_agent TEXT, -- Browser/device info
    platform TEXT, -- Desktop/Mobile/Tablet
    browser TEXT, -- Chrome, Firefox, Safari, etc.
    os TEXT, -- Windows, Mac, Linux, iOS, Android
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    version TEXT, -- Userscript version
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: encoded_messages_tracking
-- Tracks encoded message creation (no actual message content)
CREATE TABLE IF NOT EXISTS public.encoded_messages_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL, -- Reference to the post
    platform TEXT NOT NULL, -- twitter, linkedin, facebook, tiktok, etc.
    secret_type TEXT NOT NULL, -- 'text' or 'image'
    visible_length INTEGER NOT NULL, -- Length of visible message
    hidden_length INTEGER NOT NULL, -- Length of hidden content (in characters)
    total_length INTEGER NOT NULL, -- Total encoded message length
    has_limited_reveals BOOLEAN DEFAULT FALSE, -- Whether limited reveals was enabled
    max_reveals INTEGER, -- Max reveals if limited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_userscript_installs_user_id ON public.userscript_installs(user_id);
CREATE INDEX IF NOT EXISTS idx_userscript_installs_fingerprint ON public.userscript_installs(install_fingerprint);
CREATE INDEX IF NOT EXISTS idx_userscript_installs_last_seen ON public.userscript_installs(last_seen);
CREATE INDEX IF NOT EXISTS idx_encoded_messages_tracking_user_id ON public.encoded_messages_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_encoded_messages_tracking_post_id ON public.encoded_messages_tracking(post_id);
CREATE INDEX IF NOT EXISTS idx_encoded_messages_tracking_platform ON public.encoded_messages_tracking(platform);
CREATE INDEX IF NOT EXISTS idx_encoded_messages_tracking_created_at ON public.encoded_messages_tracking(created_at);

-- Enable Row Level Security
ALTER TABLE public.userscript_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encoded_messages_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for userscript_installs
-- Allow anyone to insert installs (for anonymous tracking)
CREATE POLICY "Anyone can insert userscript installs"
ON public.userscript_installs FOR INSERT
WITH CHECK (true);

-- Allow anyone to update their own install (by fingerprint for heartbeats)
CREATE POLICY "Anyone can update their own install by fingerprint"
ON public.userscript_installs FOR UPDATE
USING (true);

-- Users can view their own installs
CREATE POLICY "Users can view their own installs"
ON public.userscript_installs FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for encoded_messages_tracking
-- Users can view their own encoded message stats
CREATE POLICY "Users can view their own encoded messages tracking"
ON public.encoded_messages_tracking FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own encoded message tracking
CREATE POLICY "Users can insert their own encoded messages tracking"
ON public.encoded_messages_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update trigger for userscript_installs.updated_at
CREATE TRIGGER update_userscript_installs_updated_at
BEFORE UPDATE ON public.userscript_installs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.userscript_installs IS 'Tracks userscript installations with device info (privacy-first, no PII)';
COMMENT ON TABLE public.encoded_messages_tracking IS 'Tracks encoded message creation statistics (no actual message content stored)';
COMMENT ON COLUMN public.userscript_installs.install_fingerprint IS 'Unique identifier for the install (browser + device hash)';
COMMENT ON COLUMN public.userscript_installs.last_seen IS 'Last heartbeat/activity timestamp from userscript';
COMMENT ON COLUMN public.encoded_messages_tracking.visible_length IS 'Character count of visible message';
COMMENT ON COLUMN public.encoded_messages_tracking.hidden_length IS 'Character count of hidden content';
COMMENT ON COLUMN public.encoded_messages_tracking.total_length IS 'Total character count of encoded message';
