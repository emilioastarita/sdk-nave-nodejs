export interface ResponseNaveToken {
  access_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
}

export interface NaveAmount {
  currency: string;
  value: string;
}

export interface NaveBuyer {
  user_id: string;
  doc_type?: string;
  doc_number?: string;
  user_email?: string;
  name?: string;
  phone?: string;
  billing_address?: NaveBillingAddress;
}
export interface NaveBillingAddress {
  street_1: string;
  street_2?: string;
  city: string;
  region: string;
  country: string;
  zip_code: string;
}
export interface NaveProduct {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: NaveAmount;
}

export interface BodyNaveCreateOrder {
  /**
   * Platform identifier: Provided by Nave
   */
  platform: string;
  /**
   * Store identifier: Provided by Nave
   */
  store_id: string;
  /**
   * Where the user is redirected after payment
   * @todo Report nave: this is not a good name for a redirect url :/
   */
  callback_url: string;
  /**
   * Order identifier in Merchant own platform
   */
  order_id: string;
  /**
   * Is mobile ?
   */
  mobile: boolean;
  payment_request: {
    transactions: {
      products: NaveProduct[];
      amount: NaveAmount;
    }[];
    buyer: NaveBuyer;
  };
  /**
   * How long it last the payment intention -- defaults 24 hours
   */
  duration_time?: number;
}

export interface ResponseNaveCreateOrder {
  data: {
    transaction_id: string;
    qr_data: string;
    payment_request_id: string;
    checkout_url: string;
    amount: NaveAmount;
    redirect_to: string;
  };
  success: boolean;
  message: string;
}

export interface ResponseNaveGetOrder {
  id: string;
  external_payment_id: string;
  payment_id: string | null;
  order_id: string;
  expiration_date: string;
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED' | 'PENDING';
  payment_request_id: string;
  payment_check_url: string;
  additional_info: {
    order_id: string;
    callback_url: string;
    mobile: boolean;
    platform: string;
  };
}

export interface ResponseNaveCancelOrder {
  status: 'CANCELLING';
  message: string;
}

export interface NotificationNavePayment {
  payment_id: string;
  payment_check_url: string;
  payment_request_id: string;
  order_id: string;
  status: ResponseNaveGetOrder['status'];
}
