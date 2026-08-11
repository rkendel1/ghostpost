-- Secure Notes System
-- Encrypted notes with configurable expiry and access control
-- Run this SQL in your Supabase SQL Editor or via supabase db push

-- Create secure_notes table
CREATE TABLE IF NOT EXISTS public.secure_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encrypted_content TEXT NOT NULL,
    content_nonce TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{
        "expiryType": "time-based",
        "expiryMinutes": 1440,
        "requirePassword": false,
        "singleRevealOnly": false,
        "allowSharing": true,
        "metadata": {}
    }'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    post_id TEXT REFERENCES public.posts(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE,
    reveal_count INTEGER NOT NULL DEFAULT 0,
    unique_revealers INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create note_reveal_records table for tracking unique revealers
CREATE TABLE IF NOT EXISTS public.note_reveal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.secure_notes(id) ON DELETE CASCADE,
    revealer_fingerprint TEXT NOT NULL,
    revealed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_country TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_secure_notes_post_id ON public.secure_notes(post_id);
CREATE INDEX IF NOT EXISTS idx_secure_notes_owner_id ON public.secure_notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_secure_notes_status ON public.secure_notes(status);
CREATE INDEX IF NOT EXISTS idx_secure_notes_expires_at ON public.secure_notes(expires_at);
CREATE INDEX IF NOT EXISTS idx_note_reveal_records_note_id ON public.note_reveal_records(note_id);
CREATE INDEX IF NOT EXISTS idx_note_reveal_records_fingerprint ON public.note_reveal_records(revealer_fingerprint);

-- Enable RLS
ALTER TABLE public.secure_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_reveal_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for secure_notes
-- 1. Anyone can view notes (content is encrypted, so this is safe)
CREATE POLICY "Secure notes are viewable by anyone"
ON public.secure_notes FOR SELECT
USING (true);

-- 2. Anyone can insert new notes (no auth required for anonymous creation)
CREATE POLICY "Anyone can create secure notes"
ON public.secure_notes FOR INSERT
WITH CHECK (true);

-- 3. Only owners can update their notes
CREATE POLICY "Owners can update secure notes"
ON public.secure_notes FOR UPDATE
USING (auth.uid() = owner_id OR owner_id IS NULL)
WITH CHECK (auth.uid() = owner_id OR owner_id IS NULL);

-- 4. Only owners can delete their notes (soft delete via status)
CREATE POLICY "Owners can revoke secure notes"
ON public.secure_notes FOR DELETE
USING (auth.uid() = owner_id OR owner_id IS NULL);

-- RLS Policies for note_reveal_records
-- 1. Anyone can view reveal records (doesn't expose content)
CREATE POLICY "Reveal records are viewable"
ON public.note_reveal_records FOR SELECT
USING (true);

-- 2. Anyone can insert reveal records
CREATE POLICY "Anyone can record reveals"
ON public.note_reveal_records FOR INSERT
WITH CHECK (true);

-- Create function to cleanup expired notes (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_secure_notes()
RETURNS TABLE(deleted_count INTEGER, expired_count INTEGER) AS $$
DECLARE
    v_deleted INTEGER;
    v_expired INTEGER;
BEGIN
    -- Mark time-based expiry notes as expired
    UPDATE public.secure_notes
    SET status = 'expired'
    WHERE status = 'active'
    AND config->>'expiryType' = 'time-based'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
    GET DIAGNOSTICS v_expired = ROW_COUNT;

    -- Mark single-reveal notes as expired
    UPDATE public.secure_notes
    SET status = 'expired'
    WHERE status = 'active'
    AND config->>'expiryType' = 'single-reveal'
    AND reveal_count > 0;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN QUERY SELECT v_deleted, v_expired;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update note unique_revealers count
CREATE OR REPLACE FUNCTION update_unique_revealers()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.secure_notes
    SET unique_revealers = (
        SELECT COUNT(DISTINCT revealer_fingerprint)
        FROM public.note_reveal_records
        WHERE note_id = NEW.note_id
    )
    WHERE id = NEW.note_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_unique_revealers
AFTER INSERT ON public.note_reveal_records
FOR EACH ROW
EXECUTE FUNCTION update_unique_revealers();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_secure_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_secure_notes_timestamp
BEFORE UPDATE ON public.secure_notes
FOR EACH ROW
EXECUTE FUNCTION update_secure_notes_timestamp();

-- Create view for public analytics (without exposing encrypted content)
CREATE OR REPLACE VIEW public.secure_notes_analytics AS
SELECT
    id,
    post_id,
    owner_id,
    status,
    config->>'expiryType' as expiry_type,
    (config->>'expiryMinutes')::INTEGER as expiry_minutes,
    expires_at,
    reveal_count,
    unique_revealers,
    created_at,
    updated_at,
    CASE
        WHEN status = 'revoked' THEN true
        WHEN status = 'expired' THEN true
        WHEN config->>'expiryType' = 'time-based' AND expires_at IS NOT NULL AND expires_at < NOW() THEN true
        WHEN config->>'expiryType' = 'single-reveal' AND reveal_count > 0 THEN true
        ELSE false
    END as is_expired
FROM public.secure_notes;

-- Grant read access to analytics view
GRANT SELECT ON public.secure_notes_analytics TO anon, authenticated;
