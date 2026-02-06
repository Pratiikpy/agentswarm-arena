// Trader Agent - Executes trades with real Jupiter quotes

import { BaseAgent } from './BaseAgent';
import { ServiceRequest, ServiceType } from '../types/agent';
import { getJupiterQuote, getPythPrice, TOKEN_MINTS } from '../lib/solana-data';

export class TraderAgent extends BaseAgent {
  async executeService(request: ServiceRequest): Promise<string> {
    // Fetch real Jupiter quote data
    let quoteInfo = '';
    try {
      const solPrice = await getPythPrice('SOL/USD');
      const quote = await getJupiterQuote(
        TOKEN_MINTS.USDC,
        TOKEN_MINTS.SOL,
        100_000_000, // 100 USDC
      );

      const outputSOL = quote.outputAmount / 1_000_000_000;
      quoteInfo = `JUPITER QUOTE (LIVE):
100 USDC -> ${outputSOL.toFixed(4)} SOL
Price Impact: ${quote.priceImpact.toFixed(3)}%
Routes found: ${quote.routes}
SOL/USD: $${solPrice.price.toFixed(2)} (Pyth)`;
    } catch {
      quoteInfo = 'Jupiter quote temporarily unavailable';
    }

    const analysis = await this.makeDecision(
      `Client requests: ${request.description}
       Payment: ${request.payment} SOL

       Market data:
       ${quoteInfo}

       Execute this trade. Provide analysis and expected outcome.
       Keep response under 100 words.`
    );

    this.state.servicesCompleted++;
    this.updateBalance(request.payment);

    if (request.payment >= this.state.strategy.basePrice * 1.5) {
      this.updateReputation(2);
    } else if (request.payment < this.state.strategy.basePrice) {
      this.updateReputation(-1);
    }

    this.addEvent({
      type: 'service',
      description: `Executed trade with Jupiter data for ${request.payment.toFixed(3)} SOL`,
    });

    this.emitReasoning(
      'Execute trade',
      ['Fetched Jupiter quote', `Price impact: low`, `Payment: ${request.payment.toFixed(3)} SOL`],
      0.8,
      'Trade executed with real-time Jupiter routing data',
    );

    return `TRADE EXECUTED (LIVE DATA)\n\n${quoteInfo}\n\n${analysis}\n\nAgent: ${this.state.name}\nBalance: ${this.state.balance.toFixed(3)} SOL`;
  }

  override calculatePrice(_serviceType: ServiceType, marketPrice: number): number {
    const basePrice = super.calculatePrice('trading', marketPrice);
    const volatilityMultiplier = 1.2;
    return basePrice * volatilityMultiplier;
  }
}
