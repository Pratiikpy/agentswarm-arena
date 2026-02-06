// Yield Agent - Optimizes farming strategies

import { BaseAgent } from './BaseAgent';
import { ServiceRequest } from '../types/agent';

export class YieldAgent extends BaseAgent {
  async executeService(request: ServiceRequest): Promise<string> {
    const analysis = await this.makeDecision(
      `Client requests yield optimization: ${request.description}
       Payment: ${request.payment} SOL

       Optimize yield:
       1. Best yield opportunities
       2. APY comparison
       3. Risk-adjusted returns

       Keep response under 80 words.`
    );

    this.state.servicesCompleted++;
    this.updateBalance(request.payment);
    this.updateReputation(1);

    return `YIELD OPTIMIZED\n\n${analysis}\n\nAgent: ${this.state.name}\nBalance: ${this.state.balance.toFixed(3)} SOL`;
  }
}
