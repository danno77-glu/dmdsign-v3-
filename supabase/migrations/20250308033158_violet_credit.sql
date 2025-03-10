/*
  # Update RLS policies for public access

  1. Changes
    - Update templates table policies to allow public read access
    - Update signed_documents table policies to allow public access
    - Make user_id nullable in signed_documents table
    
  2. Security
    - Enable public read access to templates
    - Allow public document signing without authentication
    - Maintain existing policies for authenticated users
*/

-- Update templates table policies
DO $$ BEGIN
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

-- Update signed_documents table
ALTER TABLE signed_documents
  ALTER COLUMN user_id DROP NOT NULL;

-- Add policy for public document signing
DO $$ BEGIN
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

-- Update existing policy for reading signed documents
DROP POLICY IF EXISTS "Users can read their own signed documents" ON signed_documents;
CREATE POLICY "Users can read their own signed documents"
  ON signed_documents
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    user_id IS NULL
  );
