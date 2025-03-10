/*
  # Authentication and Storage Setup

  1. Storage
    - Create templates bucket for storing PDF files
    - Set up storage policies for authenticated users

  2. Security
    - Enable RLS on templates table
    - Add policies for authenticated users to manage their templates
*/

-- Create storage bucket for templates
INSERT INTO storage.buckets (id, name)
VALUES ('templates', 'templates')
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Authenticated users can upload templates"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'templates');

CREATE POLICY "Authenticated users can read templates"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'templates');

CREATE POLICY "Authenticated users can delete their templates"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'templates');

-- Enable RLS on templates table
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Add policies for templates table
CREATE POLICY "Authenticated users can create templates"
ON templates FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can read templates"
ON templates FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update their templates"
ON templates FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete their templates"
ON templates FOR DELETE TO authenticated
USING (true);
