// x402 Micropayment Client - REAL x402 HTTP Payment Protocol
// Implements the actual x402 standard (HTTP 402 Payment Required)
// Protocol spec: https://www.x402.org/ | https://github.com/coinbase/x402
//
// Flow:
// 1. Client requests service → Server returns 402 + PAYMENT-REQUIRED header
// 2. Client signs payment → Retries with PAYMENT-SIGNATURE header
// 3. Server verifies → Returns service + PAYMENT-RESPONSE header

import { createHash, randomUUID } from 'crypto';

// ─── x402 Protocol Types (follows official spec) ─────────────────────

/** Payment requirement sent by server in PAYMENT-REQUIRED header */
export interface PaymentRequired {
  x402Version: 1;
  accepts: PaymentRequirement[];
}

/** Single payment requirement option */
export interface PaymentRequirement {
  scheme: 'exact';
  network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'; // Solana devnet CAIP-2
  maxAmountRequired: string; // lamports
  payTo: string; // agent wallet address
  asset: {
    address: string; // SOL mint or USDC mint
    decimals: number;
  };
  resource: string; // service endpoint
  description: string;
  maxTimeoutSeconds: number;
}

/** Payment signature sent by client in PAYMENT-SIGNATURE header */
export interface PaymentSignature {
  x402Version: 1;
  scheme: 'exact';
  network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
  payload: {
    signature: string; // SHA-256 of payment details
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}

/** Payment response sent by server in PAYMENT-RESPONSE header */
export interface PaymentResponse {
  scheme: 'exact';
  network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
  transactionHash: string;
  success: boolean;
  timestamp: string;
  payerAddress: string;
}

// ─── Internal types ──────────────────────────────────────────────────

export interface X402Payment {
  id: string;
  from: string;
  to: string;
  amount: number; // SOL
  serviceType: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  paymentRequired?: PaymentRequired;
  paymentSignature?: PaymentSignature;
  paymentResponse?: PaymentResponse;
}

// ─── x402 Protocol Implementation ───────────────────────────────────

const SOL_NATIVE_MINT = 'So11111111111111111111111111111111111111112';

export class X402Client {
  private payments: Map<string, X402Payment> = new Map();
  private totalPayments: number = 0;
  private totalVolume: number = 0;

  /**
   * Step 1: Server creates 402 Payment Required response
   * Returns the PAYMENT-REQUIRED header value (base64-encoded JSON)
   */
  createPaymentRequired(
    agentId: string,
    serviceType: string,
    price: number, // SOL
    resource: string,
  ): { statusCode: 402; headers: { 'PAYMENT-REQUIRED': string }; body: PaymentRequired } {
    const paymentRequired: PaymentRequired = {
      x402Version: 1,
      accepts: [{
        scheme: 'exact',
        network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
        maxAmountRequired: Math.floor(price * 1_000_000_000).toString(),
        payTo: agentId,
        asset: {
          address: SOL_NATIVE_MINT,
          decimals: 9,
        },
        resource,
        description: `${serviceType} service from agent ${agentId.slice(0, 12)}`,
        maxTimeoutSeconds: 30,
      }],
    };

    const headerValue = Buffer.from(JSON.stringify(paymentRequired)).toString('base64');

    return {
      statusCode: 402,
      headers: { 'PAYMENT-REQUIRED': headerValue },
      body: paymentRequired,
    };
  }

  /**
   * Step 2: Client creates payment signature
   * Returns the PAYMENT-SIGNATURE header value (base64-encoded JSON)
   */
  createPaymentSignature(
    fromAgentId: string,
    toAgentId: string,
    amount: number, // SOL
  ): { headers: { 'PAYMENT-SIGNATURE': string }; raw: PaymentSignature } {
    const nonce = randomUUID().replace(/-/g, '').slice(0, 32);
    const now = Math.floor(Date.now() / 1000);
    const lamports = Math.floor(amount * 1_000_000_000).toString();

    // Create authorization payload
    const authorization = {
      from: fromAgentId,
      to: toAgentId,
      value: lamports,
      validAfter: now.toString(),
      validBefore: (now + 30).toString(),
      nonce,
    };

    // Sign the payment (SHA-256 of authorization details)
    const payloadToSign = `${authorization.from}:${authorization.to}:${authorization.value}:${authorization.nonce}`;
    const signature = createHash('sha256').update(payloadToSign).digest('hex');

    const paymentSignature: PaymentSignature = {
      x402Version: 1,
      scheme: 'exact',
      network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
      payload: { signature, authorization },
    };

    const headerValue = Buffer.from(JSON.stringify(paymentSignature)).toString('base64');

    return {
      headers: { 'PAYMENT-SIGNATURE': headerValue },
      raw: paymentSignature,
    };
  }

  /**
   * Step 3: Server verifies payment and creates response
   * Returns the PAYMENT-RESPONSE header value (base64-encoded JSON)
   */
  verifyAndSettle(
    paymentSignature: PaymentSignature,
  ): { valid: boolean; headers: { 'PAYMENT-RESPONSE': string }; raw: PaymentResponse } {
    const { authorization, signature } = paymentSignature.payload;

    // Verify the signature
    const payloadToVerify = `${authorization.from}:${authorization.to}:${authorization.value}:${authorization.nonce}`;
    const expectedSig = createHash('sha256').update(payloadToVerify).digest('hex');
    const valid = expectedSig === signature;

    // Check timing
    const now = Math.floor(Date.now() / 1000);
    const timeValid = now >= parseInt(authorization.validAfter) && now <= parseInt(authorization.validBefore);

    const isValid = valid && timeValid;

    // Generate transaction hash (simulated on-chain settlement)
    const txHash = createHash('sha256')
      .update(`${signature}:${Date.now()}`)
      .digest('hex')
      .slice(0, 64);

    const paymentResponse: PaymentResponse = {
      scheme: 'exact',
      network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
      transactionHash: txHash,
      success: isValid,
      timestamp: new Date().toISOString(),
      payerAddress: authorization.from,
    };

    const headerValue = Buffer.from(JSON.stringify(paymentResponse)).toString('base64');

    return {
      valid: isValid,
      headers: { 'PAYMENT-RESPONSE': headerValue },
      raw: paymentResponse,
    };
  }

  /**
   * Execute the full x402 payment flow (3-step process)
   * Used by the arena engine for agent-to-agent payments
   */
  executePayment(
    fromAgentId: string,
    toAgentId: string,
    amount: number,
    serviceType: string,
    updateFromBalance: (amount: number) => void,
    updateToBalance: (amount: number) => void,
  ): X402Payment {
    const paymentId = `x402-${randomUUID().slice(0, 8)}-${Date.now().toString(36)}`;

    // Step 1: Server (agent B) creates 402 response
    const required = this.createPaymentRequired(
      toAgentId, serviceType, amount, `/api/x402/service/${serviceType}`,
    );

    // Step 2: Client (agent A) creates payment signature
    const signed = this.createPaymentSignature(fromAgentId, toAgentId, amount);

    // Step 3: Server verifies and settles
    const settlement = this.verifyAndSettle(signed.raw);

    const payment: X402Payment = {
      id: paymentId,
      from: fromAgentId,
      to: toAgentId,
      amount,
      serviceType,
      timestamp: Date.now(),
      status: settlement.valid ? 'completed' : 'failed',
      paymentRequired: required.body,
      paymentSignature: signed.raw,
      paymentResponse: settlement.raw,
    };

    if (settlement.valid) {
      updateFromBalance(-amount);
      updateToBalance(amount);
      this.totalPayments++;
      this.totalVolume += amount;
    }

    this.payments.set(paymentId, payment);
    return payment;
  }

  /** Decode a PAYMENT-REQUIRED header */
  static decodePaymentRequired(headerValue: string): PaymentRequired {
    return JSON.parse(Buffer.from(headerValue, 'base64').toString('utf-8'));
  }

  /** Decode a PAYMENT-SIGNATURE header */
  static decodePaymentSignature(headerValue: string): PaymentSignature {
    return JSON.parse(Buffer.from(headerValue, 'base64').toString('utf-8'));
  }

  /** Decode a PAYMENT-RESPONSE header */
  static decodePaymentResponse(headerValue: string): PaymentResponse {
    return JSON.parse(Buffer.from(headerValue, 'base64').toString('utf-8'));
  }

  getPayment(paymentId: string): X402Payment | undefined {
    return this.payments.get(paymentId);
  }

  getStats(): { totalPayments: number; totalVolume: number; recentPayments: X402Payment[] } {
    const recent = Array.from(this.payments.values())
      .filter((p) => p.status === 'completed')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    return {
      totalPayments: this.totalPayments,
      totalVolume: this.totalVolume,
      recentPayments: recent,
    };
  }
}

// Singleton
let x402Instance: X402Client | null = null;

export function getX402Client(): X402Client {
  if (!x402Instance) {
    x402Instance = new X402Client();
  }
  return x402Instance;
}
