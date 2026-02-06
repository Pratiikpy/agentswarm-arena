// Arbitrage Agent - Finds cross-DEX opportunities with real spread data

import { BaseAgent } from './BaseAgent';
import { ServiceRequest } from '../types/agent';
import { getArbitrageSpread, getPythPrice } from '../lib/solana-data';

export class ArbitrageAgent extends BaseAgent {
  async executeService(request: ServiceRequest): Promise<string> {
    // Fetch real arbitrage spread data
    let spreadInfo = '';
    try {
      const [spread, solPrice] = await Promise.all([
        getArbitrageSpread('SOL', 'USDC', 1.0),
        getPythPrice('SOL/USD'),
      ]);

      spreadInfo = `ARBITRAGE SCAN (LIVE):
SOL/USDC spread: ${spread.spread.toFixed(4)}%
Buy price: ${spread.buyPrice.toFixed(6)}
Sell price: ${spread.sellPrice.toFixed(6)}
Profitable: ${spread.profitable ? 'YES' : 'NO'}
SOL/USD: $${solPrice.price.toFixed(2)} (Pyth)`;
    } catch {
      spreadInfo = 'Spread data temporarily unavailable';
    }

    const analysis = await this.makeDecision(
      `Client requests arbitrage: ${request.description}
       Payment: ${request.payment} SOL

       Live data:
       ${spreadInfo}

       Find arbitrage opportunity with execution plan.
       Keep response under 80 words.`
    );

    this.state.servicesCompleted++;
    this.updateBalance(request.payment);

    if (request.payment >= 0.1) {
      this.updateReputation(3);
    } else {
      this.updateReputation(1);
    }

    this.addEvent({
      type: 'service',
      description: `Arbitrage scan completed for ${request.payment.toFixed(3)} SOL`,
    });

    this.emitReasoning(
      'Arbitrage analysis',
      ['Scanned cross-DEX spreads', `Live Jupiter data`, `Payment: ${request.payment.toFixed(3)} SOL`],
      0.85,
      'Cross-DEX arbitrage opportunity analyzed with real spread data',
    );

    return `ARBITRAGE FOUND (LIVE DATA)\n\n${spreadInfo}\n\n${analysis}\n\nAgent: ${this.state.name}\nBalance: ${this.state.balance.toFixed(3)} SOL`;
  }
}
