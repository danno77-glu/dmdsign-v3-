/*
  # Add signed documents table

  1. New Tables
    - `signed_documents`
      - `id` (uuid, primary key)
      - `template_id` (text, references templates)
      - `form_values` (jsonb)
      - `created_at` (timestamp)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `signed_documents` table
    - Add policies for authenticated users to:
      - Create their own signed documents
      - Read their own signed documents
*/

CREATE TABLE IF NOT EXISTS signed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text REFERENCES templates(id) ON DELETE CASCADE,
  form_values jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE signed_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own signed documents"
  ON signed_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own signed documents"
  ON signed_documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
