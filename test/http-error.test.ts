import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NaveClient, NaveHttpError } from '../src';

// Verifies that non-2xx HTTP responses surface as a typed, machine-readable
// NaveHttpError (status + category + parsed body) rather than a plain Error
// whose message is the raw body.
describe('NaveHttpError classification', () => {
  let server: Server;
  let baseUrl: string;
  // The handler is swapped per test to simulate different upstream responses.
  let handler: (status: number) => {
    code: number;
    contentType: string;
    body: string;
  };

  const client = new NaveClient({
    environment: 'testing',
    clientId: 'x',
    clientSecret: 'x',
    audience: 'x',
    storeId: 'x',
    platform: 'x',
    // No transport retries: keep the tests fast and deterministic.
    maxRetries: 0,
  });

  beforeAll(async () => {
    server = createServer((_req, res) => {
      const { code, contentType, body } = handler(0);
      res.writeHead(code, { 'Content-Type': contentType });
      res.end(body);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    // Silence the per-error console.log noise from request().
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  const request = (path = '/orders') =>
    client.request({ method: 'GET', path, baseUrl });

  it('throws a NaveHttpError (still an Error) on a non-2xx response', async () => {
    handler = () => ({
      code: 404,
      contentType: 'application/json',
      body: '{"message":"not found"}',
    });
    const err = await request().catch((e) => e);
    expect(err).toBeInstanceOf(NaveHttpError);
    expect(err).toBeInstanceOf(Error);
  });

  it('exposes status, category and parsed JSON body for a 4xx', async () => {
    handler = () => ({
      code: 422,
      contentType: 'application/json; charset=utf-8',
      body: '{"error":"invalid","code":"BAD_AMOUNT"}',
    });
    const err: NaveHttpError = await request().catch((e) => e);
    expect(err.status).toBe(422);
    expect(err.category).toBe('client');
    expect(err.retryable).toBe(false);
    expect(err.data).toEqual({ error: 'invalid', code: 'BAD_AMOUNT' });
    expect(err.body).toBe('{"error":"invalid","code":"BAD_AMOUNT"}');
    expect(err.method).toBe('GET');
    expect(err.url).toBe(`${baseUrl}/orders`);
  });

  it('marks a 5xx with an HTML body as retryable and leaves data null', async () => {
    handler = () => ({
      code: 502,
      contentType: 'text/html',
      body: '<html><body>Bad Gateway</body></html>',
    });
    const err: NaveHttpError = await request().catch((e) => e);
    expect(err.status).toBe(502);
    expect(err.category).toBe('server');
    expect(err.retryable).toBe(true);
    // HTML is not parsed; the raw page is still available via `.body`.
    expect(err.data).toBeNull();
    expect(err.body).toContain('Bad Gateway');
  });

  it('classifies 429 as a retryable rate_limit', async () => {
    handler = () => ({
      code: 429,
      contentType: 'application/json',
      body: '{"message":"slow down"}',
    });
    const err: NaveHttpError = await request().catch((e) => e);
    expect(err.status).toBe(429);
    expect(err.category).toBe('rate_limit');
    expect(err.retryable).toBe(true);
  });
});
