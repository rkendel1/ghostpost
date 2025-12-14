-- Social Accounts Table for OAuth Integration
-- Stores OAuth tokens and credentials for connected social media accounts

-- Table: social_accounts
-- Stores user connections to social media platforms with OAuth tokens
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- e.g., 'google', 'github', 'facebook', 'discord', 'twitter'
    provider_user_id TEXT NOT NULL, -- The user ID from the OAuth provider
    provider_username TEXT, -- Username/handle on the platform (if available)
    provider_email TEXT, -- Email from the provider (if available)
    access_token TEXT, -- OAuth access token (encrypted in production)
    refresh_token TEXT, -- OAuth refresh token (encrypted in production)
    token_expires_at TIMESTAMP WITH TIME ZONE, -- When the access token expires
    scope TEXT[], -- Array of granted OAuth scopes
    raw_user_meta_data JSONB, -- Raw user metadata from the provider
    is_active BOOLEAN DEFAULT true NOT NULL, -- Whether this connection is active
    last_used_at TIMESTAMP WITH TIME ZONE, -- Last time this account was used for posting
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, provider, provider_user_id) -- One connection per provider account
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON public.social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_provider ON public.social_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_provider ON public.social_accounts(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_social_accounts_is_active ON public.social_accounts(is_active);

-- Enable Row Level Security
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_accounts
-- Users can only view, insert, update, delete their own social accounts
CREATE POLICY "Users can manage their own social accounts"
ON public.social_accounts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update trigger for social_accounts.updated_at
CREATE TRIGGER update_social_accounts_updated_at
BEFORE UPDATE ON public.social_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.social_accounts IS 'Stores OAuth tokens and connections to social media platforms for automated posting';
COMMENT ON COLUMN public.social_accounts.provider IS 'OAuth provider name (google, github, facebook, discord, twitter)';
COMMENT ON COLUMN public.social_accounts.access_token IS 'OAuth access token - should be encrypted in production';
COMMENT ON COLUMN public.social_accounts.refresh_token IS 'OAuth refresh token for obtaining new access tokens';
COMMENT ON COLUMN public.social_accounts.scope IS 'Array of OAuth scopes granted by the user';
COMMENT ON COLUMN public.social_accounts.is_active IS 'Whether this connection is currently active and can be used';

-- Table: posts - Add social_account_id for tracking which account was used
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_social_account_id ON public.posts(social_account_id);

COMMENT ON COLUMN public.posts.social_account_id IS 'The connected social account used to post (if posted via OAuth)';
