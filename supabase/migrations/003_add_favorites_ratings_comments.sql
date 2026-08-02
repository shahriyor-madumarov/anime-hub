-- ==========================================
-- Migration: 003_add_favorites_ratings_comments.sql
-- Description: Adds missing tables (favorites, ratings, comments),
--              ensures auth.users references, timestamps, indexes, and constraints.
-- ==========================================

-- ==========================================
-- 1. ALTER EXISTING TABLES TO HARDEN FOREIGN KEYS TO auth.users
-- ==========================================

-- Ensure foreign key from public.users to auth.users if auth schema exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_users_auth' AND table_name = 'users'
        ) THEN
            ALTER TABLE public.users 
            ADD CONSTRAINT fk_users_auth FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- ==========================================
-- 2. CREATE FAVORITES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_id INT NOT NULL CHECK (media_id > 0),
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('anime', 'manga', 'manhwa')),
    media_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_favorite_media UNIQUE (user_id, media_id, media_type)
);

-- Trigger for favorites.updated_at
DROP TRIGGER IF EXISTS set_favorites_updated_at ON public.favorites;
CREATE TRIGGER set_favorites_updated_at
    BEFORE UPDATE ON public.favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_media ON public.favorites (user_id, media_id, media_type);
CREATE INDEX IF NOT EXISTS idx_favorites_media_data_gin ON public.favorites USING gin (media_data);

-- ==========================================
-- 3. CREATE RATINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_id INT NOT NULL CHECK (media_id > 0),
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('anime', 'manga', 'manhwa')),
    rating NUMERIC(3, 1) NOT NULL CHECK (rating >= 0 AND rating <= 10),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_media_rating UNIQUE (user_id, media_id, media_type)
);

-- Trigger for ratings.updated_at
DROP TRIGGER IF EXISTS set_ratings_updated_at ON public.ratings;
CREATE TRIGGER set_ratings_updated_at
    BEFORE UPDATE ON public.ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for ratings
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON public.ratings (user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_media_id ON public.ratings (media_id, media_type);
CREATE INDEX IF NOT EXISTS idx_ratings_user_media ON public.ratings (user_id, media_id);

-- ==========================================
-- 4. CREATE COMMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_id INT NOT NULL CHECK (media_id > 0),
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('anime', 'manga', 'manhwa')),
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
    is_spoiler BOOLEAN DEFAULT FALSE NOT NULL,
    likes_count INT DEFAULT 0 NOT NULL CHECK (likes_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger for comments.updated_at
DROP TRIGGER IF EXISTS set_comments_updated_at ON public.comments;
CREATE TRIGGER set_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_media ON public.comments (media_id, media_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments (parent_id);
