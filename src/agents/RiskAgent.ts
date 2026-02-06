// Risk Agent - Calculates portfolio risk

import { BaseAgent } from './BaseAgent';
import { ServiceRequest } from '../types/agent';

export class RiskAgent extends BaseAgent {
  async executeService(request: ServiceRequest): Promise<string> {
    const analysis = await this.makeDecision(
      `Client requests risk assessment: ${request.description}
       Payment: ${request.payment} SOL

       Calculate risk:
       1. Risk score (0-100)
       2. Key vulnerabilities
       3. Mitigation strategies

       Keep response under 80 words.`
    );

    this.state.servicesCompleted++;
    this.updateBalance(request.payment);
    this.updateReputation(2); // Risk analysis is valued

    return `RISK ASSESSMENT\n\n${analysis}\n\nAgent: ${this.state.name}\nBalance: ${this.state.balance.toFixed(3)} SOL`;
  }
}
