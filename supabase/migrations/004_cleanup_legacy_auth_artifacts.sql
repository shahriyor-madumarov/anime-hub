-- ==========================================
-- Migration: 004_cleanup_legacy_auth_artifacts.sql
-- Description: Clean up legacy authentication artifacts (sessions table and password_hash column)
--              now that authentication fully relies on Supabase Auth.
-- ==========================================

-- 1. Drop legacy sessions table if it exists
DROP TABLE IF EXISTS public.sessions CASCADE;

-- 2. Drop legacy password_hash column from public.users if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE public.users DROP COLUMN password_hash;
    END IF;
END $$;
