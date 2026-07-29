-- ==========================================
-- Migration: 001_initial_schema.sql
-- Description: Production-ready PostgreSQL schema for Anime, Manga, and Manhwa Platform
-- Target: Supabase / PostgreSQL
-- ==========================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==========================================
-- 1. UPDATED_AT TRIGGER FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 2. USERS TABLE
-- Stores user profiles, credentials, and settings.
-- Integrates with Supabase auth.users if present, or works standalone.
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    date_of_birth DATE,
    avatar_url TEXT,
    bio TEXT,
    nickname_effect VARCHAR(100),
    background_banner TEXT,
    role VARCHAR(20) DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'moderator', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT username_min_length CHECK (char_length(username) >= 3),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Trigger for users.updated_at
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Optional Trigger: Auto-sync user profile when created via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, username, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. SESSIONS TABLE
-- Active user session tracking (legacy token support or server sessions).
-- ==========================================
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger for sessions.updated_at
CREATE TRIGGER set_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 4. WATCHLIST_ITEMS TABLE
-- Tracks media items saved by users (Anime, Manga, Manhwa)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_id INT NOT NULL CHECK (media_id > 0),
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('anime', 'manga', 'manhwa')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('watching', 'reading', 'plan_to_watch', 'completed', 'dropped', 'on_hold')),
    score INT CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
    progress_episode INT DEFAULT 0 NOT NULL CHECK (progress_episode >= 0),
    progress_chapter INT DEFAULT 0 NOT NULL CHECK (progress_chapter >= 0),
    media_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_watchlist_media UNIQUE (user_id, media_id, media_type)
);

-- Trigger for watchlist_items.updated_at
CREATE TRIGGER set_watchlist_updated_at
    BEFORE UPDATE ON public.watchlist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 5. RECENTLY_VIEWED TABLE
-- Viewing history log per user
-- ==========================================
CREATE TABLE IF NOT EXISTS public.recently_viewed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_id INT NOT NULL CHECK (media_id > 0),
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('anime', 'manga', 'manhwa')),
    media_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    viewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_recent_media UNIQUE (user_id, media_id, media_type)
);

-- Trigger for recently_viewed.updated_at
CREATE TRIGGER set_recently_viewed_updated_at
    BEFORE UPDATE ON public.recently_viewed
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. READ_CHAPTERS TABLE
-- Tracks read manga/manhwa chapters per user
-- ==========================================
CREATE TABLE IF NOT EXISTS public.read_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_id INT NOT NULL CHECK (media_id > 0),
    chapter_number NUMERIC(8, 2) NOT NULL CHECK (chapter_number >= 0),
    read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_read_chapter UNIQUE (user_id, media_id, chapter_number)
);

-- Trigger for read_chapters.updated_at
CREATE TRIGGER set_read_chapters_updated_at
    BEFORE UPDATE ON public.read_chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 7. INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ==========================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (LOWER(email));

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions (token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions (expires_at);

-- Watchlist
CREATE INDEX IF NOT EXISTS idx_watchlist_user_status ON public.watchlist_items (user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_media ON public.watchlist_items (user_id, media_id, media_type);

-- Recently Viewed
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_time ON public.recently_viewed (user_id, viewed_at DESC);

-- Read Chapters
CREATE INDEX IF NOT EXISTS idx_read_chapters_user_media ON public.read_chapters (user_id, media_id, chapter_number);

-- ==========================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.read_chapters ENABLE ROW LEVEL SECURITY;

-- 8.1 Users RLS
CREATE POLICY "Public user profiles are readable by everyone"
    ON public.users FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- 8.2 Sessions RLS
CREATE POLICY "Users can view their own active sessions"
    ON public.sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
    ON public.sessions FOR ALL
    USING (auth.uid() = user_id);

-- 8.3 Watchlist RLS
CREATE POLICY "Users can view their own watchlist"
    ON public.watchlist_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own watchlist"
    ON public.watchlist_items FOR ALL
    USING (auth.uid() = user_id);

-- 8.4 Recently Viewed RLS
CREATE POLICY "Users can view their own watch history"
    ON public.recently_viewed FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own watch history"
    ON public.recently_viewed FOR ALL
    USING (auth.uid() = user_id);

-- 8.5 Read Chapters RLS
CREATE POLICY "Users can view their own read chapters"
    ON public.read_chapters FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own read chapters"
    ON public.read_chapters FOR ALL
    USING (auth.uid() = user_id);
