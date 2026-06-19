import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NaveClient } from '../src';

// Reproduces the gunzip / "Premature close" path that node-fetch@2 broke on
// Node 24.16+. We stand up a tiny local server that returns a gzip-encoded
// JSON body and assert the global fetch (undici) decodes and parses it
// cleanly end-to-end.
describe('gzipped HTTP response handling', () => {
  let server: Server;
  let baseUrl: string;

  const payload = {
    success: true,
    message: 'GZIP_OK',
    // Larger body so the response is actually chunked/streamed when gzipped.
    items: Array.from({ length: 500 }, (_, i) => ({
      id: i,
      name: `item-${i}`,
    })),
  };

  beforeAll(async () => {
    server = createServer((_req, res) => {
      const gzipped = gzipSync(Buffer.from(JSON.stringify(payload)));
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'Content-Length': String(gzipped.length),
      });
      res.end(gzipped);
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

  it('decodes and parses a gzipped JSON body without premature close', async () => {
    const client = new NaveClient({
      environment: 'testing',
      clientId: 'x',
      clientSecret: 'x',
      audience: 'x',
      storeId: 'x',
      platform: 'x',
    });

    const result = await client.request<typeof payload>({
      method: 'GET',
      path: '/gzip',
      baseUrl,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('GZIP_OK');
    expect(result.items).toHaveLength(500);
    expect(result.items[499]).toEqual({ id: 499, name: 'item-499' });
  });
});
