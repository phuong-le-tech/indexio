# Local readiness test handoff

Run `npm ci`, `npm test`, `npm run typecheck`, and `npm run lint`.

This is the red-step handoff, not a claim that local readiness is implemented.
The original tracked tree had no tests or runner. CSV, search, password comparison,
existing metadata fallbacks, and existing valid-login behavior already pass their
regression cases. Do not change them merely to make those cases fail. Constant-time
password comparison still requires review of the implementation primitive; equality
assertions cannot prove constant-time execution.

## Expected minimal APIs

- `lib/env.ts`: pure `validateEnv(env)` returns the three required string settings
  plus boolean `COOKIE_SECURE`. Missing/empty settings and production placeholders
  throw errors naming the key. Production secrets require 32 characters. Cookie
  default is false for local HTTP; explicit true/false overrides it.
- `lib/auth.ts`: existing `checkPassword` plus synchronous atomic
  `attemptLogin(password): "allowed" | "invalid" | "throttled"`. Five failures per
  process in 60 seconds are allowed; subsequent attempts, even correct passwords,
  are throttled until expiry. Successful logins do not consume the failure budget.
- `lib/safeFetch.ts`: `safeFetch(url, { maxBytes?, timeoutMs?, ...RequestInit })`
  returns a readable Response after bounded body consumption. Defaults: 2 MiB,
  5000 ms, five redirect transitions. Each hop uses manual redirects and DNS
  `lookup(host, { all: true })`; reject if any answer is blocked. Only explicit
  `ALLOW_PRIVATE_URLS=true` permits private URLs, never non-HTTP protocols.
  Errors identify blocked address, unsupported protocol, DNS failure, redirect
  limit, size limit, or timeout (AbortError). Tests replace only external DNS and
  global fetch, never safeFetch or project-owned modules. Return all-null metadata
  on refusal, oversized response, timeout, non-HTML, or non-2xx response.
- `lib/validation.ts`: `parseId(unknown)` returns a positive PostgreSQL int4 ID;
  `validateString(value, { name, maxLength, allowEmpty? })` and
  `validateCollection(value, { name, maxItems })` return valid input or throw
  `Error("Invalid <name>")`. Optional fields are handled by callers. Collections
  must be nonempty; notes may explicitly allow an empty string. `parseId` throws
  `Error("Invalid id")`. `validateImportSize(bytes, rows)` throws
  `Error("Import limit exceeded")` beyond 2 MiB or 1000 rows.
- Chosen route caps for downstream wiring/documentation: URL 4096 characters,
  tag 100, notes 10000, bulk 500 IDs, import 2 MiB/1000 rows. String/collection
  validators receive limits as arguments. Import size uses UTF-8 bytes, not string
  length. Element ID validation is separate from collection count validation.

All skeleton implementations throw `Error("Not implemented: <function>")`.
They contain no production logic or wiring. Replace them during implementation.

## Acceptance-criterion mapping

Prefixes below identify the parameterized cases in each test file. Manual checks
retain the planner's names but are not executable tests and have not been run here.

| AC | Automated tests or planned downstream evidence |
| --- | --- |
| AC1 | Manual `AC1_removed_files_allowed`: permitted deletions and reference-search evidence in PR body. |
| AC2 | Manual `AC2_ignore_rules`: template unignored, worktrees/local env ignored. |
| AC3 | `env.test.ts`: `AC3_missing_empty`, `AC3_rejects_production_placeholder_or_short_secret`, `AC3_accepts_32_character_production_secret`, `AC3_rejects_production_placeholder`. Startup/migrate fail-fast remains downstream. |
| AC4 | `auth.test.ts`: `AC4_password_comparison*`, `AC4_throttle*`, `AC4_successful_logins_do_not_consume_failure_budget`; `auth-route.test.ts`: `AC4_login_contract*`; `env.test.ts`: `AC4_cookie_secure_override`. Real HTTP localhost-cookie check remains downstream. |
| AC5 | `safeFetch.test.ts`: `AC5_address_policy*`, `AC5_metadata*`. Real add/check routes, including HEAD 405/501 GET fallback safety, remain downstream. |
| AC6 | `safeFetch.test.ts`: `AC6_redirect*`, `AC6_body*`, `AC6_timeout_aborts_pending_transport`, `AC6_metadata*`. Five redirects means six total requests. |
| AC7 | `validation.test.ts`: `AC7_input_boundaries*`. Route 400/413 mapping, sanitized errors, and no writes on rejected imports/bulk remain downstream with isolated Postgres. |
| AC8 | Manual `AC11_release_evidence`: production audit and justified remainders in PR body. |
| AC9 | `csv.test.ts`: `AC9_csv_preserves_fields`; `search.test.ts`: `AC9_search_tokens`. Build, CI, and Postgres migration evidence remain downstream. |
| AC10 | Manual `AC10_clean_local_flow`: execute fresh README setup, repeated migration, login, duplicate add, SSRF refusal, import/export/bulk, and verify preserved state using isolated Postgres. |
| AC11 | Manual `AC11_release_evidence`: execute README commands, secret scan, verify license undecided. |
| AC12 | Manual `AC11_release_evidence`: unchanged lint rules/protected files and no audit suppression. |

## Decisions and deviations

- Preserved and completed uncommitted scaffolding found in the explicitly authorized
  shared feature worktree. No branch or worktree was created or switched.
- Selected the simplest APIs and concrete caps because the plan explicitly delegates
  these implementation decisions. Test comments document the contract.
- Retained already-passing regression cases rather than artificially breaking
  existing behavior. No timing-based constant-time claims are made.
- Kept database/HTTP end-to-end release checks in the downstream PR-body evidence
  lane as planned; there are no owned-database mocks or live network calls here.
- Added the missing pre-expiry boundary and metadata size fallback within the
  planned throttle and fetch-size coverage. The placeholder matrix includes a
  long repeated `change-me` value so placeholder rejection is independent of the
  minimum secret-length check.
