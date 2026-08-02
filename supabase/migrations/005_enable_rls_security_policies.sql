-- ==========================================
-- Migration: 005_enable_rls_security_policies.sql
-- Description: Production-grade Row Level Security (RLS) policies for all tables.
-- ==========================================

-- ==========================================
-- 1. USERS TABLE RLS
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public user profiles are readable by everyone" ON public.users;
DROP POLICY IF EXISTS "Public user profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Everyone can read public profiles
CREATE POLICY "Public user profiles are viewable by everyone"
    ON public.users FOR SELECT
    USING (true);

-- Only the account owner can insert their matching user row
CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Only the owner can update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- No DELETE policy created: Profile deletion is disallowed for standard clients.


-- ==========================================
-- 2. WATCHLIST_ITEMS TABLE RLS
-- ==========================================
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own watchlist" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can manage their own watchlist" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can view their own watchlist items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can insert their own watchlist items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can update their own watchlist items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can delete their own watchlist items" ON public.watchlist_items;

CREATE POLICY "Users can view their own watchlist items"
    ON public.watchlist_items FOR SELECT
    USING (auth.uid() = user_id);

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


-- ==========================================
-- 3. RECENTLY_VIEWED TABLE RLS
-- ==========================================
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own watch history" ON public.recently_viewed;
DROP POLICY IF EXISTS "Users can manage their own watch history" ON public.recently_viewed;
DROP POLICY IF EXISTS "Users can view their own recent history" ON public.recently_viewed;
DROP POLICY IF EXISTS "Users can insert their own watch history" ON public.recently_viewed;
DROP POLICY IF EXISTS "Users can update their own watch history" ON public.recently_viewed;
DROP POLICY IF EXISTS "Users can delete their own watch history" ON public.recently_viewed;

CREATE POLICY "Users can view their own recent history"
    ON public.recently_viewed FOR SELECT
    USING (auth.uid() = user_id);

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


-- ==========================================
-- 4. READ_CHAPTERS TABLE RLS
-- ==========================================
ALTER TABLE public.read_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own read chapters" ON public.read_chapters;
DROP POLICY IF EXISTS "Users can manage their own read chapters" ON public.read_chapters;
DROP POLICY IF EXISTS "Users can insert their own read chapters" ON public.read_chapters;
DROP POLICY IF EXISTS "Users can update their own read chapters" ON public.read_chapters;
DROP POLICY IF EXISTS "Users can delete their own read chapters" ON public.read_chapters;

CREATE POLICY "Users can view their own read chapters"
    ON public.read_chapters FOR SELECT
    USING (auth.uid() = user_id);

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


-- ==========================================
-- 5. FAVORITES TABLE RLS
-- ==========================================
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can update their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;

CREATE POLICY "Users can view their own favorites"
    ON public.favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
    ON public.favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites"
    ON public.favorites FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
    ON public.favorites FOR DELETE
    USING (auth.uid() = user_id);


-- ==========================================
-- 6. RATINGS TABLE RLS
-- ==========================================
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON public.ratings;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.ratings;

-- Everyone can view ratings and reviews
CREATE POLICY "Ratings are viewable by everyone"
    ON public.ratings FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own ratings"
    ON public.ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
    ON public.ratings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
    ON public.ratings FOR DELETE
    USING (auth.uid() = user_id);


-- ==========================================
-- 7. COMMENTS TABLE RLS
-- ==========================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Everyone can view comments
CREATE POLICY "Comments are viewable by everyone"
    ON public.comments FOR SELECT
    USING (true);

-- Only authenticated users can post comments, and user_id must match auth.uid()
CREATE POLICY "Authenticated users can insert comments"
    ON public.comments FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Only comment author can update their comment
CREATE POLICY "Users can update their own comments"
    ON public.comments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Only comment author can delete their comment
CREATE POLICY "Users can delete their own comments"
    ON public.comments FOR DELETE
    USING (auth.uid() = user_id);
