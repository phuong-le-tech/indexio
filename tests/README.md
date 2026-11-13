# Tests

Unit tests run with Vitest. From the repo root:

```bash
npm test          # run the suite once
npm run typecheck
npm run lint
```

Coverage areas: environment validation, login throttling and password
comparison, SSRF-safe fetching and metadata fallbacks, input validation and
import limits, CSV import/export, search query building, and pagination.
Tests mock only external DNS and the global `fetch`, never project modules.

## Media feature tests

`tests/media.test.ts` uses synthetic TikTok HTML and WebVTT fixtures in
`tests/fixtures/media.ts`. No live platform requests are made. The extraction
contract is `fetchMediaMetadata(url)` in `lib/media.ts`: existing camel-case
`LinkMetadata` fields plus `source`, `author`, `caption`, `transcript`, and
`mentioned_urls`.

`tests/media-db.test.ts` requires Docker and the `postgres:17-alpine` image.
It creates a disposable PostgreSQL container on a random localhost port, waits
for readiness, and removes only that container on teardown. It never uses the
developer's `DATABASE_URL`. AC5 starts from the fixed pre-media SQL fixture and
runs `npm run migrate` twice. Route tests pre-create media column shapes, but
retain the legacy search vector, to expose behavior failures rather than SQL
setup errors before the production migration exists.

`tests/media-ui.test.ts` renders the real LinkList with React server rendering
and inspects the result with Cheerio. No DOM or component mocks are used.

`tests/media-gates.test.ts` runs lint, typecheck, tests, and build sequentially
with dummy credentials. Its nested test command excludes the gate file to
avoid recursion. For a quick feature-only run without those subprocess gates:

```bash
npm test -- tests/media.test.ts tests/media-db.test.ts tests/media-ui.test.ts
```
