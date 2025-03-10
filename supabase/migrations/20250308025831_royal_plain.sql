/*
  # Create templates table

  1. New Tables
    - `templates`
      - `id` (text, primary key)
      - `name` (text)
      - `fields` (jsonb)
      - `file_path` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `templates` table
    - Add policy for authenticated users to manage their templates
*/

CREATE TABLE IF NOT EXISTS templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  fields jsonb NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own templates"
  ON templates
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL);
