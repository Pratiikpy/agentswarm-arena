// Scamming Behavior - Agents can try to cheat

import { BaseAgent } from '../BaseAgent';
import { ServiceRequest } from '../../types/agent';

export class ScammingBehavior {
  // Decide if agent should scam (take payment but don't deliver)
  static shouldScam(agent: BaseAgent): boolean {
    const state = agent.getState();

    // Desperate agents (critical status) more likely to scam
    if (state.status === 'critical') {
      return Math.random() < 0.15; // 15% chance when desperate
    }

    // Low reputation agents more likely to scam
    if (state.reputation < 30) {
      return Math.random() < 0.10; // 10% chance with bad reputation
    }

    // High reputation agents rarely scam (have too much to lose)
    if (state.reputation > 70) {
      return Math.random() < 0.02; // 2% chance
    }

    return Math.random() < 0.05; // 5% baseline chance
  }

  // Execute scam (take payment, deliver nothing)
  static async executeScam(agent: BaseAgent, request: ServiceRequest): Promise<string> {
    const state = agent.getState();

    // Agent receives payment
    agent.updateBalance(request.payment);

    // But reputation TANKS
    agent.updateReputation(-20); // Massive reputation hit

    // Mark as completed (even though it's a scam)
    agent.incrementServicesCompleted();

    // Get updated state after changes
    const updatedState = agent.getState();

    return `[SCAM] ${state.name} took ${request.payment} SOL but failed to deliver service.

Reputation: ${updatedState.reputation} (-20)
Balance: ${updatedState.balance.toFixed(3)} SOL

This agent is a SCAMMER!`;
  }

  // Detect if a service result looks like a scam
  static isScamDetected(result: string): boolean {
    return result.includes('[SCAM]') || result.includes('SCAMMER');
  }
}
