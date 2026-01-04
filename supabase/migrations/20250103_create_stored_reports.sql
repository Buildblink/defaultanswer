-- Create stored_reports table for clean URL report access
-- Enables /reports/{domain} URLs instead of query-string based URLs

CREATE TABLE IF NOT EXISTS stored_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  report_id TEXT NOT NULL,
  user_id TEXT,
  url TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain, user_id)
);

-- Disable RLS to allow service role access
ALTER TABLE stored_reports DISABLE ROW LEVEL SECURITY;

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stored_reports_domain ON stored_reports(domain);
CREATE INDEX IF NOT EXISTS idx_stored_reports_user_id ON stored_reports(user_id);
