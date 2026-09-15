# Indexio

Personal link index — save resources with tags, auto-fetched metadata (title/description/favicon/image), and full-text search. Single-user (password gate), hosted on Railway.

## Environment variables

Create a `.env.local` for local dev with:

```
DATABASE_URL=postgres://user:password@localhost:5432/indexio
APP_PASSWORD=change-me
SESSION_SECRET=change-me-too   # generate with: openssl rand -base64 32
```

On Railway: add the Postgres plugin (sets `DATABASE_URL` automatically), then set `APP_PASSWORD` and `SESSION_SECRET` on the app service.

## Local development

```bash
npm install
npm run migrate   # applies db/schema.sql
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), log in with `APP_PASSWORD`.

## Deploy to Railway

1. Push this repo to GitHub, create a new Railway project from it.
2. Add the **Postgres** plugin to the project.
3. Set `APP_PASSWORD` and `SESSION_SECRET` env vars on the app service.
4. Railway runs `npm run build` then `npm start` by default. Run `npm run migrate` once (Railway shell, or as a one-off deploy command) to create the schema.

## Stack

Next.js (App Router) + Postgres (`pg`), session auth via signed cookie (`jose`), server-side metadata scraping (`cheerio`), Postgres full-text search.
