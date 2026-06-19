import { describe, expect, it } from 'vitest';
import { NaveClient } from '../src';

const {
  TEST_CLIENT_ID,
  TEST_CLIENT_SECRET,
  TEST_AUDIENCE,
  TEST_PLATFORM,
  TEST_STORE_ID,
} = process.env as {
  TEST_STORE_ID: string;
  TEST_PLATFORM: string;
  TEST_CLIENT_ID: string;
  TEST_CLIENT_SECRET: string;
  TEST_AUDIENCE: string;
};

describe('Nave client integration tests with Testing environment', async () => {
  const client = new NaveClient({
    environment: 'testing',
    clientId: TEST_CLIENT_ID,
    clientSecret: TEST_CLIENT_SECRET,
    audience: TEST_AUDIENCE,
    storeId: TEST_STORE_ID,
    platform: TEST_PLATFORM,
  });

  it('test variables should be defined', () => {
    const testEnvVariables = [
      TEST_CLIENT_ID,
      TEST_CLIENT_SECRET,
      TEST_AUDIENCE,
      TEST_PLATFORM,
      TEST_STORE_ID,
    ];
    for (const value of testEnvVariables) {
      expect(value).not.toBeNull();
      expect(value).toBeDefined();
      expect(value).toBeTypeOf('string');
      expect(value.length).toBeGreaterThan(1);
    }
  });

  it('should get nave token', async () => {
    const token = await client.ensureToken();
    expect(token.access_token).toBeTypeOf('string');
    expect(token.scope).toBeTypeOf('string');
    expect(token.expires_in).toBeTypeOf('number');
    expect(token.expires_in).toBeGreaterThan(3600);
    expect(token.token_type).toBe('Bearer');
    expect(token.scope).toContain('write');
    expect(token.scope).toContain('read');

    // calling again ensureToken should return the same object
    const token2 = await client.ensureToken();
    expect(token2.access_token).toBe(token.access_token);
    expect(token2.scope).toBe(token.scope);
    expect(token2.expires_in).toBe(token.expires_in);
  });

  it('FLOW: Create order, get order, and cancel it', async () => {
    const generatedOrderId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const order = await client.createOrder({
      order_id: generatedOrderId,
      mobile: false,
      callback_url: `https://example.com/order-pending/${generatedOrderId}`,
      payment_request: {
        transactions: [
          {
            products: [
              {
                id: 'PROD01',
                name: 'Camiseta',
                description: 'Camiseta Roja',
                quantity: 1,
                unit_price: {
                  currency: 'ARS',
                  value: '100',
                },
              },
            ],
            amount: {
              currency: 'ARS',
              value: '100',
            },
          },
        ],
        buyer: {
          user_id: 'USER01',
        },
      },
    });

    expect(order.success).toBe(true);
    expect(order.message).toBe('CREATE_PAYMENT_REQUEST_SUCCESS_DESKTOP');
    expect(order.data.payment_request_id).toBeDefined();
    expect(order.data.checkout_url).toBeDefined();
    expect(order.data.transaction_id).toBeDefined();
    expect(order.data.amount.value).toBe('100');
    expect(order.data.amount.currency).toBe('ARS');

    const orderStatus = await client.getOrder(order.data.payment_request_id);
    expect(orderStatus.status).toBe('PENDING');
    expect(orderStatus.id).toBe(order.data.payment_request_id);
    expect(orderStatus.external_payment_id).toBeDefined();
    expect(orderStatus.additional_info.order_id).toBe(generatedOrderId);
    expect(orderStatus.expiration_date).toBeDefined();
    expect(orderStatus.payment_id).toBeNull();
  });
});
