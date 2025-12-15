-- Migration: Encrypt Secret Messages
-- This migration adds support for encrypted storage of secret messages
-- The secret_message column will now store encrypted data instead of plain text

-- Add a column to track whether a post's secret is encrypted
-- This allows for gradual migration and backward compatibility
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS secret_encrypted BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for querying encrypted vs unencrypted secrets
CREATE INDEX IF NOT EXISTS idx_posts_secret_encrypted ON public.posts(secret_encrypted);

-- Comment for documentation
COMMENT ON COLUMN public.posts.secret_encrypted IS 'Indicates whether the secret_message is encrypted (true) or plain text (false)';

-- Note: The actual encryption/decryption will be handled at the application layer
-- This migration just prepares the database schema to support encrypted secrets
-- 
-- Migration strategy:
-- 1. New posts will be encrypted by default (secret_encrypted = true)
-- 2. Existing posts remain in plain text (secret_encrypted = false) until re-encrypted
-- 3. A separate data migration script can be run to encrypt existing plain text secrets
