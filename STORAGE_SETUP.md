# Supabase Storage Setup for Photo Uploads

After running the database migration `20260612000003_add_photo_uploads.sql`, you need to manually configure storage buckets in the Supabase dashboard.

## Step 1: Create Storage Buckets

### 1. Create 'avatars' bucket
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Configure:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Yes (checked)
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`

### 2. Create 'relationship-photos' bucket
1. Click "New bucket" again
2. Configure:
   - **Name**: `relationship-photos`
   - **Public bucket**: ✅ Yes (checked)
   - **File size limit**: 10MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`

## Step 2: Add Storage Policies

### For 'avatars' bucket:

Go to Storage → avatars → Policies, then add these policies:

#### Policy 1: Users can upload their own avatar
```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 2: Users can update their own avatar
```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 3: Users can delete their own avatar
```sql
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 4: Anyone can view avatars
```sql
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

### For 'relationship-photos' bucket:

Go to Storage → relationship-photos → Policies, then add these policies:

#### Policy 1: Partners can upload relationship photos
```sql
CREATE POLICY "Partners can upload relationship photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'relationship-photos'
  AND EXISTS (
    SELECT 1 FROM relationships r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
      AND r.status = 'active'
  )
);
```

#### Policy 2: Partners can delete relationship photos
```sql
CREATE POLICY "Partners can delete relationship photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'relationship-photos'
  AND EXISTS (
    SELECT 1 FROM relationships r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
  )
);
```

#### Policy 3: Anyone can view relationship photos
```sql
CREATE POLICY "Anyone can view relationship photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'relationship-photos');
```

## Step 3: Verify Setup

1. Navigate to `/profile` in your app
2. Try uploading a profile picture
3. Navigate to `/photos` in your app (must have active relationship)
4. Try uploading a couple photo

## Troubleshooting

### "new row violates row-level security policy"
- Check that the storage policies are correctly added
- Verify bucket names match exactly ('avatars' and 'relationship-photos')
- Ensure user is authenticated

### "Failed to upload"
- Check file size limits
- Verify MIME type is allowed
- Check browser console for detailed error messages

### Images not displaying
- Ensure buckets are marked as public
- Verify the `avatar_url` and `photo_url` fields contain valid URLs
- Check Supabase storage URL configuration

## File Structure

Profile pictures are stored as:
```
avatars/
  {user_id}/
    {timestamp}.{ext}
```

Relationship photos are stored as:
```
relationship-photos/
  {relationship_id}/
    {timestamp}.{ext}
```

This organization allows:
- Easy cleanup when users/relationships are deleted
- Simple permission management via folder structure
- Efficient querying and listing of photos
