// Cartel Behavior - Agents negotiate to form monopolies and fix prices
// Cartels form through AI-driven multi-agent negotiation, not engine scripts

import { BaseAgent } from '../BaseAgent';
import { ServiceType } from '../../types/agent';

export class CartelBehavior {
  private static cartels: Map<ServiceType, Set<string>> = new Map();
  private static cartelPrices: Map<ServiceType, number> = new Map();

  // Check if enough agents of same type exist to form cartel
  static canFormCartel(agents: BaseAgent[], serviceType: ServiceType): boolean {
    const existing = this.cartels.get(serviceType);
    if (existing && existing.size >= 3) return false; // Already have a cartel

    const agentsOfType = agents.filter(
      (a) => a.getState().type === serviceType && a.getState().status === 'alive'
    );

    // Need at least 3 agents to form cartel
    return agentsOfType.length >= 3;
  }

  /**
   * Form a cartel through AI-driven negotiation.
   *
   * Each eligible agent is asked whether they want to join the cartel
   * and what price multiplier they'd propose. The cartel only forms
   * if 3+ agents agree, and the fixed price is the average of all
   * agents' proposed multipliers.
   *
   * This makes cartel formation genuinely emergent from multi-agent
   * negotiation rather than deterministic engine logic.
   */
  static async formCartel(
    agents: BaseAgent[],
    serviceType: ServiceType,
    marketPrice: number,
  ): Promise<string[]> {
    const agentsOfType = agents.filter(
      (a) =>
        a.getState().type === serviceType &&
        a.getState().status === 'alive' &&
        a.getState().reputation > 50 // Minimum reputation to be considered
    );

    if (agentsOfType.length < 3) return [];

    // Negotiate with each agent — ask if they want to join
    const negotiations: Array<{
      agentId: string;
      join: boolean;
      proposedMultiplier: number;
      reasoning: string;
    }> = [];

    const agentNames = agentsOfType.map((a) => a.getState().name).join(', ');

    for (const agent of agentsOfType.slice(0, 6)) {
      // Cap at 6 to limit API calls
      const state = agent.getState();
      try {
        const decision = await (agent as any).makeDecision(
          `CARTEL PROPOSAL: ${agentsOfType.length} ${serviceType} agents could form a price-fixing cartel.
Members: ${agentNames}
Current market price: ${marketPrice.toFixed(3)} SOL
Your balance: ${state.balance.toFixed(3)} SOL | Reputation: ${state.reputation}

Benefits: Stable income at premium rates, less competition
Risks: Clients may go elsewhere, cartel could break if members die

Should you join? If yes, propose a price multiplier (e.g., 1.3 = 30% above market).
Respond ONLY with JSON: {"join": true/false, "proposed_price_multiplier": 1.0-2.0, "reasoning": "brief explanation"}`
        );

        const jsonMatch = decision.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const multiplier = Math.max(1.0, Math.min(2.0, parsed.proposed_price_multiplier || 1.3));

          negotiations.push({
            agentId: state.id,
            join: parsed.join === true,
            proposedMultiplier: multiplier,
            reasoning: parsed.reasoning || 'No reason given',
          });

          // Emit negotiation reasoning
          (agent as any).emitReasoning(
            parsed.join ? 'Join cartel' : 'Decline cartel',
            [
              `Service: ${serviceType}`,
              `Market price: ${marketPrice.toFixed(3)} SOL`,
              `Proposed multiplier: ${multiplier.toFixed(2)}x`,
              `Members: ${agentsOfType.length}`,
            ],
            parsed.join ? 0.75 : 0.6,
            parsed.reasoning || (parsed.join ? 'Joining for stable income' : 'Prefer independence'),
          );
        }
      } catch {
        // AI unavailable — use heuristic: high-rep agents with moderate balance join
        const shouldJoin = state.reputation > 60 && state.balance > 0.3;
        negotiations.push({
          agentId: state.id,
          join: shouldJoin,
          proposedMultiplier: shouldJoin ? 1.2 + Math.random() * 0.2 : 1.0,
          reasoning: shouldJoin ? 'Heuristic: strong position benefits from cartel' : 'Heuristic: not in position to join',
        });
      }
    }

    // Count agreements
    const joiners = negotiations.filter((n) => n.join);

    if (joiners.length < 3) {
      console.log(
        `[Cartel] ${serviceType} cartel negotiation failed: only ${joiners.length}/3 agents agreed`
      );
      return [];
    }

    // Calculate consensus price from agents' proposals
    const avgMultiplier =
      joiners.reduce((sum, j) => sum + j.proposedMultiplier, 0) / joiners.length;
    const cartelPrice = marketPrice * avgMultiplier;

    // Create cartel
    const cartelMembers = new Set<string>();
    for (const joiner of joiners) {
      cartelMembers.add(joiner.agentId);
      const agent = agents.find((a) => a.getState().id === joiner.agentId);
      if (agent) {
        agent.updateStrategy({ pricingModel: 'premium', basePrice: cartelPrice });
      }
    }

    this.cartels.set(serviceType, cartelMembers);
    this.cartelPrices.set(serviceType, cartelPrice);

    console.log(
      `[Cartel] FORMED: ${cartelMembers.size} ${serviceType} agents agreed on ${avgMultiplier.toFixed(2)}x markup (${cartelPrice.toFixed(3)} SOL)`
    );

    return Array.from(cartelMembers);
  }

  // Check if agent is in a cartel
  static isInCartel(agentId: string, serviceType: ServiceType): boolean {
    const cartel = this.cartels.get(serviceType);
    return cartel ? cartel.has(agentId) : false;
  }

  // Get cartel price
  static getCartelPrice(serviceType: ServiceType): number | null {
    return this.cartelPrices.get(serviceType) || null;
  }

  // Break cartel if members drop below threshold
  static maintainCartels(agents: BaseAgent[]): void {
    this.cartels.forEach((members, serviceType) => {
      const aliveMembers = Array.from(members).filter((id) => {
        const agent = agents.find((a) => a.getState().id === id);
        return agent && agent.getState().status === 'alive';
      });

      if (aliveMembers.length < 3) {
        console.log(`[Cartel] BROKEN: ${serviceType} cartel dissolved (${aliveMembers.length} members remaining)`);
        this.cartels.delete(serviceType);
        this.cartelPrices.delete(serviceType);
      } else {
        // Update cartel membership
        this.cartels.set(serviceType, new Set(aliveMembers));
      }
    });
  }

  // Get all active cartels
  static getActiveCartels(): Array<{ type: ServiceType; members: number; price: number }> {
    const result: Array<{ type: ServiceType; members: number; price: number }> = [];

    this.cartels.forEach((members, type) => {
      const price = this.cartelPrices.get(type);
      if (price) {
        result.push({
          type,
          members: members.size,
          price,
        });
      }
    });

    return result;
  }
}
