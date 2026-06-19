# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
