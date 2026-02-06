// Arbitrage Agent - Finds cross-DEX opportunities

import { BaseAgent } from './BaseAgent';
import { ServiceRequest } from '../types/agent';

export class ArbitrageAgent extends BaseAgent {
  async executeService(request: ServiceRequest): Promise<string> {
    const analysis = await this.makeDecision(
      `Client requests arbitrage: ${request.description}
       Payment: ${request.payment} SOL

       Find arbitrage opportunity:
       1. Price difference identified
       2. Expected profit
       3. Execution plan

       Keep response under 80 words.`
    );

    this.state.servicesCompleted++;
    this.updateBalance(request.payment);

    // Arbitrage is high-value
    if (request.payment >= 0.1) {
      this.updateReputation(3);
    } else {
      this.updateReputation(1);
    }

    return `ARBITRAGE FOUND\n\n${analysis}\n\nAgent: ${this.state.name}\nBalance: ${this.state.balance.toFixed(3)} SOL`;
  }
}
