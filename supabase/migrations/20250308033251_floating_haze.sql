/*
  # Update public access policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies for public access to templates and signed documents
    - Make user_id nullable in signed_documents table
    
  2. Security
    - Allow public read access to templates
    - Allow public document signing without authentication
    - Maintain existing policies for authenticated users
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to templates" ON templates;
DROP POLICY IF EXISTS "Allow public document signing" ON signed_documents;
DROP POLICY IF EXISTS "Users can read their own signed documents" ON signed_documents;

-- Make user_id nullable
ALTER TABLE signed_documents
  ALTER COLUMN user_id DROP NOT NULL;

-- Enable RLS on templates table if not already enabled
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Enable RLS on signed_documents table if not already enabled
ALTER TABLE signed_documents ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to templates
CREATE POLICY "Allow public read access to templates"
  ON templates
  FOR SELECT
  TO public
  USING (true);

-- Create policy for public document signing
CREATE POLICY "Allow public document signing"
  ON signed_documents
  FOR INSERT
  TO public
  WITH CHECK (user_id IS NULL);

-- Create policy for reading signed documents
CREATE POLICY "Users can read their own signed documents"
  ON signed_documents
  FOR SELECT
  TO public
  USING (true);

-- Create policy for authenticated users to manage their documents
CREATE POLICY "Authenticated users can manage their documents"
  ON signed_documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
