-- ==========================================
-- Migration: 002_fix_schema.sql
-- Description: Schema optimizations, missing triggers, RLS policy hardening,
--              and redundant index cleanups for Supabase production readiness.
-- ==========================================

-- ==========================================
-- 1. ATTACH MISSING SUPABASE AUTH TRIGGER
-- Automatically creates a public.users profile when a new user registers via Supabase Auth
-- ==========================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
        ) THEN
            CREATE TRIGGER on_auth_user_created
                AFTER INSERT ON auth.users
                FOR EACH ROW
                EXECUTE FUNCTION public.handle_new_auth_user();
        END IF;
    END IF;
END $$;

-- ==========================================
-- 2. CLEANUP REDUNDANT INDEXES
-- Drop indexes that duplicate existing UNIQUE constraint B-tree indexes
-- ==========================================
DROP INDEX IF EXISTS public.idx_watchlist_user_media;
DROP INDEX IF EXISTS public.idx_read_chapters_user_media;

-- ==========================================
-- 3. ADD HIGH-PERFORMANCE SEARCH & JSONB INDEXES
-- ==========================================

-- Trigram GIN index for fast fuzzy username searching
CREATE INDEX IF NOT EXISTS idx_users_username_trgm 
    ON public.users USING gin (username gin_trgm_ops);

-- Partial index for active watchlist items (frequent filter scenario)
CREATE INDEX IF NOT EXISTS idx_watchlist_active_items 
    ON public.watchlist_items (user_id, updated_at DESC) 
    WHERE status IN ('watching', 'reading', 'plan_to_watch');

-- GIN index on media_data JSONB for fast JSON key-value lookups
CREATE INDEX IF NOT EXISTS idx_watchlist_media_data_gin 
    ON public.watchlist_items USING gin (media_data);

CREATE INDEX IF NOT EXISTS idx_recently_viewed_media_data_gin 
    ON public.recently_viewed USING gin (media_data);

-- ==========================================
-- 4. HARDEN RLS POLICIES WITH EXPLICIT 'WITH CHECK'
-- Ensures users cannot spoof user_id or id during INSERT/UPDATE operations
-- ==========================================

-- 4.1 USERS TABLE
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 4.2 SESSIONS TABLE
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.sessions;
CREATE POLICY "Users can insert their own sessions"
    ON public.sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
    ON public.sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
    ON public.sessions FOR DELETE
    USING (auth.uid() = user_id);

-- 4.3 WATCHLIST TABLE
DROP POLICY IF EXISTS "Users can manage their own watchlist" ON public.watchlist_items;
CREATE POLICY "Users can insert their own watchlist items"
    ON public.watchlist_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist items"
    ON public.watchlist_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist items"
    ON public.watchlist_items FOR DELETE
    USING (auth.uid() = user_id);

-- 4.4 RECENTLY VIEWED TABLE
DROP POLICY IF EXISTS "Users can manage their own watch history" ON public.recently_viewed;
CREATE POLICY "Users can insert their own watch history"
    ON public.recently_viewed FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch history"
    ON public.recently_viewed FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch history"
    ON public.recently_viewed FOR DELETE
    USING (auth.uid() = user_id);

-- 4.5 READ CHAPTERS TABLE
DROP POLICY IF EXISTS "Users can manage their own read chapters" ON public.read_chapters;
CREATE POLICY "Users can insert their own read chapters"
    ON public.read_chapters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read chapters"
    ON public.read_chapters FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own read chapters"
    ON public.read_chapters FOR DELETE
    USING (auth.uid() = user_id);
