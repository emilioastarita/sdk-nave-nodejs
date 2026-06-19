import {
  BodyNaveCreateOrder,
  ResponseNaveCancelOrder,
  ResponseNaveCreateOrder,
  ResponseNaveGetOrder,
  ResponseNaveToken,
} from './client-types';

const TRANSIENT_CAUSE_CODES = new Set([
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_REQ_CONTENT_LENGTH_MISMATCH',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EPIPE',
]);

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Detects transient transport failures from the global fetch (undici) that are
 * safe to retry for idempotent requests. This inspects the raw error shape and
 * never wraps it, so callers can still classify the original error themselves.
 */
const isTransientTransportError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  // AbortSignal.timeout() firing surfaces as a TimeoutError; a manual abort as
  // an AbortError. Both mean the request never completed -> safe to retry.
  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    return true;
  }
  if (error instanceof TypeError && error.message === 'fetch failed') {
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error) {
      const code = (cause as { code?: unknown }).code;
      if (typeof code === 'string' && TRANSIENT_CAUSE_CODES.has(code)) {
        return true;
      }
      if (
        cause.message.includes('terminated') ||
        cause.message.includes('other side closed')
      ) {
        return true;
      }
    }
  }
  return false;
};

// POSIX single-quote escaping so the value survives a copy-paste into a shell.
const shellQuote = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;

/**
 * Render a request as a runnable `curl` command for debugging failed calls.
 * Gated by the NAVE_DEBUG_CURL env var (see `request`). NOTE: this includes
 * the Authorization header verbatim so the command can be replayed as-is.
 */
const toCurlCommand = (
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
): string => {
  const parts = ['curl', '-X', method];
  for (const [key, value] of Object.entries(headers)) {
    parts.push('-H', shellQuote(`${key}: ${value}`));
  }
  if (body) {
    parts.push('--data', shellQuote(body));
  }
  parts.push(shellQuote(url));
  return parts.join(' ');
};

type JSONValue =
  | string
  | null
  | number
  | boolean
  | { [key: string]: JSONValue }
  | Array<JSONValue>;

export type Environment = 'production' | 'testing';

const ENVIRONMENT_URLS = Object.freeze({
  production: {
    security: 'https://services.apinaranja.com',
    ecommerce: 'https://api.ranty.io',
  },
  testing: {
    security: 'https://homoservices.apinaranja.com',
    ecommerce: 'https://e3-api.ranty.io',
  },
});

type NaveRequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
  path: string;
  body?: JSONValue | unknown;
  headers?: Record<string, string>;
  newHeaders?: Record<string, string>;
  baseUrl: string;
};

export class NaveClient {
  private readonly headers: Record<string, string> = {};
  private baseUrls: typeof ENVIRONMENT_URLS.testing;
  private clientId: string;
  private clientSecret: string;
  private audience: string;
  private storeId: string;
  private platform: string;
  private timeoutMs: number;
  private maxRetries: number;
  private credentials: {
    token: ResponseNaveToken | null;
    expires: number;
  } = {
    token: null,
    expires: 0,
  };

  constructor({
    audience,
    clientSecret,
    clientId,
    environment = 'testing',
    storeId,
    platform,
    timeoutMs = 15000,
    maxRetries = 2,
  }: {
    clientId: string;
    clientSecret: string;
    audience: string;
    environment?: Environment;
    storeId: string;
    platform: string;
    timeoutMs?: number;
    maxRetries?: number;
  }) {
    this.baseUrls =
      environment === 'production'
        ? ENVIRONMENT_URLS.production
        : ENVIRONMENT_URLS.testing;
    this.audience = audience;
    this.clientSecret = clientSecret;
    this.clientId = clientId;
    this.storeId = storeId;
    this.platform = platform;
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  public async fetchNewToken(cache = true) {
    return this.request<ResponseNaveToken>({
      method: 'POST',
      baseUrl: this.baseUrls.security,
      path: '/security-ms/api/security/auth0/b2b/m2msPrivate',
      body: {
        audience: this.audience,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        cache,
      },
    });
  }

  public async ensureToken() {
    if (!this.credentials.token || this.credentials.expires < Date.now()) {
      this.credentials.token = await this.fetchNewToken();
      this.credentials.expires =
        Date.now() + this.credentials.token.expires_in * 1000;
    }
    return this.credentials.token;
  }

  public async createOrder(
    order: Omit<BodyNaveCreateOrder, 'store_id' | 'platform'>,
  ) {
    return this.ecommerceRequest<ResponseNaveCreateOrder>({
      method: 'POST',
      path: '/ecommerce/payment_request/external',
      body: { ...order, store_id: this.storeId, platform: this.platform },
    });
  }

  public async getOrder(paymentRequestId: string) {
    return this.ecommerceRequest<ResponseNaveGetOrder>({
      method: 'GET',
      path: `/api/payment_requests/${paymentRequestId}`,
    });
  }

  public async cancelOrder(paymentId: string) {
    return this.ecommerceRequest<ResponseNaveCancelOrder>({
      method: 'GET',
      path: `/api/payments/${paymentId}`,
    });
  }

  private ecommerceRequest = async <T>(
    reqOptions: Omit<NaveRequestOptions, 'baseUrl'>,
  ) => {
    await this.ensureToken();
    if (!this.credentials.token) {
      throw new Error('Token not found');
    }
    return this.request<T>({
      ...reqOptions,
      baseUrl: this.baseUrls.ecommerce,
      headers: {
        Authorization: `Bearer ${this.credentials.token.access_token}`,
      },
    });
  };

  public request = async <T>({
    method = 'GET',
    path,
    body,
    headers,
    newHeaders,
    baseUrl,
  }: NaveRequestOptions) => {
    const url = `${baseUrl}${path}`;
    const _headers: Record<string, string> = newHeaders
      ? newHeaders
      : { ...this.headers, ...headers };
    const serializedBody =
      method !== 'GET' && body ? JSON.stringify(body) : undefined;

    // Only idempotent GETs are retried. Retrying a POST (e.g. createOrder)
    // could create duplicate orders, so non-GET runs a single attempt.
    const maxAttempts = method === 'GET' ? this.maxRetries + 1 : 1;

    for (let attempt = 0; ; attempt++) {
      try {
        // A fresh timeout signal per attempt; AbortSignal.timeout fires once.
        const res = await fetch(url, {
          method,
          headers: _headers,
          body: serializedBody,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (!res.ok) {
          console.log(
            `Error (${
              res.status
            }) fetching ${url} \nwith ${method} \n and Body: ${JSON.stringify(body)} \n and Headers: ${JSON.stringify(_headers)}`,
          );
          // Set NAVE_DEBUG_CURL=1 to also print a ready-to-run curl command
          // (includes auth) so the failing request can be replayed manually.
          if (process.env.NAVE_DEBUG_CURL) {
            console.log(
              `Reproduce with:\n${toCurlCommand(method, url, _headers, serializedBody)}`,
            );
          }
          throw new Error(await res.text());
        }

        return (await res.json()) as T;
      } catch (error) {
        const canRetry =
          attempt < maxAttempts - 1 && isTransientTransportError(error);
        if (!canRetry) {
          // Rethrow the ORIGINAL error untouched: the consuming backend
          // classifies transport failures via `instanceof TypeError` and
          // `error.cause.code`. Wrapping it would break that classification.
          throw error;
        }
        await sleep(200 * 2 ** attempt);
      }
    }
  };
}
