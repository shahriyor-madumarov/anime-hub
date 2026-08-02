-- ==========================================
-- Migration: 006_setup_storage_buckets_and_policies.sql
-- Description: Provision Supabase Storage buckets 'avatars' and 'banners'
--              with RLS policies and size/format restrictions.
-- ==========================================

-- 1. Create storage buckets (avatars, banners)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('banners', 'banners', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==========================================
-- 2. RLS POLICIES FOR 'avatars' BUCKET
-- ==========================================

-- Public read access for avatars
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
CREATE POLICY "Public Read Avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users insert into avatars bucket under their own userId folder
DROP POLICY IF EXISTS "Authenticated Upload Avatars" ON storage.objects;
CREATE POLICY "Authenticated Upload Avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users update their own avatar files
DROP POLICY IF EXISTS "Users Update Own Avatars" ON storage.objects;
CREATE POLICY "Users Update Own Avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users delete their own avatar files
DROP POLICY IF EXISTS "Users Delete Own Avatars" ON storage.objects;
CREATE POLICY "Users Delete Own Avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ==========================================
-- 3. RLS POLICIES FOR 'banners' BUCKET
-- ==========================================

-- Public read access for banners
DROP POLICY IF EXISTS "Public Read Banners" ON storage.objects;
CREATE POLICY "Public Read Banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

-- Authenticated users insert into banners bucket under their own userId folder
DROP POLICY IF EXISTS "Authenticated Upload Banners" ON storage.objects;
CREATE POLICY "Authenticated Upload Banners"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'banners'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users update their own banner files
DROP POLICY IF EXISTS "Users Update Own Banners" ON storage.objects;
CREATE POLICY "Users Update Own Banners"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'banners'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'banners'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users delete their own banner files
DROP POLICY IF EXISTS "Users Delete Own Banners" ON storage.objects;
CREATE POLICY "Users Delete Own Banners"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'banners'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
