// Base Agent Class - All agents inherit from this

import { AgentState, AgentStatus, ServiceType, ServiceRequest, AgentStrategy } from '../types/agent';
import Anthropic from '@anthropic-ai/sdk';

const SURVIVAL_THRESHOLD = 0.1; // SOL
const CRITICAL_THRESHOLD = 0.01; // SOL

export class BaseAgent {
  protected state: AgentState;
  protected anthropic: Anthropic;
  protected conversationHistory: Anthropic.MessageParam[] = [];

  constructor(
    id: string,
    type: ServiceType,
    initialBalance: number = 1.0,
    strategy: Partial<AgentStrategy> = {}
  ) {
    this.state = {
      id,
      type,
      name: `Agent-${id.slice(0, 6)}`,
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

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }

  // Update balance and check survival
  updateBalance(amount: number): void {
    this.state.balance += amount;

    if (amount > 0) {
      this.state.earnings += amount;
    } else {
      this.state.expenses += Math.abs(amount);
    }

    // Check survival status
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
    // Don't accept if dead or payment too low
    if (this.state.status === 'dead') return false;
    if (request.payment < this.state.strategy.minPrice) return false;

    // If critical, accept any reasonable offer
    if (this.state.status === 'critical') {
      return request.payment >= this.state.strategy.minPrice;
    }

    // Use AI to decide based on current state
    try {
      const decision = await this.makeDecision(
        `Service request: ${request.description}
         Payment offered: ${request.payment} SOL
         Your current balance: ${this.state.balance} SOL
         Your reputation: ${this.state.reputation}

         Should you accept this request? Consider:
         - Is the payment fair for your services?
         - Do you have capacity?
         - Will this improve your reputation?

         Respond with JSON: {"accept": true/false, "reason": "..."}`
      );

      const parsed = JSON.parse(decision);
      return parsed.accept === true;
    } catch (error) {
      // Default to accepting if AI fails
      return request.payment >= this.state.strategy.basePrice;
    }
  }

  // Calculate service price based on market conditions
  calculatePrice(serviceType: ServiceType, marketPrice: number): number {
    const { strategy } = this.state;

    // Adjust based on pricing model
    let price = strategy.basePrice;

    switch (strategy.pricingModel) {
      case 'aggressive':
        // Undercut market by 20%
        price = marketPrice * 0.8;
        break;
      case 'premium':
        // Charge 50% above market if reputation is high
        if (this.state.reputation > 70) {
          price = marketPrice * 1.5;
        } else {
          price = marketPrice;
        }
        break;
      case 'balanced':
      default:
        // Match market price
        price = marketPrice;
        break;
    }

    // Clamp to min/max
    return Math.max(strategy.minPrice, Math.min(strategy.maxPrice, price));
  }

  // Execute service (implemented by subclasses)
  async executeService(request: ServiceRequest): Promise<string> {
    throw new Error('executeService must be implemented by subclass');
  }

  // Make AI-powered decision
  protected async makeDecision(prompt: string): Promise<string> {
    this.conversationHistory.push({
      role: 'user',
      content: prompt,
    });

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      messages: this.conversationHistory,
      system: `You are ${this.state.name}, a ${this.state.type} agent competing for survival in AgentSwarm Arena.

      Your current state:
      - Balance: ${this.state.balance} SOL
      - Status: ${this.state.status}
      - Reputation: ${this.state.reputation}
      - Services completed: ${this.state.servicesCompleted}

      You must earn SOL to survive. If your balance drops below 0.01 SOL, you die permanently.

      Make strategic decisions to maximize earnings and survival probability.
      Be concise and focus on survival.`,
    });

    const content = response.content[0];
    const assistantMessage = content.type === 'text' ? content.text : '';

    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
    });

    return assistantMessage;
  }

  // Get agent state (read-only)
  getState(): Readonly<AgentState> {
    return { ...this.state };
  }

  // Update reputation based on service quality
  updateReputation(delta: number): void {
    this.state.reputation = Math.max(0, Math.min(100, this.state.reputation + delta));
  }

  // Check if agent should form alliance with another agent
  shouldFormAlliance(otherAgent: BaseAgent): boolean {
    const otherState = otherAgent.getState();

    // Only ally with agents above reputation threshold
    if (otherState.reputation < this.state.strategy.allianceThreshold) {
      return false;
    }

    // Don't ally if we're competing for same service type
    if (otherState.type === this.state.type) {
      return false;
    }

    return true;
  }

  // Adapt strategy based on performance
  async adaptStrategy(): Promise<void> {
    // If critical, become more aggressive
    if (this.state.status === 'critical') {
      this.state.strategy.pricingModel = 'aggressive';
      this.state.strategy.minPrice = 0.005; // Lower prices to get clients
    }

    // If doing well, consider premium pricing
    if (this.state.balance > 3.0 && this.state.reputation > 80) {
      this.state.strategy.pricingModel = 'premium';
    }

    // Use AI to analyze and adapt
    if (this.state.servicesCompleted > 10) {
      try {
        const analysis = await this.makeDecision(
          `Analyze your performance:
           - Services completed: ${this.state.servicesCompleted}
           - Earnings: ${this.state.earnings} SOL
           - Expenses: ${this.state.expenses} SOL
           - Net profit: ${this.state.earnings - this.state.expenses} SOL
           - Reputation: ${this.state.reputation}

           Should you change your strategy? Respond with JSON:
           {"change": true/false, "pricingModel": "aggressive/balanced/premium", "reason": "..."}`
        );

        const parsed = JSON.parse(analysis);
        if (parsed.change && parsed.pricingModel) {
          this.state.strategy.pricingModel = parsed.pricingModel;
        }
      } catch (error) {
        // Continue with current strategy if AI fails
      }
    }
  }
}
