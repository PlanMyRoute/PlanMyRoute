# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Monorepo (from root)
```bash
pnpm dev          # Start both frontend and backend in parallel (via Turborepo)
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm check-types  # TypeScript type check across all packages
pnpm format       # Prettier format all .ts/.tsx/.md files
```

### Backend only (from apps/backend)
```bash
pnpm dev          # Start with nodemon (hot reload via tsx)
pnpm build        # tsc compile to dist/
pnpm start        # Run compiled dist/index.js
pnpm test         # Jest with --detectOpenHandles
```

### Frontend only (from apps/frontend)
```bash
pnpm dev          # expo start (prompts platform choice)
pnpm android      # expo run:android
pnpm ios          # expo run:ios
pnpm web          # expo start --web
pnpm test         # Jest (with coverage)
pnpm test:watch   # Jest in watch mode
pnpm build:web    # expo export -p web
```

### Run a single test
```bash
# Backend
cd apps/backend && pnpm test -- --testPathPattern=<filename>

# Frontend
cd apps/frontend && pnpm test -- --testPathPattern=<filename>
```

## Architecture

### Monorepo layout
Turborepo + pnpm workspaces. `turbo.json` declares task dependencies — `dev` depends on `^build` so `@planmyroute/types` is built first. The shared package `packages/types` exports Supabase-generated DB types consumed by both apps.

### Backend (`apps/backend/src`)

**Pattern:** Every domain follows `<domain>.routes.ts` → `<domain>.controller.ts` → `<domain>.service.ts`. Controllers handle HTTP; services handle DB queries and business logic.

**Middleware chain per request:**
1. `verifyToken` (auth.ts) — validates Supabase JWT, attaches `req.userId`
2. `requirePermission(action)` / `requireOwner()` / `requireEditor()` (permissions.ts) — RBAC lookup against `travelers` table
3. Route handler

**RBAC matrix** (permissions.ts) maps `TripAction` strings to allowed `CollaboratorRole[]`. Trip status (`planning | going | completed`) restricts actions on completed trips to `view_trip` and `delete_trip` (owner only). The same action names must stay in sync with the frontend's `useTripAccess` hook.

**Supabase client** (`src/supabase.ts`) uses the **service role key** — it bypasses all RLS policies. Never use the anon key in backend code.

**Cron job** (`jobs/tripStatusChecker.ts`, runs every 30 min): auto-transitions trip status `planning → going → completed` based on dates. Only runs for trips where the owner has `autoTripStatusUpdate = true`.

**Stripe webhook** requires raw body — `express.raw()` is mounted for `/api/stripe/webhook` *before* `express.json()`. Do not reorder these middleware registrations.

**Backend uses ES modules** (`"type": "module"`). All local imports must include `.js` extension even for `.ts` source files (Node ESM resolution).

### Frontend (`apps/frontend`)

**Routing:** Expo Router (file-based). Groups: `(auth)` for unauthenticated screens, `(app)/(tabs)` for the main tab bar, `(app)/trip/(tabs)` for trip detail tabs.

**Data fetching:** React Query v5 for all server state. Hooks in `hooks/` call service functions in `services/` which call `apiFetch()` from `lib/apiClient.ts`. Never call fetch directly from a component or hook — always go through a service.

**`apiFetch`** (lib/apiClient.ts): wraps fetch with `Authorization: Bearer <token>` and auto-retries once on 401 by calling `supabase.auth.refreshSession()`. `EXPO_PUBLIC_API_URL` env var sets the base URL.

**Auth state** lives in `AuthContext` (context/AuthContext.tsx). It exposes the `token` (Supabase access token) that every service call must pass. Subscription status is in `SubscriptionContext`. Trip role/permissions for the current screen are provided by `useTripAccess()` and `useTripPermissions()` hooks.

**Styling:** NativeWind 4 (TailwindCSS class names on RN components). Colors defined in `constants/Colors.ts`.

**User hooks** are organized under `hooks/users/` (useUsers, useFollow, useSearchUsers, useUserUsage, useUserPreferences).

### Database

No ORM — direct Supabase JS client queries (`.from('table').select(...)`). Key tables:
- `trip` — trip records with `status: planning | going | completed`
- `travelers` — join table with `user_role: owner | editor | viewer`
- `stop` — itinerary stops with `type: accommodation | activity | refuel`
- `notifications` — invitations with `action_status: pending | accepted | rejected`
- `subscription` — premium tiers with `tier: free | premium`

### Shared types (`packages/types`)

Auto-generated from Supabase schema. Import as `@planmyroute/types`. Both backend and frontend depend on this package — run `pnpm build` in `packages/types` if schema changes before running apps.
