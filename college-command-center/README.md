# Northstar — College Command Center

A standalone Vite + React app for college research, personal to-do lists, and an ordered study queue (no clock-time scheduling).

## Features
- Supabase email/password authentication
- Private per-user college tracker, tasks, and study items (RLS)
- College status, tuition, scholarship, program, website, and deadline fields
- Task categories, priority, due dates, completion, and progress
- Study queue with completion checkboxes and move-up/move-down ordering

## Environment
Set these Vercel environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The database tables are `cc_colleges`, `cc_tasks`, and `cc_study_items`. All three have row-level security policies scoped to `auth.uid()`.

## Deploy
Connect this repository to a Vercel project with Root Directory set to `college-command-center` and framework preset Vite.