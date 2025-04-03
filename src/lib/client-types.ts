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
  payment_id: string;
  expiration_date: string;
  payment_retries_allowed: number;
  application: string;
  integrator_id: null | string;
  shop_id: null | string;
  creation_date: string;
  status: string;
  checkout_url: string;
  //@todo report nave should be attempts
  payment_attemps: number;
  payment_type: string;
  transactions: Array<{
    store_id: string;
    amount: NaveAmount;
    ranty_id: string;
    installment_plan: {
      is_government_plan: boolean;
      installment_amount: NaveAmount & {
        components: Array<{
          name: string;
          amount: NaveAmount;
          id: number;
        }>;
      };
      annual_nominal_rate: number;
      promo_id: null | string;
      total_financial_cost: string;
      installment_plan_type_id: string;
      installments: number;
      total_amount: NaveAmount;
      name: string;
      interest_rate: string;
      installments_plan_gateway_id: string;
      has_interest: boolean;
      id: string;
      original_id: string;
    };
    date_created: number;
    contract: {
      entity_id: string;
      merchant_id: string;
    };
    reconciliation_status_entity: string;
    transaction_type: string;
    auth_data: {
      reason: string;
      code: string;
      auth_id: string;
      acquirer_ref_number: string;
      id: string;
      gateway_code: string;
      gateway_reason: string;
      status: string;
    };
    products: Array<{
      name: string;
      description: string;
      id: string;
      quantity: number;
      unit_price: NaveAmount;
    }>;
    stage: string;
    soft_descriptor: string;
    payment_id: string;
    id: string;
    payment_method: {
      data_privacy: {
        encrypted: {
          data: string;
        };
      };
      card_holder_name: string;
      bin: string;
      card_holder_doc_type: string;
      type: string;
      expiration_date: string;
      card_type: string;
      expiration_year: string;
      data_privacy_type: string;
      product_id: string;
      expiration_month: string;
      name: string;
      pan: string;
      card_holder_doc_number: string;
    };
  }>;
  additional_info: {
    callback_url: string;
    mobile: boolean;
    integration_store_id: string;
    order_id: string;
    platform: string;
  };
  seller: {
    store_id: string;
    country: string;
    fantasy_name: string;
    company_id: string;
    store_data: {
      country: string;
      address: {
        number: string;
        street: string;
        notes: string;
      };
      fantasy_name: string;
      updated_at: string;
      city: string;
      id: string;
      state: string;
      mcc: string;
      zip_code: string;
    };
    city: string;
    owner_data: {
      business_name: string;
      country: string;
      address: {
        number: string;
        street: string;
        notes: string;
      };
      city: string;
      tax_registration_date: string;
      external_id: string;
      zip_code: string;
      tax_id: string;
      updated_at: string;
      tax_id_type: string;
      id: string;
      state: string;
      owner_type: string;
    };
    owner_id: string;
    store_address: {
      zipcode: string;
      country: string;
      street_1: string;
      region: string;
      city: string;
    };
    tax_id: string;
    features_allowed: string[];
    category_id: string;
    branch_id: string;
    user_id: string;
    pos_id: string;
    tax_id_type: string;
    name: string;
    branch_data: {
      country: string;
      address: {
        number: string;
        street: string;
        notes: string;
      };
      city: string;
      name: string;
      id: string;
      state: string;
      zip_code: string;
    };
    onboarding_date: string;
  };
  buyer: {
    user_id: string;
  };
  shipping: null;
  contracts: null;
  fraud_prevention: {
    skip_fraud_service: boolean;
    services: Array<{
      priority: number;
      config_id: string;
      acquirer_id: string;
      service_id: string;
    }>;
  };
  payment_gateway: Array<{
    store_id: string;
    id: string;
  }>;
  qr_data: string;
  amount_type: null;
  payment_inputs: {
    card_on_file: {
      payment_methods: {
        card_payment: {
          gateways: Array<{
            name: string;
            id: string;
          }>;
        };
      };
    };
    manual_input: {
      payment_methods: {
        card_payment: {
          gateways: Array<{
            name: string;
            id: string;
          }>;
        };
      };
    };
    wallet: {
      payment_methods: {
        card_payment: {
          gateways: Array<{
            name: string;
            id: string;
          }>;
        };
        transfer: {
          gateways: Array<{
            name: string;
            id: string;
          }>;
        };
      };
    };
    click_to_pay: {
      payment_methods: {
        card_payment: {
          gateways: Array<{
            name: string;
            id: string;
          }>;
        };
      };
    };
  };
  payment_settings: {
    payment_types: {
      ecommerce: {
        payment_inputs: {
          card_on_file: {
            reason: string;
            payment_methods: {
              card_payment: {
                payment_gateways: {
                  sonqo: {
                    reason: string;
                    status: string;
                  };
                };
                reason: string;
                status: string;
              };
            };
            status: string;
          };
          card_not_present: {
            reason: string;
            payment_methods: {
              card_payment: {
                payment_gateways: {
                  naranja: {
                    reason: string;
                    status: string;
                  };
                  sonqo: {
                    reason: string;
                    status: string;
                  };
                  payzen: {
                    reason: string;
                    status: string;
                  };
                };
                reason: string;
                status: string;
              };
            };
            status: string;
          };
          manual_input: {
            reason: string;
            payment_methods: {
              card_payment: {
                payment_gateways: {
                  naranja: {
                    reason: string;
                    status: string;
                  };
                  sonqo: {
                    reason: string;
                    status: string;
                  };
                  payzen: {
                    reason: string;
                    status: string;
                  };
                };
                reason: string;
                status: string;
              };
            };
            status: string;
          };
          wallet: {
            reason: string;
            payment_methods: {
              card_payment: {
                payment_gateways: {
                  naranja: {
                    reason: string;
                    status: string;
                  };
                  sonqo: {
                    reason: string;
                    status: string;
                  };
                  payzen: {
                    reason: string;
                    status: string;
                  };
                };
                reason: string;
                status: string;
              };
              transfer: {
                payment_gateways: {
                  coelsa: {
                    reason: string;
                    status: string;
                  };
                };
                reason: string;
                status: string;
              };
            };
            status: string;
          };
          dynamic_qr: {
            reason: string;
            payment_methods: {
              card_payment: {
                payment_gateways: {
                  naranja: {
                    reason: string;
                    status: string;
                  };
                  sonqo: {
                    reason: string;
                    status: string;
                  };
                  payzen: {
                    reason: string;
                    status: string;
                  };
                };
                reason: string;
                status: string;
              };
              transfer: {
                payment_gateways: {
                  coelsa: {
                    reason: string;
                    status: string;
                  };
                };
                reason: string;
                status: string;
              };
            };
            status: string;
          };
          click_to_pay: {
            reason: string;
            payment_methods: {
              card_payment: {
                payment_gateways: {
                  sonqo: {
                    reason: string;
                    status: string;
                  };
                };
                reason: string;
                status: string;
              };
            };
            status: string;
          };
        };
        reason: string;
        status: string;
      };
    };
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
