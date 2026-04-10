-- Add extracted text caching to documents table
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS extracted_text text,
  ADD COLUMN IF NOT EXISTS text_extracted_at timestamptz;

-- Cache table for Akkio platform knowledge docs (fetched from Google Drive)
CREATE TABLE IF NOT EXISTS public.help_bot_knowledge (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gdrive_file_id  text NOT NULL UNIQUE,
  file_name       text NOT NULL,
  extracted_text  text,
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.help_bot_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on help_bot_knowledge"
  ON public.help_bot_knowledge FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read help_bot_knowledge"
  ON public.help_bot_knowledge FOR SELECT TO authenticated USING (true);
