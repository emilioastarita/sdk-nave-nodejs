import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { NaveClient } from '../src';

// Verifies the NAVE_DEBUG_CURL debug switch: on a failed (non-ok) response the
// client should emit a ready-to-run curl command reproducing the request.
describe('NAVE_DEBUG_CURL debug output', () => {
  let server: Server;
  let baseUrl: string;

  const client = new NaveClient({
    environment: 'testing',
    clientId: 'x',
    clientSecret: 'x',
    audience: 'x',
    storeId: 'x',
    platform: 'x',
  });

  beforeAll(async () => {
    // Always answer 503 so request() hits its non-ok branch.
    server = createServer((_req, res) => {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Service Unavailable');
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NAVE_DEBUG_CURL;
  });

  it('prints a runnable curl command on error when enabled', async () => {
    process.env.NAVE_DEBUG_CURL = '1';
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg) => {
      logs.push(String(msg));
    });

    await expect(
      client.request({
        method: 'POST',
        path: '/orders',
        baseUrl,
        body: { foo: 'bar' },
        headers: { Authorization: 'Bearer secret-token' },
      }),
    ).rejects.toThrow();

    const curl = logs.find((line) => line.includes('curl'));
    expect(curl).toBeDefined();
    expect(curl).toContain('curl -X POST');
    expect(curl).toContain("-H 'Content-Type: application/json'");
    expect(curl).toContain("-H 'Authorization: Bearer secret-token'");
    expect(curl).toContain('--data \'{"foo":"bar"}\'');
    expect(curl).toContain(`'${baseUrl}/orders'`);
  });

  it('does not print curl when the env var is unset', async () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg) => {
      logs.push(String(msg));
    });

    await expect(
      client.request({ method: 'GET', path: '/missing', baseUrl }),
    ).rejects.toThrow();

    expect(logs.some((line) => line.includes('curl'))).toBe(false);
  });
});
