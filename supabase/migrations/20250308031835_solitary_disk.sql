/*
  # Storage policies for templates bucket

  1. Security Changes
    - Create templates bucket if it doesn't exist
    - Enable storage access for authenticated users
    - Add policies for:
      - Bucket creation and management
      - File upload, read, and delete operations
*/

-- Create templates bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- Enable bucket management for authenticated users
CREATE POLICY "Enable bucket management for authenticated users"
ON storage.buckets
FOR ALL
TO authenticated
USING (name = 'templates')
WITH CHECK (name = 'templates');

-- Enable file upload for authenticated users
CREATE POLICY "Enable file upload for authenticated users"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'templates');

-- Enable file read for authenticated users
CREATE POLICY "Enable file read for authenticated users"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'templates');

-- Enable file delete for authenticated users
CREATE POLICY "Enable file delete for authenticated users"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'templates');
