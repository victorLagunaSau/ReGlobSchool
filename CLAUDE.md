# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

There is no test runner configured in this repo.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4 (config-file based, not CSS-first), Supabase (Auth + Postgres, via `@supabase/ssr` + `@supabase/supabase-js`) as the only backend, `react-simple-maps` for choropleth maps, `lucide-react` for icons.

**Read `node_modules/next/dist/docs/` before writing Next.js-specific code** (routing, data fetching, middleware, config) — this Next.js version has breaking changes versus older/training-data conventions.

## Architecture

### Route groups and auth flow

- `src/app/(auth)/login/` — `/login`, a single page that swaps between `LoginForm` / `RegisterForm` / `ResetPasswordForm` via local state (no sub-routes).
- `src/app/(panel)/dashboard/` — the authenticated admin panel, wrapped by `src/app/(panel)/layout.tsx`.

The public landing page (`/`) is `src/app/page.tsx` (no route group — there is no `(landing)/` directory).

Auth state is managed by Supabase: `src/lib/supabase/client.ts` creates a browser client (`createBrowserClient`) that persists the session in cookies (not localStorage) so the server can read it too. `src/context/AuthContext.tsx` (`AuthProvider`, mounted in the root layout) calls `supabase.auth.getSession()` / `onAuthStateChange` to expose `user`/`loading`. `src/middleware.ts` calls `updateSession()` (`src/lib/supabase/middleware.ts`) on every request to refresh the Supabase session cookie and read the user, gating `/dashboard/*` (redirect to `/` if absent) and bouncing logged-in users away from `/` and `/login` (redirect to `/dashboard`).

On top of "logged in", `(panel)/layout.tsx` does a **second** authorization check: it reads `profiles/{id}` (`id` = Supabase auth user id) from Postgres via `supabase.from('profiles').select(...)` and only renders the panel if `authorized === true`; otherwise it shows a "pending authorization" screen. Keep this two-tier check (Supabase auth ≠ authorized admin) in mind when touching panel access logic.

### Data model (Supabase / Postgres)

No backend/API routes — pages talk to Postgres directly from client components via the Supabase client (`'use client'` + `supabase.from(...)`, no realtime subscriptions in use). Row Level Security applies since the browser client uses the anon key. Tables in use (snake_case columns; client code often maps them to camelCase locally):

- `profiles` — `{ id (= auth user id), full_name, email, role, authorized: boolean, project, business_partner, personal_phone, office_phone, country_id, state_id }`.
- `countries` — `{ id (ISO code, e.g. MX), name }`.
- `states` — `{ id, country_id, cve_estado (number, INEGI state code), cod_estado (short code), name }`.
- `zones` — `{ id, country_id, state_id, cve_municipio (number), cvegeo (INEGI municipality code, string), city, assigned_to ("Libre"/empty or an operator name), schools_potential, licenses_censo, licenses_sold }`.
- `unes`, `une_zones`, `une_types`, `commercial_partners`, `distributions`, `distribution_contacts` — support the `dashboard/unes` module (commercial partners/distributors and their zone assignments); see `src/app/(panel)/dashboard/unes/` for current field usage before relying on this list.

`assigned_to` empty string or the literal string `"libre"` (case-insensitive) both mean "unoccupied" — this check is duplicated across `MapView`, `StateMapView`, and `dashboard/maps/page.tsx`; keep them consistent if you change the rule.

### Maps

`public/data/maps/MX/MX.geojson` is the national map (states, keyed by `CVE_ENT`); `public/data/maps/MX/{01..32}.geojson` are per-state municipality maps (keyed by `CVE_MUN`/`CVEGEO`), matching INEGI numeric state codes. `src/components/ui/MapView.tsx` renders the national choropleth (colored by `porcentajePresencia`), `StateMapView.tsx` renders a state's municipalities (colored by whether `assignedTo` is set). `dashboard/maps/page.tsx` fetches `countries`/`states`/`zones` once, joins them client-side, and toggles between the two map components based on whether a state is selected. Geo paths are built as `/data/maps/{countryId}/{countryId|inegiCode}.geojson`, so adding a new country means adding a matching `public/data/maps/{ISO}/` directory with the same `{ISO}.geojson` + per-region files convention.

### Import aliases

`tsconfig.json` maps `@/*` to the **project root**, not `src/`. Existing code is inconsistent: some files use `@/src/lib/supabase/client`, others use relative paths (`'../../../lib/supabase/client'`). Prefer the `@/src/...` form for new code since it isn't dependent on nesting depth.

## Notes

- No `.gitignore` exists yet — `.next/` and `node_modules/` currently show as untracked in `git status`; be careful with `git add`.
- All user-facing strings and comments in this codebase are in Spanish; match that when editing existing files.
