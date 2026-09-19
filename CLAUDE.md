# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # next dev
npm run build     # next build
npm start         # production server
npm run lint      # bare `eslint` (flat config, eslint.config.mjs)
npm run migrate   # tsx db/migrate.ts — applies db/schema.sql
```

No test runner is configured. There are no tests in the repo.

Requires a `.env.local` with `DATABASE_URL`, `APP_PASSWORD`, `SESSION_SECRET` (see README.md). `lib/auth.ts` throws at call time if `APP_PASSWORD` or `SESSION_SECRET` is missing, so a misconfigured env surfaces as a 500 on login, not a startup failure.

## Next.js 16 specifics

This repo is on Next.js 16.3.5 / React 19. Two things differ from older App Router code:

- **`proxy.ts` replaces `middleware.ts`.** The root-level [proxy.ts](proxy.ts) exports `proxy(request)` plus a `config.matcher`. Do not create a `middleware.ts`.
- **Route handler `params` is a Promise.** `app/api/links/[id]/route.ts` types it as `Promise<{ id: string }>` and awaits it.
- Layouts use the generated global `LayoutProps<"/">` type rather than a hand-written props interface.

Before writing framework code, consult `node_modules/next/dist/docs/` as AGENTS.md instructs.

## Architecture

Single-user personal app. There is no users table and no per-user scoping anywhere — one password gates the whole app.

**Auth is enforced in exactly one place.** [proxy.ts](proxy.ts) verifies the `indexio_session` JWT cookie on every request except `/login`, `/api/auth`, `/_next`, `/favicon.ico`, and redirects to `/login` when invalid. API route handlers therefore contain **no** auth checks. If you add a route that must be public, add it to the allowlist in `proxy.ts`; if you add a route outside the matcher, it is unprotected.

Session tokens are HS256 JWTs signed with `SESSION_SECRET` ([lib/auth.ts](lib/auth.ts)), 30-day expiry, stored in an httpOnly cookie set by `POST /api/auth`. `DELETE /api/auth` clears it.

**Data flow:** [app/page.tsx](app/page.tsx) is a client component that owns all state (links, tags, query, active tag) and fetches from the API routes. `handleChanged()` refetches both lists after any mutation — child components (`LinkForm`, `LinkList`, `TagFilter`) are presentational and call callbacks rather than fetching.

**API surface:**
- `GET /api/links?q=&tag=` — composes optional WHERE clauses over `search_vector @@ to_tsquery` and a tag subquery; tags come back as a JSON-aggregated array per row.
- `POST /api/links` — validates the URL is http/https, scrapes metadata, then inserts link + tags in one transaction.
- `PATCH /api/links/[id]` — notes and/or tags; passing `tags` **replaces** the whole set (deletes `link_tags` rows first).
- `DELETE /api/links/[id]` — cascade removes `link_tags`.
- `GET /api/tags` — tags with `link_count`.

Every query uses parameterized `$n` placeholders. Keep it that way.

## Database

[db/schema.sql](db/schema.sql) is the single source of truth and is applied wholesale by `npm run migrate`. There is no versioned migration system — every statement uses `CREATE ... IF NOT EXISTS`, so the file must stay idempotent and re-runnable. Schema changes to existing tables need explicit `ALTER TABLE ... IF NOT EXISTS`-style statements appended, not edits to the original `CREATE TABLE`.

`links.search_vector` is a **generated STORED tsvector** with weights A (title) / B (description, notes) / C (url), backed by a GIN index. Never write to it. Changing the weight expression requires dropping and recreating the column.

`links.url` has a unique index, and `POST /api/links` does `ON CONFLICT (url) DO UPDATE SET updated_at = now()` — re-adding an existing URL is an idempotent touch that keeps the old metadata but still attaches any new tags.

[lib/db.ts](lib/db.ts) caches the `pg` Pool on `globalThis` outside production so dev HMR doesn't leak connections.

## Conventions

- `@/*` path alias maps to the repo root.
- Components live in `components/<feature>/Name.tsx`, named exports, `"use client"` at the top.
- Tailwind v4 via `@import "tailwindcss"` in [app/globals.css](app/globals.css) — no `tailwind.config.js`; theme tokens are declared in the `@theme inline` block.
- [lib/metadata.ts](lib/metadata.ts) never throws: a 5s `AbortController` timeout, a non-HTML content type, or any fetch error all return the all-null `LinkMetadata`, so a link is always saveable even when scraping fails.
- [lib/search.ts](lib/search.ts) `toTsQuery` strips non-word characters, appends `:*` for prefix matching, and ANDs terms; it returns `null` for an empty query, which the caller treats as "no search filter".
