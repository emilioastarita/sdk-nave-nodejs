/**
 * Error categories for a Nave API HTTP error response, derived from the HTTP
 * status code. Lets consumers branch on a coarse, stable bucket instead of
 * hard-coding individual status numbers.
 *
 * - `rate_limit`  -> 429: backed off, retry later.
 * - `server`      -> 5xx: upstream/transport-side fault, status of the
 *                    underlying operation is unknown, retry later.
 * - `client`      -> 4xx (except 429): a definitive answer (e.g. 404/422),
 *                    do not retry.
 * - `unknown`     -> anything else non-2xx (1xx/3xx that reached this path).
 */
export type NaveErrorCategory = 'client' | 'server' | 'rate_limit' | 'unknown';

const categoryForStatus = (status: number): NaveErrorCategory => {
  if (status === 429) {
    return 'rate_limit';
  }
  if (status >= 500 && status <= 599) {
    return 'server';
  }
  if (status >= 400 && status <= 499) {
    return 'client';
  }
  return 'unknown';
};

const parseJsonBody = (body: string, contentType: string | null): unknown => {
  // Only attempt to parse when the server claims JSON. A 5xx from an edge
  // proxy (Cloudflare/NGINX) is usually an HTML page; trying to JSON.parse it
  // would always fail and the raw HTML stays available via `.body` anyway.
  if (!contentType?.toLowerCase().includes('json')) {
    return null;
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
};

// Keep `.message` readable in logs without dumping a full HTML error page.
const truncate = (value: string, max = 200): string =>
  value.length > max ? `${value.slice(0, max)}…` : value;

type NaveHttpErrorInit = {
  status: number;
  statusText: string;
  method: string;
  url: string;
  body: string;
  contentType: string | null;
};

/**
 * Thrown when the Nave API returns a non-2xx HTTP response.
 *
 * This is the machine-readable counterpart to a raw response body. It is thrown
 * ONLY for HTTP error responses — transport failures (timeouts, socket resets,
 * DNS errors, premature close) are still rethrown untouched as the original
 * `TypeError: fetch failed`, so the two cases are trivially distinguishable:
 *
 * ```ts
 * try {
 *   await client.getOrder(id);
 * } catch (err) {
 *   if (err instanceof NaveHttpError) {
 *     // Definitive HTTP answer from the API.
 *     if (err.retryable) scheduleRetry();   // 429 / 5xx
 *     else markFailed(err.status);          // 4xx (404, 422, ...)
 *   } else {
 *     // Transport/network failure: the payment status is unknown.
 *     scheduleRetry();
 *   }
 * }
 * ```
 *
 * Extends the built-in `Error`, so existing `catch` / `instanceof Error`
 * handling keeps working.
 */
export class NaveHttpError extends Error {
  override readonly name = 'NaveHttpError';
  /** HTTP status code of the response (e.g. 404, 422, 429, 502). */
  readonly status: number;
  /** HTTP status text (e.g. "Not Found"). */
  readonly statusText: string;
  /** HTTP method of the originating request. */
  readonly method: string;
  /** Fully-qualified URL of the originating request. */
  readonly url: string;
  /** Raw, unparsed response body (may be JSON, plain text, or an HTML page). */
  readonly body: string;
  /**
   * Parsed response body when the API responded with `application/json`,
   * otherwise `null`. Use this to read structured API error payloads without
   * re-parsing `.body`.
   */
  readonly data: unknown;
  /** Coarse, stable bucket derived from `status`. See {@link NaveErrorCategory}. */
  readonly category: NaveErrorCategory;

  constructor({
    status,
    statusText,
    method,
    url,
    body,
    contentType,
  }: NaveHttpErrorInit) {
    super(
      `Nave API responded ${status}${statusText ? ` ${statusText}` : ''} for ${method} ${url}${
        body ? `: ${truncate(body)}` : ''
      }`,
    );
    this.status = status;
    this.statusText = statusText;
    this.method = method;
    this.url = url;
    this.body = body;
    this.data = parseJsonBody(body, contentType);
    this.category = categoryForStatus(status);
    // Restore the prototype chain so `instanceof NaveHttpError` works when the
    // SDK is compiled to CommonJS / older targets.
    Object.setPrototypeOf(this, NaveHttpError.prototype);
  }

  /**
   * Whether the failure is worth retrying later: `true` for 429 (rate limited)
   * and 5xx (server-side fault, the real outcome is unknown), `false` for 4xx
   * (a definitive answer). For pending-payment reconciliation, `false` means
   * the status is settled and `true` means "ask again later".
   */
  get retryable(): boolean {
    return this.category === 'rate_limit' || this.category === 'server';
  }
}
