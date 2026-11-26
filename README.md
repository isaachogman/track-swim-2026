# LaneLine — Swim Progress

A responsive swim training tracker built with React, Vite, and Supabase.

## Features
- Email/password sign-up and sign-in
- Private swim session log with date, pool length, distance, stroke, duration, and notes
- Personal best records for SCY, SCM, and LCM
- Goal tracking with progress indicators
- Weekly yardage visualization and dashboard stats

## Environment
Set these Vercel environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The Supabase schema and row-level security policies are provisioned in the connected project. No service-role key is used in the browser.

## Local development
```bash
npm install
npm run dev
```
