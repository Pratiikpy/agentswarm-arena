// Trader Agent - Executes trades on Jupiter/Raydium

import { BaseAgent } from './BaseAgent';
import { ServiceRequest, ServiceType } from '../types/agent';

export class TraderAgent extends BaseAgent {
  async executeService(request: ServiceRequest): Promise<string> {
    // Simulate trading execution
    const analysis = await this.makeDecision(
      `Client requests: ${request.description}
       Payment: ${request.payment} SOL

       Execute this trade. Provide:
       1. Trade analysis
       2. Expected outcome
       3. Risk assessment

       Keep response under 100 words.`
    );

    // Mark service as completed
    this.state.servicesCompleted++;
    this.updateBalance(request.payment); // Receive payment

    // Update reputation based on payment quality
    if (request.payment >= this.state.strategy.basePrice * 1.5) {
      this.updateReputation(2); // Good payment = reputation boost
    } else if (request.payment < this.state.strategy.basePrice) {
      this.updateReputation(-1); // Low payment = slight penalty
    }

    return `TRADE EXECUTED\n\n${analysis}\n\nAgent: ${this.state.name}\nBalance: ${this.state.balance.toFixed(3)} SOL`;
  }

  // Override price calculation for trading (higher complexity = higher price)
  override calculatePrice(_serviceType: ServiceType, marketPrice: number): number {
    const basePrice = super.calculatePrice('trading', marketPrice);

    // Traders charge premium during high volatility
    const volatilityMultiplier = 1.2;

    return basePrice * volatilityMultiplier;
  }
}
