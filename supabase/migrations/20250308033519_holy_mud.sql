/*
  # Fix public access to documents and storage

  1. Changes
    - Update storage bucket policies
    - Add public access policies for templates and signed documents
    
  2. Security
    - Allow public read access to templates and files
    - Allow public document signing
    - Maintain authenticated user access
*/

-- Make storage bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'templates';

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "templates_public_read" ON templates;
DROP POLICY IF EXISTS "signed_documents_public_insert" ON signed_documents;
DROP POLICY IF EXISTS "signed_documents_public_read" ON signed_documents;

-- Create policy for public read access to templates
CREATE POLICY "templates_public_read"
ON templates
FOR SELECT
TO public
USING (true);

-- Create policy for public document signing
CREATE POLICY "signed_documents_public_insert"
ON signed_documents
FOR INSERT
TO public
WITH CHECK (user_id IS NULL);

-- Create policy for public read access to signed documents
CREATE POLICY "signed_documents_public_read"
ON signed_documents
FOR SELECT
TO public
USING (true);
