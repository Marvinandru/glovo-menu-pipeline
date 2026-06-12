-- ============================================================
-- Glovo Menu Digitization Tool — Database Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Jobs table: tracks each menu processing run
CREATE TABLE IF NOT EXISTS jobs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Original upload
  file_name     TEXT NOT NULL,
  file_url      TEXT,                -- Supabase Storage URL of the uploaded menu

  -- Processing state
  status        TEXT DEFAULT 'pending' NOT NULL
                CHECK (status IN ('pending', 'extracting', 'generating', 'packaging', 'completed', 'failed')),
  progress      INTEGER DEFAULT 0,   -- 0–100 %
  total_items   INTEGER DEFAULT 0,
  items_done    INTEGER DEFAULT 0,
  error_message TEXT,

  -- Extracted data
  extracted_json JSONB,              -- The raw JSON array from Gemini

  -- Output download URLs (Supabase Storage signed URLs populated on completion)
  excel_url     TEXT,
  zip_url       TEXT
);

-- Index for quick status polling
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs (created_at DESC);

-- Auto-update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 2. Storage buckets (run these or create via Supabase Dashboard)
-- Menu uploads bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-uploads', 'menu-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Generated outputs bucket (Excel + ZIP)
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-outputs', 'job-outputs', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Row Level Security — allow all operations for service role
-- (For an internal tool, we keep it simple. Tighten for production.)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);
