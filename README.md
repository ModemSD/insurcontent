# Insurvoice Intelligence Dashboard

A modern, future-oriented SaaS workspace for insurance content intelligence. Built with Next.js, Tailwind CSS, Supabase, and TypeScript.

## Vercel Deployment Instructions

1. **Environment Variables**: Make sure the following keys are set in the Vercel Project Dashboard under Settings > Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Rebuilding**: After updating or adding environment variables on Vercel, you must trigger a new deployment (or push a new commit) for the changes to take effect in production.
