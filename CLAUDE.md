# Lyne-Tilt Project Guide

## Architecture

**Production backend: Cloudflare Workers + D1 (SQLite)**
- Code lives in `workers/`
- Framework: Hono (not Express)
- Database: D1 (SQLite via Drizzle ORM) — NOT PostgreSQL
- File uploads: R2 bucket
- Deployed via `wrangler deploy`
- Dev server: `cd workers && npm run dev` (runs on port 8787)

**Frontend: Vite + React + TypeScript**
- Deployed to Cloudflare Pages
- In dev, Vite proxies `/api` requests to Workers on port 8787 (see `vite.config.ts`)
- `API_BASE` defaults to `/api` (relative) — no need to set `VITE_API_BASE` in dev
- For production builds, set `VITE_API_BASE` to the full Workers URL

## IMPORTANT: The `server/` directory is DEPRECATED

The `server/` directory contains an older Express/PostgreSQL backend that targeted a Railway database. **It is not deployed and should not be used.** The Railway PostgreSQL database is unreachable.

- Do NOT start the Express server (`server/`)
- Do NOT reference `DATABASE_URL` or PostgreSQL connection strings
- Do NOT add features to `server/src/routes/` — add them to `workers/src/routes/`
- The `server/` schema (`server/src/db/schema.ts`) is kept for reference only

All new backend work goes in `workers/`.

## Key Paths

| What | Where |
|------|-------|
| Workers API | `workers/src/` |
| Workers routes | `workers/src/routes/` |
| D1 schema (Drizzle) | `workers/src/db/schema.ts` |
| D1 migrations | `workers/migrations/` |
| Workers config | `workers/wrangler.toml` |
| Frontend | root (`vite.config.ts`, `admin/`, `config/`) |
| API config | `config/api.ts`, `admin/config/api.ts` |

## Development

```bash
# Start Workers dev server (API)
cd workers && npm run dev

# Start frontend dev server
npm run dev

# Apply D1 migrations (local)
cd workers && npx wrangler d1 migrations apply lyne-tilt-db --local

# Apply D1 migrations (remote/production)
cd workers && npx wrangler d1 migrations apply lyne-tilt-db --remote

# Deploy Workers
cd workers && npm run deploy
```

## D1/SQLite Conventions

- IDs: `text` with `crypto.randomUUID()` (not `uuid`)
- Timestamps: `text` with ISO strings (not `timestamp`)
- Booleans: `integer(..., { mode: 'boolean' })` (0/1)
- Enums: `text('col', { enum: [...] })` for TS checking (no `pgEnum`)
- Case-insensitive search: `LOWER(col) LIKE` (not `ilike`)
