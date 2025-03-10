/*
  # Templates table RLS policies

  1. Security Changes
    - Enable RLS on templates table
    - Add policies for:
      - Template creation for authenticated users
      - Template reading for authenticated users
      - Template deletion for authenticated users
*/

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create templates
CREATE POLICY "Enable template creation for authenticated users"
ON templates
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to read templates
CREATE POLICY "Enable template reading for authenticated users"
ON templates
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to delete their templates
CREATE POLICY "Enable template deletion for authenticated users"
ON templates
FOR DELETE
TO authenticated
USING (true);
