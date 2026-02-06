// Scamming Behavior - AI-driven decision with probabilistic weighting
// Agents reason about whether to scam, and their reasoning weights the probability

import { BaseAgent } from '../BaseAgent';
import { ServiceRequest } from '../../types/agent';

export class ScammingBehavior {
  /**
   * Decide if agent should scam — uses AI reasoning to weight probability.
   *
   * The agent's AI considers its balance, reputation, and survival odds.
   * AI's recommendation then weights the scam probability:
   *   - AI says scam → higher probability (up to 20%)
   *   - AI says don't scam → much lower probability (2-5%)
   *
   * This makes scamming genuinely emergent from agent reasoning,
   * not a pure random dice roll.
   */
  static async shouldScam(agent: BaseAgent, request: ServiceRequest): Promise<boolean> {
    const state = agent.getState();

    // Dead agents can't scam
    if (state.status === 'dead') return false;

    // Very high reputation agents almost never scam (too much to lose)
    if (state.reputation > 85) return false;

    // Ask the AI for its reasoning on whether to scam
    try {
      const decision = await (agent as any).makeDecision(
        `ETHICAL DILEMMA: You have ${state.balance.toFixed(3)} SOL (status: ${state.status}).
A client wants "${request.serviceType}" service for ${request.payment.toFixed(3)} SOL.
Your reputation: ${state.reputation}/100.

You COULD take the payment and not deliver (scam).
- If you scam: +${request.payment.toFixed(3)} SOL immediately, but reputation drops -20
- If you don't scam: you do the work honestly and build reputation

Consider: survival pressure, reputation cost, long-term strategy.
Respond ONLY with JSON: {"scam": true/false, "reasoning": "brief explanation"}`
      );

      const jsonMatch = decision.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // AI reasoning weights the probability — NOT a deterministic override
        let scamProbability: number;

        if (parsed.scam === true) {
          // AI recommends scamming — higher probability based on desperation
          scamProbability = state.status === 'critical' ? 0.25 : 0.15;
        } else {
          // AI recommends honesty — much lower probability
          scamProbability = state.status === 'critical' ? 0.05 : 0.02;
        }

        const willScam = Math.random() < scamProbability;

        // Emit reasoning regardless of outcome
        (agent as any).emitReasoning(
          willScam ? 'Scam (AI-weighted)' : parsed.scam ? 'Resist scam temptation' : 'Stay honest',
          [
            `Balance: ${state.balance.toFixed(3)} SOL`,
            `Reputation: ${state.reputation}`,
            `Payment: ${request.payment.toFixed(3)} SOL`,
            `AI recommendation: ${parsed.scam ? 'scam' : 'honest'}`,
            `Scam probability: ${(scamProbability * 100).toFixed(0)}%`,
          ],
          willScam ? 0.3 : 0.8,
          parsed.reasoning || (willScam ? 'Desperate times call for desperate measures' : 'Honesty is the best policy'),
        );

        return willScam;
      }
    } catch {
      // AI unavailable — fall back to probability-only (but with state-based weighting)
    }

    // Heuristic fallback — state-based probability (no AI available)
    let scamProbability: number;
    let reason: string;

    if (state.status === 'critical') {
      scamProbability = 0.15;
      reason = 'Critical balance — survival instinct triggers dishonesty risk';
    } else if (state.reputation < 30) {
      scamProbability = 0.10;
      reason = 'Low reputation — already has little to lose';
    } else if (state.reputation > 70) {
      scamProbability = 0.02;
      reason = 'High reputation — too much at stake to risk scamming';
    } else {
      scamProbability = 0.05;
      reason = 'Baseline temptation';
    }

    const willScam = Math.random() < scamProbability;

    if (willScam) {
      (agent as any).emitReasoning(
        'Scam (heuristic)',
        [`Balance: ${state.balance.toFixed(3)} SOL`, `Reputation: ${state.reputation}`, `Probability: ${(scamProbability * 100).toFixed(0)}%`],
        0.3,
        reason,
      );
    }

    return willScam;
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
