// DAO Agent - Tracks governance and proposals

import { BaseAgent } from './BaseAgent';
import { ServiceRequest } from '../types/agent';

export class DAOAgent extends BaseAgent {
  async executeService(request: ServiceRequest): Promise<string> {
    const analysis = await this.makeDecision(
      `Client requests DAO analysis: ${request.description}
       Payment: ${request.payment} SOL

       Analyze governance:
       1. Active proposals
       2. Voting recommendations
       3. Treasury status

       Keep response under 80 words.`
    );

    this.state.servicesCompleted++;
    this.updateBalance(request.payment);
    this.updateReputation(1);

    return `DAO ANALYSIS\n\n${analysis}\n\nAgent: ${this.state.name}\nBalance: ${this.state.balance.toFixed(3)} SOL`;
  }
}
