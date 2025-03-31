import fetch from 'node-fetch';
import {
  BodyNaveCreateOrder,
  ResponseNaveCancelOrder,
  ResponseNaveCreateOrder,
  ResponseNaveGetOrder,
  ResponseNaveToken,
} from './client-types';

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
  }: {
    clientId: string;
    clientSecret: string;
    audience: string;
    environment?: Environment;
    storeId: string;
    platform: string;
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

  private request = async <T>({
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
    const res = await fetch(url, {
      method,
      headers: _headers,
      body: method !== 'GET' && body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      console.log(
        `Error (${
          res.status
        }) fetching ${url} \nwith ${method} \n and Body: ${JSON.stringify(body)} \n and Headers: ${JSON.stringify(_headers)}`,
      );
      throw new Error(await res.text());
    }

    return res.json() as Promise<T>;
  };
}
