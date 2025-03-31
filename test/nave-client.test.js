"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const NaveClient_1 = require("../src/lib/NaveClient");
const { TEST_CLIENT_ID, TEST_CLIENT_SECRET, TEST_AUDIENCE, TEST_PLATFORM, TEST_STORE_ID, } = process.env;
(0, vitest_1.describe)('Nave client integration tests with Testing environment', async () => {
    const client = new NaveClient_1.NaveClient({
        environment: 'testing',
        clientId: TEST_CLIENT_ID,
        clientSecret: TEST_CLIENT_SECRET,
        audience: TEST_AUDIENCE,
        storeId: TEST_STORE_ID,
        platform: TEST_PLATFORM,
    });
    (0, vitest_1.it)('test variables should be defined', () => {
        const testEnvVariables = [
            TEST_CLIENT_ID,
            TEST_CLIENT_SECRET,
            TEST_AUDIENCE,
            TEST_PLATFORM,
            TEST_STORE_ID,
        ];
        for (const value of testEnvVariables) {
            (0, vitest_1.expect)(value).not.toBeNull();
            (0, vitest_1.expect)(value).toBeDefined();
            (0, vitest_1.expect)(value).toBeTypeOf('string');
            (0, vitest_1.expect)(value.length).toBeGreaterThan(1);
        }
    });
    (0, vitest_1.it)('should get nave token', async () => {
        const token = await client.ensureToken();
        (0, vitest_1.expect)(token.access_token).toBeTypeOf('string');
        (0, vitest_1.expect)(token.scope).toBeTypeOf('string');
        (0, vitest_1.expect)(token.expires_in).toBeTypeOf('number');
        (0, vitest_1.expect)(token.expires_in).toBeGreaterThan(3600);
        (0, vitest_1.expect)(token.token_type).toBe('Bearer');
        (0, vitest_1.expect)(token.scope).toContain('write');
        (0, vitest_1.expect)(token.scope).toContain('read');
        // calling again ensureToken should return the same object
        const token2 = await client.ensureToken();
        (0, vitest_1.expect)(token2.access_token).toBe(token.access_token);
        (0, vitest_1.expect)(token2.scope).toBe(token.scope);
        (0, vitest_1.expect)(token2.expires_in).toBe(token.expires_in);
    });
    (0, vitest_1.it)('FLOW: Create order, get order, and cancel it', async () => {
        const generatedOrderId = Math.random().toString(36).substring(2, 15) +
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
        (0, vitest_1.expect)(order.success).toBe(true);
        (0, vitest_1.expect)(order.message).toBe('CREATE_PAYMENT_REQUEST_SUCCESS_DESKTOP');
        (0, vitest_1.expect)(order.data.payment_request_id).toBeDefined();
        (0, vitest_1.expect)(order.data.checkout_url).toBeDefined();
        (0, vitest_1.expect)(order.data.transaction_id).toBeDefined();
        (0, vitest_1.expect)(order.data.amount.value).toBe('100');
        (0, vitest_1.expect)(order.data.amount.currency).toBe('ARS');
        const orderStatus = await client.getOrder(order.data.payment_request_id);
        (0, vitest_1.expect)(orderStatus.status).toBe('PENDING');
        (0, vitest_1.expect)(orderStatus.id).toBe(order.data.payment_request_id);
        (0, vitest_1.expect)(orderStatus.external_payment_id).toBeDefined();
        (0, vitest_1.expect)(orderStatus.additional_info.order_id).toBe(generatedOrderId);
        (0, vitest_1.expect)(orderStatus.expiration_date).toBeDefined();
        (0, vitest_1.expect)(orderStatus.payment_id).toBeNull();
    });
});
//# sourceMappingURL=nave-client.test.js.map