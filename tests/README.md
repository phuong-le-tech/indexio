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
