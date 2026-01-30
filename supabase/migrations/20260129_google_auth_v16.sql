-- Migration: Add Google Auth columns to usuarios table
-- Idempotent: safe to run multiple times

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'google_refresh_token') THEN
        ALTER TABLE usuarios ADD COLUMN google_refresh_token text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'google_access_token') THEN
        ALTER TABLE usuarios ADD COLUMN google_access_token text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'google_token_expiry') THEN
        ALTER TABLE usuarios ADD COLUMN google_token_expiry bigint;
    END IF;
END $$;
