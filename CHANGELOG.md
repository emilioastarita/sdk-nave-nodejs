# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-30

Adds a typed, machine-readable error for HTTP error responses so consumers can
classify a failure (transport vs HTTP, and the HTTP status / category) without
string-matching the response body.

### Added

- `NaveHttpError` (exported from the package root): thrown on any non-2xx
  response from the Nave API. Extends the built-in `Error` and exposes:
  - `status` / `statusText` — the HTTP status code and text.
  - `method` / `url` — the originating request.
  - `body` — the raw, unparsed response body (JSON, plain text, or an HTML
    error page).
  - `data` — the parsed body when the API responds with `application/json`,
    otherwise `null`.
  - `category` — a coarse, stable bucket: `'rate_limit'` (429), `'server'`
    (5xx), `'client'` (4xx), or `'unknown'`.
  - `retryable` — `true` for 429/5xx (outcome unknown, ask again later),
    `false` for 4xx (a definitive answer).
- `NaveErrorCategory` type, also exported from the package root.

### Changed

- **BREAKING (error shape):** A non-2xx response now throws a `NaveHttpError`
  instead of a plain `Error` whose `.message` was the raw response body. The
  raw body is still available verbatim via `error.body`. Code that read the
  status out of `.message` should read `error.status` / `error.category`; code
  that only does `catch` / `instanceof Error` is unaffected.
- Transport failures continue to be rethrown **unchanged** (still a
  `TypeError: fetch failed` with the original `cause`), so the transport-vs-HTTP
  distinction is simply `error instanceof NaveHttpError`. SDK auto-retry remains
  transport-only; HTTP-level retry is left to the caller via `retryable`.

[0.2.0]: https://github.com/emilioastarita/sdk-nave-nodejs/compare/v0.1.0...v0.2.0

## [0.1.0] - 2026-06-19

This is a **breaking** release: the SDK no longer bundles `node-fetch` and now
relies on the runtime's built-in global `fetch`.

### Changed

- **BREAKING:** Replaced `node-fetch@2` with Node's built-in global `fetch`
  (undici). `node-fetch@2` is EOL and throws `FetchError: Premature close`
  (`ERR_STREAM_PREMATURE_CLOSE`) on gzipped responses under Node 24.16+. The
  global `fetch` works in both CommonJS and ESM consumers, so the package
  stays CommonJS.
- **BREAKING:** Now requires **Node.js >= 18** (declared via `engines`), the
  first release line with a stable global `fetch`.
- Transport failures are rethrown **unchanged** (still a
  `TypeError: fetch failed` with the original `cause`), so callers can keep
  classifying them by `error.cause.code`.

### Added

- Per-request timeout via `AbortSignal.timeout`, configurable with the
  `timeoutMs` constructor option (default `15000`).
- Automatic retry for **GET requests only** on transient transport errors,
  configurable with the `maxRetries` constructor option (default `2`,
  exponential backoff). Non-GET requests (e.g. `createOrder`) are never
  retried, so a write cannot be duplicated.
- Token cache hardening in `ensureToken()`:
  - `tokenRefreshBufferMs` constructor option (default `60000`) refreshes the
    access token shortly before expiry to absorb clock skew / latency.
  - Concurrent refreshes are coalesced into a single auth request (no
    thundering herd); a failed refresh is not cached.
- `NAVE_DEBUG_CURL` environment variable: when set, a failed (non-ok) request
  also logs a ready-to-run `curl` command (including auth) so it can be
  replayed by hand. Off by default.

### Security

- Resolved `pnpm audit` advisory **GHSA-g7r4-m6w7-qqqr** (esbuild < 0.28.1, a
  dev-only transitive dependency) via a pinned override.

### Development

- Switched the package manager from yarn to **pnpm** (`pnpm-lock.yaml`,
  `packageManager` pin).
- Supply-chain hardening in `pnpm-workspace.yaml`: `minimumReleaseAge`,
  `verifyDepsBeforeRun`, and an explicit build-script allowlist.
- Upgraded the dev toolchain: TypeScript 6, Biome 2, Vitest 4, @types/node 25.

[0.1.0]: https://github.com/emilioastarita/sdk-nave-nodejs/compare/v0.0.5...v0.1.0
