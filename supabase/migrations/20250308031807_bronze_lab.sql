/*
  # Add storage policies for templates bucket

  1. Security
    - Enable storage access for authenticated users
    - Allow authenticated users to:
      - Create and manage buckets
      - Upload files to templates bucket
      - Read files from templates bucket
      - Delete their own files
*/

-- Enable storage access for authenticated users
CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'templates');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated users to read files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'templates');

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'templates');
