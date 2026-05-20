-- Create the raw_content table
CREATE TABLE IF NOT EXISTS raw_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,          -- e.g., 'Reddit', 'LinkedIn', 'Google'
    platform TEXT NOT NULL,        -- e.g., 'reddit', 'linkedin', 'google'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    topic TEXT NOT NULL,
    pain_point TEXT NOT NULL,
    emotional_trigger TEXT NOT NULL,
    viral_score INTEGER NOT NULL CHECK (viral_score >= 0 AND viral_score <= 100),
    rewrite_angle TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE raw_content ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (since no auth is needed for MVP)
CREATE POLICY "Allow anonymous read access" 
ON raw_content 
FOR SELECT 
TO anon 
USING (true);

-- Allow anonymous insert access (for demo seeding, if needed)
CREATE POLICY "Allow anonymous insert access" 
ON raw_content 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Create performance indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_raw_content_viral_score ON raw_content (viral_score DESC);
CREATE INDEX IF NOT EXISTS idx_raw_content_source ON raw_content (source);
CREATE INDEX IF NOT EXISTS idx_raw_content_created_at ON raw_content (created_at DESC);
