# Indexio

A local, single-user link library. Save URLs with tags and notes, fetch page metadata, search your collection with PostgreSQL full-text search, and import or export JSON and CSV.

Built with Next.js (App Router), React, PostgreSQL (`pg`), signed session cookies (`jose`), and metadata parsing (`cheerio`). The app runs on your machine; Docker is only used for the optional local database.

## Prerequisites

- Node.js 24 LTS and npm 11 or later. `.nvmrc` selects Node 24; `package.json` records the supported versions.
- Docker with Compose v2 or later, or an existing PostgreSQL 17 database.
- Git and OpenSSL for the setup below.

## Quick start

```sh
git clone https://github.com/phuong-le-tech/indexio.git
cd indexio
openssl rand -base64 32
openssl rand -base64 32
```

Create `.env.local` in your editor using `.env.example` as the template: replace `APP_PASSWORD` with the first generated value (your login password), and `SESSION_SECRET` with the second. Keep these values private and do not commit this file. The example database URL matches the local-only credentials in Compose.

```sh
docker compose up -d --wait
npm ci
npm run migrate
npm run dev -- --hostname 127.0.0.1
```

Open [http://localhost:3000](http://localhost:3000) and log in using `APP_PASSWORD`. Stop the server with Ctrl+C. Migration applies the idempotent `db/schema.sql` and can be run again.

If port 5432 is occupied, set a different host port before starting Compose, and change the port in `.env.local`'s `DATABASE_URL` to match:

```sh
export POSTGRES_PORT=55440
```

**Without Docker:** provision an empty PostgreSQL database and a login role that owns it, then put its connection URL in `.env.local`. Skip the Compose command and follow the same install, migration, and server steps. PostgreSQL does not need to be exposed to your LAN.

## Local production-style run

Stop the development server first. With `.env.local` still configured and PostgreSQL running:

```sh
npm run build
npm start -- --hostname 127.0.0.1
```

Open the same localhost URL. This is still a local HTTP server, not a public hosting setup. Required configuration is validated during startup, build, and migration. Production builds and starts reject `change-me` placeholders and session secrets shorter than 32 characters.

## Checks and contributing

```sh
npm run lint
npm run typecheck
npm test
```

Run these checks and a production build before submitting a focused pull request. CI repeats clean dependency installation, lint, typecheck, tests, migration against a disposable PostgreSQL service, and build on Node 24. Unit tests mock outbound networking; they do not require public websites.

## Environment variables

Next.js loads `.env.local`; migration also reads it if present. Exported environment variables work without a local file, including in CI. Do not prefix secrets with `NEXT_PUBLIC_`.

| Variable | Required | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL. The example points to the local Compose service. |
| `APP_PASSWORD` | Yes | One shared login password for the whole library. Use a unique, strong value. |
| `SESSION_SECRET` | Yes | Signs session tokens. Generate with OpenSSL as above; at least 32 characters are required in production. Changing it invalidates existing sessions. |
| `COOKIE_SECURE` | No | Literal `true` or `false`. Defaults to `false`, including local production-style HTTP. Set `true` when serving through HTTPS; secure cookies cannot log you in over plain HTTP. |
| `ALLOW_PRIVATE_URLS` | No | Defaults to blocked. Only literal `true` permits metadata and link checks against localhost, private/LAN, and link-local destinations. Enable only intentionally on a trusted machine/network. |
| `POSTGRES_PORT` | No | Compose-only host port, default `5432`. Set in your shell, not just `.env.local`; update `DATABASE_URL` to match. |

## Security and limits

- One user, one shared password, no accounts or per-user isolation. Sessions last 30 days and use HttpOnly, SameSite=Lax cookies.
- Bind to localhost as shown, or use only a trusted LAN. For remote access, put the app behind an HTTPS reverse proxy and set `COOKIE_SECURE=true`. Do not expose the example database credentials or database port publicly.
- Five failed logins block further attempts for the rest of a 60-second window. This budget is process-wide, not per IP, and resets on restart. It is not a distributed abuse-control system.
- Metadata and link checks only fetch HTTP/HTTPS. By default they reject private destinations, recheck each redirect (up to five), and limit response bodies to 2 MiB. Metadata has a five-second timeout; checks use eight seconds. Blocked or failed metadata leaves the link saveable without metadata; a blocked check reports failure.
- `ALLOW_PRIVATE_URLS=true` deliberately removes private-address protection, but retains protocol, redirect, size, and timeout limits. DNS addresses are checked but not pinned to the connection, so a DNS-rebinding window remains. These safeguards are not a guarantee against hostile networks.
- Imports accept at most 2 MiB and 1,000 rows; bulk actions accept 500 IDs. URLs are limited to 4,096 characters, tags to 100, and notes to 10,000.
- Keep `.env.local` and database backups private. The Compose password is a public, local-development placeholder, not a credential for a hosted instance.

## Backup and restore

For the Compose database, create a SQL backup while PostgreSQL is running:

```sh
docker compose exec -T postgres pg_dump -U indexio -d indexio > indexio-backup.sql
```

Stop the app before restoring. Restore into a **new, empty database** to avoid conflicts with existing tables or data:

```sh
docker compose exec -T postgres createdb -U indexio indexio_restore
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U indexio -d indexio_restore < indexio-backup.sql
```

Point `DATABASE_URL` at `indexio_restore`, then restart the app. The database name must be unused before running `createdb`. With a non-Docker database, use PostgreSQL's `pg_dump` and `psql` clients with your connection settings instead. UI JSON/CSV export is useful for moving links, but is not a full database backup.

## Updating and stopping

Stop the app, make a backup as above, then update from your checkout:

```sh
git pull --ff-only
npm ci
npm run migrate
npm run build
npm start -- --hostname 127.0.0.1
```

Review release notes for any configuration changes. To stop the Compose database without deleting its named data volume:

```sh
docker compose stop
```

## Optional hosting

Local self-hosting is the primary setup. A host such as Railway needs a PostgreSQL service, all three required app variables available at build and runtime, a migration step, and explicit build/start configuration matching the npm scripts. Use HTTPS with `COOKIE_SECURE=true`, and replace all example credentials. Hosting configuration and deployment are not provided here.

## License

License: not yet chosen by the maintainer.
