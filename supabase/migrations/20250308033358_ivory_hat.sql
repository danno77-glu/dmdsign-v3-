/*
  # Fix public access to documents

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies for public access
    - Update RLS settings
    
  2. Security
    - Allow public read access to templates and files
    - Allow public document signing
    - Maintain authenticated user access
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to templates" ON templates;
DROP POLICY IF EXISTS "Allow public document signing" ON signed_documents;
DROP POLICY IF EXISTS "Users can read their own signed documents" ON signed_documents;
DROP POLICY IF EXISTS "Authenticated users can manage their documents" ON signed_documents;

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_documents ENABLE ROW LEVEL SECURITY;

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

-- Create policy for authenticated users to manage their documents
CREATE POLICY "signed_documents_auth_all"
  ON signed_documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for authenticated users to manage templates
CREATE POLICY "templates_auth_all"
  ON templates
  FOR ALL
  TO authenticated
  USING (true);

-- Update storage bucket policies
DO $$
BEGIN
  -- Enable public access to template files
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('templates', 'templates', true)
  ON CONFLICT (id) DO UPDATE
  SET public = true;
END $$;
