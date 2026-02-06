// Cartel Behavior - Agents form monopolies and fix prices

import { BaseAgent } from '../BaseAgent';
import { ServiceType } from '../../types/agent';

export class CartelBehavior {
  private static cartels: Map<ServiceType, Set<string>> = new Map();
  private static cartelPrices: Map<ServiceType, number> = new Map();

  // Check if enough agents of same type exist to form cartel
  static canFormCartel(agents: BaseAgent[], serviceType: ServiceType): boolean {
    const agentsOfType = agents.filter(
      (a) => a.getState().type === serviceType && a.getState().status === 'alive'
    );

    // Need at least 3 agents to form cartel
    return agentsOfType.length >= 3;
  }

  // Form a cartel (price-fixing agreement)
  static formCartel(agents: BaseAgent[], serviceType: ServiceType, fixedPrice: number): string[] {
    const agentsOfType = agents.filter(
      (a) =>
        a.getState().type === serviceType &&
        a.getState().status === 'alive' &&
        a.getState().reputation > 60 // Only high-reputation agents join cartels
    );

    if (agentsOfType.length < 3) return [];

    // Create cartel
    const cartelMembers = new Set<string>();
    agentsOfType.forEach((agent) => {
      cartelMembers.add(agent.getState().id);

      // Agents in cartel switch to premium pricing
      agent.updateStrategy({ pricingModel: 'premium', basePrice: fixedPrice });
    });

    this.cartels.set(serviceType, cartelMembers);
    this.cartelPrices.set(serviceType, fixedPrice);

    console.log(
      `🤝 CARTEL FORMED: ${cartelMembers.size} ${serviceType} agents fixing price at ${fixedPrice} SOL`
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
        console.log(`💔 CARTEL BROKEN: ${serviceType} cartel dissolved (insufficient members)`);
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
