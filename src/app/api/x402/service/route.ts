// x402 Service Endpoint - Real HTTP 402 Payment Required Flow
// Agents request services here and must pay via x402 protocol
//
// GET /api/x402/service?type=trading&agentId=xxx
//   → Without PAYMENT-SIGNATURE: returns 402 + PAYMENT-REQUIRED header
//   → With PAYMENT-SIGNATURE: verifies, executes, returns 200 + PAYMENT-RESPONSE header

import { NextRequest, NextResponse } from 'next/server';
import { getX402Client, X402Client } from '@/lib/x402-client';
import { getArenaEngine } from '@/lib/arena-singleton';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const serviceType = request.nextUrl.searchParams.get('type') || 'trading';
  const requestingAgentId = request.nextUrl.searchParams.get('agentId') || 'anonymous';

  const x402Client = getX402Client();
  const arena = getArenaEngine();

  // Find an available agent of this type
  const agents = arena.getAgents();
  const provider = agents.find(
    (a) => a.type === serviceType && a.status !== 'dead',
  );

  if (!provider) {
    return NextResponse.json(
      { error: `No ${serviceType} agents available` },
      { status: 503 },
    );
  }

  // Check for PAYMENT-SIGNATURE header (Step 2 of x402 flow)
  const paymentSignatureHeader = request.headers.get('PAYMENT-SIGNATURE')
    || request.headers.get('payment-signature')
    || request.headers.get('x-payment');

  if (!paymentSignatureHeader) {
    // Step 1: Return 402 Payment Required with PAYMENT-REQUIRED header
    const price = provider.strategy.basePrice;
    const required = x402Client.createPaymentRequired(
      provider.id,
      serviceType,
      price,
      `/api/x402/service?type=${serviceType}`,
    );

    return new NextResponse(
      JSON.stringify({
        error: 'Payment Required',
        message: `This ${serviceType} service requires ${price} SOL payment via x402 protocol`,
        x402Version: 1,
        accepts: required.body.accepts,
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'PAYMENT-REQUIRED': required.headers['PAYMENT-REQUIRED'],
        },
      },
    );
  }

  // Step 3: Verify payment and deliver service
  try {
    const paymentSignature = X402Client.decodePaymentSignature(paymentSignatureHeader);
    const settlement = await x402Client.verifyAndSettle(paymentSignature, serviceType);

    if (!settlement.valid) {
      return new NextResponse(
        JSON.stringify({ error: 'Payment verification failed' }),
        {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Payment verified - deliver service
    const serviceResult = {
      service: serviceType,
      provider: {
        id: provider.id,
        name: provider.name,
        reputation: provider.reputation,
      },
      result: `${serviceType.toUpperCase()} service executed by ${provider.name}`,
      x402: {
        transactionHash: settlement.raw.transactionHash,
        network: settlement.raw.network,
        timestamp: settlement.raw.timestamp,
      },
    };

    return new NextResponse(
      JSON.stringify(serviceResult),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'PAYMENT-RESPONSE': settlement.headers['PAYMENT-RESPONSE'],
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid payment signature format' },
      { status: 400 },
    );
  }
}
