// Base Agent Class - All agents inherit from this

import { AgentState, AgentStatus, ServiceType, ServiceRequest, AgentStrategy } from '../types/agent';
import Anthropic from '@anthropic-ai/sdk';

const SURVIVAL_THRESHOLD = 0.1; // SOL
const CRITICAL_THRESHOLD = 0.01; // SOL
const DEMO_MODE = !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sk-ant-api-YOUR-KEY-HERE';

export class BaseAgent {
  protected state: AgentState;
  protected anthropic: Anthropic | null;
  protected conversationHistory: Anthropic.MessageParam[] = [];
  protected alliances: Set<string> = new Set(); // Agent IDs we're allied with

  constructor(
    id: string,
    type: ServiceType,
    initialBalance: number = 1.0,
    strategy: Partial<AgentStrategy> = {}
  ) {
    this.state = {
      id,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}-${id.slice(-4)}`,
      balance: initialBalance,
      status: 'alive',
      reputation: 50, // Start neutral
      servicesCompleted: 0,
      servicesRequested: 0,
      earnings: 0,
      expenses: 0,
      createdAt: Date.now(),
      strategy: {
        pricingModel: strategy.pricingModel || 'balanced',
        basePrice: strategy.basePrice || 0.05,
        minPrice: strategy.minPrice || 0.01,
        maxPrice: strategy.maxPrice || 0.2,
        qualityFocus: strategy.qualityFocus ?? 0.7,
        allianceThreshold: strategy.allianceThreshold ?? 60,
        riskTolerance: strategy.riskTolerance ?? 0.5,
      },
    };

    // Initialize Anthropic only if not in demo mode
    if (!DEMO_MODE) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
      });
    } else {
      this.anthropic = null;
      console.log(`[DEMO MODE] ${this.state.name} - Using simulated AI decisions`);
    }
  }

  // Update balance and check survival
  updateBalance(amount: number): void {
    this.state.balance += amount;

    if (amount > 0) {
      this.state.earnings += amount;
    } else {
      this.state.expenses += Math.abs(amount);
    }

    this.updateStatus();
  }

  private updateStatus(): void {
    if (this.state.balance <= CRITICAL_THRESHOLD) {
      this.state.status = 'dead';
      this.state.diedAt = Date.now();
    } else if (this.state.balance <= SURVIVAL_THRESHOLD) {
      this.state.status = 'critical';
    } else {
      this.state.status = 'alive';
    }
  }

  // Decide whether to accept a service request
  async shouldAcceptRequest(request: ServiceRequest): Promise<boolean> {
    if (this.state.status === 'dead') return false;
    if (request.payment < this.state.strategy.minPrice) return false;

    // If critical, accept any reasonable offer
    if (this.state.status === 'critical') {
      return request.payment >= this.state.strategy.minPrice;
    }

    // DEMO MODE: Simple logic
    if (DEMO_MODE) {
      return request.payment >= this.state.strategy.basePrice * 0.8;
    }

    // AI MODE: Use Claude to decide
    try {
      const decision = await this.makeDecision(
        `Service request: ${request.description}
         Payment offered: ${request.payment} SOL
         Your balance: ${this.state.balance} SOL
         Your reputation: ${this.state.reputation}

         Should you accept? Respond with JSON: {"accept": true/false, "reason": "..."}`
      );

      const parsed = JSON.parse(decision);
      return parsed.accept === true;
    } catch (error) {
      return request.payment >= this.state.strategy.basePrice;
    }
  }

  // Calculate service price
  calculatePrice(serviceType: ServiceType, marketPrice: number): number {
    const { strategy } = this.state;
    let price = strategy.basePrice;

    switch (strategy.pricingModel) {
      case 'aggressive':
        price = marketPrice * 0.8;
        break;
      case 'premium':
        if (this.state.reputation > 70) {
          price = marketPrice * 1.5;
        } else {
          price = marketPrice;
        }
        break;
      case 'balanced':
      default:
        price = marketPrice;
        break;
    }

    return Math.max(strategy.minPrice, Math.min(strategy.maxPrice, price));
  }

  // Execute service (implemented by subclasses)
  async executeService(request: ServiceRequest): Promise<string> {
    // DEMO MODE: Simple response
    if (DEMO_MODE) {
      this.state.servicesCompleted++;
      this.updateBalance(request.payment);
      this.updateReputation(1);

      return `[DEMO] ${this.state.type.toUpperCase()} SERVICE COMPLETE

Task: ${request.description}
Payment: ${request.payment} SOL
Status: Success

Agent: ${this.state.name}
Balance: ${this.state.balance.toFixed(3)} SOL
Reputation: ${this.state.reputation}`;
    }

    throw new Error('executeService must be implemented by subclass');
  }

  // Make AI-powered decision
  protected async makeDecision(prompt: string): Promise<string> {
    // DEMO MODE: Simulated decisions
    if (DEMO_MODE || !this.anthropic) {
      // Simple rule-based responses for demo
      if (prompt.includes('Should you accept')) {
        const payment = parseFloat(prompt.match(/Payment offered: ([\d.]+)/)?.[1] || '0');
        const accept = payment >= this.state.strategy.basePrice * 0.8;
        return JSON.stringify({
          accept,
          reason: accept ? 'Payment is reasonable' : 'Payment too low',
        });
      }
      return 'Demo mode active';
    }

    // AI MODE: Real Claude decisions
    this.conversationHistory.push({ role: 'user', content: prompt });

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      messages: this.conversationHistory,
      system: `You are ${this.state.name}, a ${this.state.type} agent in AgentSwarm Arena.

      State:
      - Balance: ${this.state.balance} SOL
      - Status: ${this.state.status}
      - Reputation: ${this.state.reputation}
      - Services: ${this.state.servicesCompleted}

      Survive by earning SOL. Below 0.01 SOL = death.
      Be strategic. Maximize earnings and survival.`,
    });

    const content = response.content[0];
    const message = content.type === 'text' ? content.text : '';
    this.conversationHistory.push({ role: 'assistant', content: message });

    return message;
  }

  // Get agent state
  getState(): Readonly<AgentState> {
    return { ...this.state };
  }

  // Update reputation
  updateReputation(delta: number): void {
    this.state.reputation = Math.max(0, Math.min(100, this.state.reputation + delta));
  }

  // Alliance system
  formAlliance(otherAgentId: string): void {
    this.alliances.add(otherAgentId);
  }

  breakAlliance(otherAgentId: string): void {
    this.alliances.delete(otherAgentId);
  }

  isAlliedWith(otherAgentId: string): boolean {
    return this.alliances.has(otherAgentId);
  }

  getAlliances(): string[] {
    return Array.from(this.alliances);
  }

  // Check if should ally with another agent
  shouldFormAlliance(otherAgent: BaseAgent): boolean {
    const otherState = otherAgent.getState();

    // Don't ally with dead agents
    if (otherState.status === 'dead') return false;

    // Only ally with high-reputation agents
    if (otherState.reputation < this.state.strategy.allianceThreshold) return false;

    // Don't ally with direct competitors
    if (otherState.type === this.state.type) return false;

    // Already allied
    if (this.isAlliedWith(otherState.id)) return false;

    return true;
  }

  // Refer client to allied agent (revenue sharing)
  async referToAlly(allyId: string, commission: number = 0.1): Promise<void> {
    // Agent gets commission for referral
    this.updateBalance(commission);
    this.state.servicesCompleted++; // Count as partial service
  }

  // Adapt strategy based on performance
  async adaptStrategy(): Promise<void> {
    // If critical, go aggressive
    if (this.state.status === 'critical') {
      this.state.strategy.pricingModel = 'aggressive';
      this.state.strategy.minPrice = 0.005;
      return;
    }

    // If thriving, go premium
    if (this.state.balance > 3.0 && this.state.reputation > 80) {
      this.state.strategy.pricingModel = 'premium';
      return;
    }

    // DEMO MODE: Simple adaptation
    if (DEMO_MODE || this.state.servicesCompleted < 5) return;

    // AI MODE: Analyze and adapt
    if (!DEMO_MODE && this.anthropic && this.state.servicesCompleted > 10) {
      try {
        const analysis = await this.makeDecision(
          `Analyze performance:
           - Services: ${this.state.servicesCompleted}
           - Earnings: ${this.state.earnings} SOL
           - Profit: ${(this.state.earnings - this.state.expenses).toFixed(3)} SOL
           - Reputation: ${this.state.reputation}

           Change strategy? JSON: {"change": true/false, "pricingModel": "aggressive/balanced/premium"}`
        );

        const parsed = JSON.parse(analysis);
        if (parsed.change && parsed.pricingModel) {
          this.state.strategy.pricingModel = parsed.pricingModel;
        }
      } catch {
        // Keep current strategy
      }
    }
  }
}
