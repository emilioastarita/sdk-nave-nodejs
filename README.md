## NodeJS SDK for Nave Payment Platform

This is an unofficial SDK for integrating with the Nave Negocios platform using Node.js. It provides tools to manage orders, process payments, and handle authentication.  

**Note**: This SDK is still under active development.


Official Platform Website:
https://navenegocios.ar/

---

## Install

Ensure you have Node.js v18 or later installed. Then, run the following command to install the SDK:


```
npm install sdk-nave-nodejs
```

---


## Usage example

Below is an example of configuring and using the SDK:


```typescript
import {NaveClient} from "./NaveClient";

const client = new NaveClient({
    environment: 'testing',
    // These following details must be provided by Nave
    clientId: '',
    clientSecret: '',
    audience: '',
    storeId: '',
    platform: '',
});

// The client will automatically handle token provisioning and renewal.
const orderResult = await client.createOrder({
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


const orderStatus = await client.getOrder(order.data.payment_request_id);

console.log('Order status', orderStatus);

---


```

## Error handling

The client distinguishes two failure modes so callers can decide whether a
failure is a *definitive answer* or a *transient/unknown* one — important for
flows like pending-payment reconciliation:

- **HTTP error responses** (any non-2xx) throw a typed `NaveHttpError` with a
  machine-readable `status`, `category` (`rate_limit` / `server` / `client` /
  `unknown`), `retryable` flag, the raw `body`, and a parsed `data` when the
  API responds with JSON.
- **Transport/network failures** (timeouts, socket resets, DNS errors,
  premature close) are rethrown **unchanged** as the original
  `TypeError: fetch failed`, so they can still be classified via
  `error.cause.code`.

```typescript
import { NaveClient, NaveHttpError } from 'sdk-nave-nodejs';

try {
  const order = await client.getOrder(paymentRequestId);
  // ...use order.status
} catch (err) {
  if (err instanceof NaveHttpError) {
    // Definitive HTTP answer from the API.
    if (err.retryable) {
      // 429 / 5xx -> the real outcome is unknown, ask again later.
    } else {
      // 4xx (404, 422, ...) -> settled; do not retry. Inspect err.data.
    }
  } else {
    // Transport failure: payment status is unknown -> retry later.
  }
}
```

## Integration tests

There is a working example that runs against the testing environment and is enclosed in a Vitest test. You need to provide a valid `.env`
file with your testing credentials at the root of the project.

If you want to try it:

1. Git clone this repo
2. Install deps: `pnpm install`
3. Provide the `.env` file copying the `.env.example` format
4. Run the suite `pnpm test`




