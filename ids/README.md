# IDS — Isaac's Doom Scroll

A mobile-first short-video social app built with React, Vite, and Supabase.

## Features
- Full-screen vertical feed with scroll snapping and autoplay/pause on visibility
- For You and Following feeds
- Profiles, likes, comments, follows, and saved videos
- Upload videos to the IDS Supabase Storage bucket (50 MB limit in this first version)
- Embed public TikTok, Instagram Reel, and YouTube posts through their permitted embed players
- Report button for user-submitted content
- Pink, red, and near-black visual theme

## Local development
1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and publishable key.
3. Run `npm install`, then `npm run dev`.

## Important
IDS embeds external posts rather than copying videos out of TikTok or Instagram. Only upload videos you own or have permission to use. The current build is an early MVP; add moderation review, community rules, privacy controls, and stronger abuse prevention before inviting a large public audience.
