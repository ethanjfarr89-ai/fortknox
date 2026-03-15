# Trove

Jewelry registry and portfolio tracker. React + TypeScript + Tailwind CSS + Supabase.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npx tsc --noEmit --project tsconfig.app.json` — type check

## Architecture

- **Frontend:** Vite + React 19 + TypeScript, Tailwind CSS v4 (via @tailwindcss/vite plugin)
- **Backend:** Supabase (auth, PostgreSQL, storage)
- **Spot Prices:** Vercel serverless API route (`/api/prices`) fetching Yahoo Finance, cached 1hr
- **Deployment:** Vercel (auto-deploys from GitHub)

## Key Files

- `src/App.tsx` — root component, auth gating
- `src/pages/Dashboard.tsx` — main view with portfolio summary + pieces grid
- `src/components/` — AuthForm, Header, SpotPriceBar, PortfolioSummary, PieceCard, PieceForm, PieceDetail
- `src/lib/` — supabase client, useAuth/usePieces/useSpotPrices hooks, price calculations
- `src/types/index.ts` — TypeScript types
- `api/prices.js` — Vercel serverless function for spot prices
- `supabase/` — database schema + migrations

## Setup

1. Create a Supabase project at supabase.com
2. Copy `.env.example` to `.env` and fill in credentials
3. Run `supabase/schema.sql` then `supabase/migration_v4.sql` in SQL Editor
4. `npm install && npm run dev`
