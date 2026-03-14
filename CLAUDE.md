# FortKnox

Jewelry registry and portfolio tracker. React + TypeScript + Tailwind CSS + Supabase.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npx tsc --noEmit --project tsconfig.app.json` — type check

## Architecture

- **Frontend:** Vite + React 19 + TypeScript, Tailwind CSS v4 (via @tailwindcss/vite plugin)
- **Backend:** Supabase (auth, PostgreSQL, storage)
- **Spot Prices:** Yahoo Finance v8 chart API (GC=F, SI=F, PL=F, PA=F), cached 5min in localStorage

## Key Files

- `src/App.tsx` — root component, auth gating
- `src/pages/Dashboard.tsx` — main view with portfolio summary + pieces grid
- `src/components/` — AuthForm, Header, SpotPriceBar, PortfolioSummary, PieceCard, PieceForm, PieceDetail
- `src/lib/` — supabase client, useAuth/usePieces/useSpotPrices hooks, price calculations
- `src/types/index.ts` — TypeScript types
- `supabase/schema.sql` — database schema + RLS policies + storage setup

## Setup

1. Create a Supabase project at supabase.com
2. Copy `.env.example` to `.env` and fill in credentials
3. Run `supabase/schema.sql` in the SQL Editor
4. `npm install && npm run dev`
