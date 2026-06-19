import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResponseNaveToken } from '../src';
import { NaveClient } from '../src';

const makeClient = (overrides: { tokenRefreshBufferMs?: number } = {}) =>
  new NaveClient({
    environment: 'testing',
    clientId: 'x',
    clientSecret: 'x',
    audience: 'x',
    storeId: 'x',
    platform: 'x',
    ...overrides,
  });

const token = (access_token: string): ResponseNaveToken => ({
  access_token,
  scope: 'read write',
  expires_in: 3600,
  token_type: 'Bearer',
});

describe('token caching', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('caches the token and reuses it across calls', async () => {
    const client = makeClient();
    const spy = vi
      .spyOn(client, 'fetchNewToken')
      .mockResolvedValue(token('tok-1'));

    const a = await client.ensureToken();
    const b = await client.ensureToken();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(a.access_token).toBe('tok-1');
    expect(b).toBe(a);
  });

  it('coalesces concurrent refreshes into a single fetch (no thundering herd)', async () => {
    const client = makeClient();
    let calls = 0;
    vi.spyOn(client, 'fetchNewToken').mockImplementation(async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return token('tok-concurrent');
    });

    const results = await Promise.all([
      client.ensureToken(),
      client.ensureToken(),
      client.ensureToken(),
    ]);

    expect(calls).toBe(1);
    for (const r of results) {
      expect(r.access_token).toBe('tok-concurrent');
    }
  });

  it('refetches before expiry per the refresh buffer', async () => {
    // Buffer far larger than the 3600s lifetime => token is always "due",
    // so each call refetches. Proves the buffer is applied to the check.
    const client = makeClient({ tokenRefreshBufferMs: 999_999_999 });
    const spy = vi
      .spyOn(client, 'fetchNewToken')
      .mockResolvedValue(token('tok-buffered'));

    await client.ensureToken();
    await client.ensureToken();

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed token fetch; a later call retries', async () => {
    const client = makeClient();
    const spy = vi
      .spyOn(client, 'fetchNewToken')
      .mockRejectedValueOnce(new Error('auth down'))
      .mockResolvedValueOnce(token('tok-recovered'));

    await expect(client.ensureToken()).rejects.toThrow('auth down');
    const recovered = await client.ensureToken();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(recovered.access_token).toBe('tok-recovered');
  });
});
