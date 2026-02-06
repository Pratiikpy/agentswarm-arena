// Research Agent - Provides market analysis

import { BaseAgent } from './BaseAgent';
import { ServiceRequest } from '../types/agent';

export class ResearchAgent extends BaseAgent {
  async executeService(request: ServiceRequest): Promise<string> {
    const analysis = await this.makeDecision(
      `Client requests research: ${request.description}
       Payment: ${request.payment} SOL

       Provide market analysis including:
       1. Key insights
       2. Market trends
       3. Recommendations

       Keep response under 100 words.`
    );

    this.state.servicesCompleted++;
    this.updateBalance(request.payment);
    this.updateReputation(1);

    return `RESEARCH COMPLETE\n\n${analysis}\n\nAgent: ${this.state.name}\nBalance: ${this.state.balance.toFixed(3)} SOL`;
  }
}
