// Oracle Agent - Provides price feeds and data

import { BaseAgent } from './BaseAgent';
import { ServiceRequest } from '../types/agent';

export class OracleAgent extends BaseAgent {
  async executeService(request: ServiceRequest): Promise<string> {
    const analysis = await this.makeDecision(
      `Client requests price data: ${request.description}
       Payment: ${request.payment} SOL

       Provide oracle data including:
       1. Current price/data point
       2. Confidence level
       3. Data source

       Keep response under 80 words.`
    );

    this.state.servicesCompleted++;
    this.updateBalance(request.payment);
    this.updateReputation(2); // Oracles are trusted services

    return `ORACLE DATA\n\n${analysis}\n\nAgent: ${this.state.name}\nBalance: ${this.state.balance.toFixed(3)} SOL`;
  }
}
