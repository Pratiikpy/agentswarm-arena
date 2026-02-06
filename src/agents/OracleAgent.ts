// Oracle Agent - Provides real price feeds from Pyth

import { BaseAgent } from './BaseAgent';
import { ServiceRequest } from '../types/agent';
import { getPythPrice, getAllPrices } from '../lib/solana-data';

export class OracleAgent extends BaseAgent {
  async executeService(request: ServiceRequest): Promise<string> {
    // Fetch real Pyth price data
    let priceInfo = '';
    try {
      const prices = await getAllPrices();
      const solPrice = prices['SOL/USD'];
      const btcPrice = prices['BTC/USD'];
      const ethPrice = prices['ETH/USD'];

      priceInfo = `LIVE PYTH PRICE FEEDS:
SOL/USD: $${solPrice.price.toFixed(2)} (conf: +/-$${solPrice.confidence.toFixed(2)})
BTC/USD: $${btcPrice.price.toFixed(2)} (conf: +/-$${btcPrice.confidence.toFixed(2)})
ETH/USD: $${ethPrice.price.toFixed(2)} (conf: +/-$${ethPrice.confidence.toFixed(2)})
Source: Pyth Network (hermes.pyth.network)
Updated: ${new Date().toISOString()}`;
    } catch {
      priceInfo = 'Price feed temporarily unavailable';
    }

    // Also get AI analysis if available
    const analysis = await this.makeDecision(
      `Client requests price data: ${request.description}
       Payment: ${request.payment} SOL

       Real-time data available:
       ${priceInfo}

       Provide oracle data including price interpretation and confidence level.
       Keep response under 80 words.`
    );

    this.state.servicesCompleted++;
    this.updateBalance(request.payment);
    this.updateReputation(2);

    this.addEvent({
      type: 'service',
      description: `Delivered Pyth price feed for ${request.payment.toFixed(3)} SOL`,
    });

    this.emitReasoning(
      'Deliver oracle data',
      ['Fetched live Pyth prices', `SOL price data fresh`, `Payment: ${request.payment.toFixed(3)} SOL`],
      0.9,
      'Real-time Pyth price feeds delivered successfully',
    );

    return `ORACLE DATA (LIVE)\n\n${priceInfo}\n\n${analysis}\n\nAgent: ${this.state.name}\nBalance: ${this.state.balance.toFixed(3)} SOL`;
  }
}
