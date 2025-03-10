/*
  # Update RLS policies for public document signing

  1. Changes
    - Allow public access to templates table for reading
    - Allow public access to signed_documents table for creating
    - Allow null user_id in signed_documents table
    
  2. Security
    - Templates are read-only for public access
    - Signed documents can be created by anyone
    - Admin users retain full control
*/

-- Update templates table policies
CREATE POLICY "Allow public read access to templates"
  ON templates
  FOR SELECT
  TO public
  USING (true);

-- Update signed_documents table
ALTER TABLE signed_documents
  ALTER COLUMN user_id DROP NOT NULL;

-- Add policy for public document signing
CREATE POLICY "Allow public document signing"
  ON signed_documents
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Keep existing policies for authenticated users
CREATE POLICY "Users can read their own signed documents"
  ON signed_documents
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    user_id IS NULL
  );
