# Insurvoice Intelligence Dashboard

Insurvoice Intelligence is a modern AI-powered market intelligence dashboard built to capture, parse, and analyze trend signals for the insurance industry. The application displays intelligence feeds gathered from social media and news outlets (Reddit, LinkedIn, Google News), highlighting key insights such as customer pain points, emotional triggers, viral indicators, and AI-suggested content marketing hooks.

---

## 🚀 Quick Start Guide

Follow these simple steps to run the dashboard locally in under 2 minutes:

### 1. Clone & Install Dependencies
```bash
# Navigate to the workspace and install packages
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and enter your Supabase credentials:
```bash
cp .env.example .env.local
```
Configure:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the live dashboard.

---

## 🗄️ Database Setup (Supabase SQL)

Run the following script in the **Supabase SQL Editor** to create the `raw_content` table, configure Row Level Security (RLS), and establish query indexes for optimal performance:

```sql
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

-- Allow anonymous read access
CREATE POLICY "Allow anonymous read access" 
ON raw_content 
FOR SELECT 
TO anon 
USING (true);

-- Allow anonymous insert access (required for demo seeding)
CREATE POLICY "Allow anonymous insert access" 
ON raw_content 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow anonymous delete access (required for demo clearing)
CREATE POLICY "Allow anonymous delete access" 
ON raw_content 
FOR DELETE 
TO anon 
USING (true);

-- Performance Indexes for search, filter, and pagination
CREATE INDEX IF NOT EXISTS idx_raw_content_viral_score ON raw_content (viral_score DESC);
CREATE INDEX IF NOT EXISTS idx_raw_content_source ON raw_content (source);
CREATE INDEX IF NOT EXISTS idx_raw_content_created_at ON raw_content (created_at DESC);
```

---

## 📁 Folder Structure

```
├── public/                 # Static assets (favicons, brand marks)
├── src/
│   ├── app/
│   │   ├── actions.ts      # Server Actions (Seeding, Clearing records)
│   │   ├── globals.css     # Global styles & Tailwind v4 directives
│   │   ├── layout.tsx      # App router base HTML layout wrapper
│   │   ├── loading.tsx     # Full page shimmer skeletons for route transition
│   │   └── page.tsx        # Async Server Component: parses search params & queries DB
│   ├── components/
│   │   ├── DashboardContent.tsx # Handles client states (drawer state, loaders)
│   │   ├── FilterBar.tsx        # Search input (debounced) & filter dropdowns
│   │   ├── Header.tsx           # Premium dark UI SaaS navigation bar
│   │   ├── SeedingPanel.tsx     # Admin developer tools to seed/reset demo data
│   │   ├── SignalDetailModal.tsx# Slide-over drawers for selected signal analytics
│   │   └── StatsCards.tsx       # Live counters (counts, percentages, source stats)
│   └── lib/
│       └── supabase.ts     # Supabase client instantiation
├── schema.sql              # Database setup & index creation script
├── tsconfig.json           # TypeScript configuration
├── eslint.config.mjs       # ESLint settings
├── tailwind.config.ts      # Tailwind configuration
└── package.json            # Node project configuration
```

---

## 💎 Features & Interactive Flow

1. **Server-Side Data Pipeline**: Reads `searchParams` directly in an async server component, building a custom Supabase query dynamically.
2. **Debounced Search**: Text search in `FilterBar.tsx` automatically debounces key entries, updating the page query parameters and triggering lightweight re-fetches without manual client state-sync code.
3. **Responsive Metrics Stats**: Displays live, responsive KPI counts calculated directly from the database (Reddit, LinkedIn, Google count, and average viral scoring).
4. **Vercel-Inspired Slide-Over**: Clicking any signal row in the dashboard pops a right-aligned sliding analytical details drawer showing the full parsed prompt, AI rewrite angle, and user targets.
5. **Seeding Utility**: Includes an easy-to-use Dev Seeding Panel to immediately insert 12 high-quality demo insurance-AI records (e.g. claims OCR automation, risk summary AI, cyber scans) to explore the system without manual input.

---

## ⚡ Vercel Deployment Instructions

Deploying this Next.js project to Vercel takes 3 simple steps:

### Option A: Via Vercel Web Dashboard (Recommended)
1. Commit your codebase to a GitHub, GitLab, or Bitbucket repository.
2. Log in to your [Vercel Dashboard](https://vercel.com) and click **Add New > Project**.
3. Import your project repository.
4. Expand the **Environment Variables** section and add:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**. Vercel will build, optimize, and launch your production application.

### Option B: Via Vercel CLI
If you prefer deploying directly from the terminal, install the Vercel CLI globally and run:
```bash
# Install Vercel CLI
npm install -g vercel

# Log in and deploy
vercel login
vercel

# Link project, add env variables, and deploy to production
vercel env add NEXT_PUBLIC_SUPABASE_URL your-url
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY your-anon-key
vercel --prod
```
