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
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'templates' 
    AND policyname = 'Allow public read access to templates'
  ) THEN
    CREATE POLICY "Allow public read access to templates"
      ON templates
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Update signed_documents table to allow null user_id
ALTER TABLE signed_documents
  ALTER COLUMN user_id DROP NOT NULL;

-- Add policy for public document signing if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'signed_documents' 
    AND policyname = 'Allow public document signing'
  ) THEN
    CREATE POLICY "Allow public document signing"
      ON signed_documents
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- Drop existing policy if it exists to avoid conflicts
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'signed_documents' 
    AND policyname = 'Users can read their own signed documents'
  ) THEN
    DROP POLICY "Users can read their own signed documents" ON signed_documents;
  END IF;
END $$;

-- Create updated policy for reading signed documents
CREATE POLICY "Users can read their own signed documents"
  ON signed_documents
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    user_id IS NULL
  );
