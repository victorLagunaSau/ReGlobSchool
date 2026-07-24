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

Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4 (config-file based, not CSS-first), Firebase (Auth + Firestore) as the only backend, `react-simple-maps` for choropleth maps, `lucide-react` for icons.

**Read `node_modules/next/dist/docs/` before writing Next.js-specific code** (routing, data fetching, middleware, config) — this Next.js version has breaking changes versus older/training-data conventions.

## Architecture

### Route groups and auth flow

- `src/app/(landing)/` — public marketing page (`/`).
- `src/app/(auth)/login/` — `/login`, a single page that swaps between `LoginForm` / `RegisterForm` / `ResetPasswordForm` via local state (no sub-routes).
- `src/app/(panel)/dashboard/` — the authenticated admin panel, wrapped by `src/app/(panel)/layout.tsx`.

Auth state is **not** managed server-side. `src/context/AuthContext.tsx` (`AuthProvider`, mounted in the root layout) listens to Firebase `onAuthStateChanged` and mirrors login state into a plain `regoschol_session` cookie (`document.cookie`, no session token/JWT — it's just a presence flag). `src/middleware.ts` reads that cookie to gate `/dashboard/*` (redirect to `/` if absent) and to bounce logged-in users away from `/` and `/login` (redirect to `/dashboard`). Because the cookie is client-set, any real authorization check must still happen client-side against Firestore.

On top of "logged in", `(panel)/layout.tsx` does a **second** authorization check: it reads `users/{uid}` from Firestore and only renders the panel if `authorized === true`; otherwise it shows a "pending authorization" screen. Keep this two-tier check (Firebase auth ≠ authorized admin) in mind when touching panel access logic.

### Data model (Firestore)

No backend/API routes — pages talk to Firestore directly from client components (`'use client'` + `onSnapshot`/`getDocs`). Collections in use:

- `users/{uid}` — `{ fullName, authorized: boolean }`.
- `countries/{id}` — id is the ISO code (e.g. `MX`), `{ name }`.
- `states/{countryId-CODESTADO}` — e.g. id `MX-AGS`, `{ countryId, Pais, CveEstado (number, INEGI state code), CodEstado (short code), name/Estado }`.
- `zones/{stateId-NNN}` — e.g. id `MX-AGS-001`, `{ countryId, stateId, assignedTo ("Libre" or an operator name), CveEstado, CveMunicipio (number), CVEGEO (INEGI municipality code, string), Ciudad/city, schoolsPotential, licensesCenso, licensesSold }`.

Docs read these fields defensively (multiple fallback field names, `Number()`/`String()` coercion) because the schema evolved organically — follow that pattern rather than assuming strict typing when touching this data.

`assignedTo` empty string or the literal string `"libre"` (case-insensitive) both mean "unoccupied" — this check is duplicated across `MapView`, `StateMapView`, and `dashboard/maps/page.tsx`; keep them consistent if you change the rule.

### Maps

`public/data/maps/MX/MX.geojson` is the national map (states, keyed by `CVE_ENT`); `public/data/maps/MX/{01..32}.geojson` are per-state municipality maps (keyed by `CVE_MUN`/`CVEGEO`), matching INEGI numeric state codes. `src/components/ui/MapView.tsx` renders the national choropleth (colored by `porcentajePresencia`), `StateMapView.tsx` renders a state's municipalities (colored by whether `assignedTo` is set). `dashboard/maps/page.tsx` fetches `countries`/`states`/`zones` once, joins them client-side, and toggles between the two map components based on whether a state is selected. Geo paths are built as `/data/maps/{countryId}/{countryId|inegiCode}.geojson`, so adding a new country means adding a matching `public/data/maps/{ISO}/` directory with the same `{ISO}.geojson` + per-region files convention.

### Import aliases

`tsconfig.json` maps `@/*` to the **project root**, not `src/`. Existing code is inconsistent: some files use `@/src/lib/firebase`, others use relative paths (`'../../../lib/firebase'`). Prefer the `@/src/...` form for new code since it isn't dependent on nesting depth.

## Notes

- No `.gitignore` exists yet — `.next/` and `node_modules/` currently show as untracked in `git status`; be careful with `git add`.
- All user-facing strings and comments in this codebase are in Spanish; match that when editing existing files.
