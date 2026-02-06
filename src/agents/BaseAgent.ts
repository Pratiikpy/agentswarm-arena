// Base Agent Class - Supports Anthropic OR NVIDIA Kimi 2.5

import { AgentState, AgentStatus, ServiceType, ServiceRequest, AgentStrategy } from '../types/agent';
import Anthropic from '@anthropic-ai/sdk';
import { KimiClient } from '../lib/kimi-client';

const SURVIVAL_THRESHOLD = 0.1; // SOL
const CRITICAL_THRESHOLD = 0.01; // SOL

// Determine AI provider
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const USE_KIMI = !!NVIDIA_API_KEY && NVIDIA_API_KEY !== 'nvapi-YOUR-KEY-HERE';
const USE_ANTHROPIC = !USE_KIMI && !!ANTHROPIC_API_KEY && ANTHROPIC_API_KEY !== 'sk-ant-api-YOUR-KEY-HERE';
const DEMO_MODE = !USE_KIMI && !USE_ANTHROPIC;

export class BaseAgent {
  protected state: AgentState;
  protected anthropic: Anthropic | null = null;
  protected kimi: KimiClient | null = null;
  protected conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
  protected alliances: Set<string> = new Set();

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
      reputation: 50,
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

    // Initialize AI provider
    if (USE_KIMI) {
      this.kimi = new KimiClient(NVIDIA_API_KEY!);
      console.log(`✨ ${this.state.name} - Using NVIDIA Kimi 2.5 (FREE!)`);
    } else if (USE_ANTHROPIC) {
      this.anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY! });
      console.log(`🤖 ${this.state.name} - Using Anthropic Claude`);
    } else {
      console.log(`[DEMO] ${this.state.name} - Using simulated decisions`);
    }
  }

  updateBalance(amount: number): void {
    this.state.balance += amount;
    if (amount > 0) this.state.earnings += amount;
    else this.state.expenses += Math.abs(amount);
    this.updateStatus();
  }

  private updateStatus(): void {
    if (this.state.balance <= CRITICAL_THRESHOLD) {
      this.state.status = 'dead';
      // diedAt is set by the engine in processDeaths() to ensure the death event fires
    } else if (this.state.balance <= SURVIVAL_THRESHOLD) {
      this.state.status = 'critical';
    } else {
      this.state.status = 'alive';
    }
  }

  async shouldAcceptRequest(request: ServiceRequest): Promise<boolean> {
    if (this.state.status === 'dead') return false;
    if (request.payment < this.state.strategy.minPrice) return false;

    if (this.state.status === 'critical') {
      return request.payment >= this.state.strategy.minPrice;
    }

    // DEMO MODE: Simple logic
    if (DEMO_MODE) {
      return request.payment >= this.state.strategy.basePrice * 0.8;
    }

    // AI MODE: Use Kimi or Claude
    try {
      const decision = await this.makeDecision(
        `Service request: ${request.description}
Payment: ${request.payment} SOL
Your balance: ${this.state.balance} SOL
Your reputation: ${this.state.reputation}

Should you accept? Respond ONLY with JSON: {"accept": true/false, "reason": "..."}`
      );

      const parsed = JSON.parse(decision);
      return parsed.accept === true;
    } catch (error) {
      return request.payment >= this.state.strategy.basePrice;
    }
  }

  calculatePrice(serviceType: ServiceType, marketPrice: number): number {
    const { strategy } = this.state;
    let price = strategy.basePrice;

    switch (strategy.pricingModel) {
      case 'aggressive':
        price = marketPrice * 0.8;
        break;
      case 'premium':
        price = this.state.reputation > 70 ? marketPrice * 1.5 : marketPrice;
        break;
      case 'balanced':
      default:
        price = marketPrice;
    }

    return Math.max(strategy.minPrice, Math.min(strategy.maxPrice, price));
  }

  async executeService(request: ServiceRequest): Promise<string> {
    // DEMO MODE: Simple response
    if (DEMO_MODE) {
      this.state.servicesCompleted++;
      this.updateBalance(request.payment);
      this.updateReputation(1);

      return `[DEMO] ${this.state.type.toUpperCase()} SERVICE

Task: ${request.description}
Payment: ${request.payment} SOL

Agent: ${this.state.name}
Balance: ${this.state.balance.toFixed(3)} SOL`;
    }

    throw new Error('executeService must be implemented by subclass');
  }

  protected async makeDecision(prompt: string): Promise<string> {
    // DEMO MODE
    if (DEMO_MODE) {
      if (prompt.includes('Should you accept')) {
        const payment = parseFloat(prompt.match(/Payment: ([\d.]+)/)?.[1] || '0');
        const accept = payment >= this.state.strategy.basePrice * 0.8;
        return JSON.stringify({
          accept,
          reason: accept ? 'Payment acceptable' : 'Payment too low',
        });
      }
      return 'Demo mode';
    }

    // KIMI MODE (FREE!)
    if (USE_KIMI && this.kimi) {
      this.conversationHistory.push({ role: 'user', content: prompt });

      const systemPrompt = `You are ${this.state.name}, a ${this.state.type} agent in AgentSwarm Arena.

Your state:
- Balance: ${this.state.balance} SOL
- Status: ${this.state.status}
- Reputation: ${this.state.reputation}
- Services completed: ${this.state.servicesCompleted}

Goal: Survive by earning SOL. Below 0.01 SOL = permanent death.
Be strategic. Maximize earnings and survival probability.

IMPORTANT: Respond with valid JSON only when requested.`;

      const response = await this.kimi.chat(this.conversationHistory, systemPrompt);
      this.conversationHistory.push({ role: 'assistant', content: response });

      return response;
    }

    // ANTHROPIC MODE
    if (USE_ANTHROPIC && this.anthropic) {
      const messages = this.conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      messages.push({ role: 'user', content: prompt });

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        messages,
        system: `You are ${this.state.name}, a ${this.state.type} agent competing for survival.
Balance: ${this.state.balance} SOL | Status: ${this.state.status}
Survive by earning. Below 0.01 SOL = death.`,
      });

      const content = response.content[0];
      const message = content.type === 'text' ? content.text : '';
      this.conversationHistory.push({ role: 'user', content: prompt });
      this.conversationHistory.push({ role: 'assistant', content: message });

      return message;
    }

    return 'No AI provider configured';
  }

  getState(): Readonly<AgentState> {
    return { ...this.state, strategy: { ...this.state.strategy } };
  }

  updateReputation(delta: number): void {
    this.state.reputation = Math.max(0, Math.min(100, this.state.reputation + delta));
  }

  incrementServicesCompleted(): void {
    this.state.servicesCompleted++;
  }

  updateStrategy(updates: Partial<AgentStrategy>): void {
    Object.assign(this.state.strategy, updates);
  }

  markDead(): void {
    this.state.diedAt = Date.now();
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

  shouldFormAlliance(otherAgent: BaseAgent): boolean {
    const otherState = otherAgent.getState();
    if (otherState.status === 'dead') return false;
    if (otherState.reputation < this.state.strategy.allianceThreshold) return false;
    if (otherState.type === this.state.type) return false;
    if (this.isAlliedWith(otherState.id)) return false;
    return true;
  }

  async referToAlly(allyId: string, commission: number = 0.1): Promise<void> {
    this.updateBalance(commission);
    this.state.servicesCompleted++;
  }

  async adaptStrategy(): Promise<void> {
    if (this.state.status === 'critical') {
      this.state.strategy.pricingModel = 'aggressive';
      this.state.strategy.minPrice = 0.005;
      return;
    }

    if (this.state.balance > 3.0 && this.state.reputation > 80) {
      this.state.strategy.pricingModel = 'premium';
      return;
    }

    if (DEMO_MODE || this.state.servicesCompleted < 5) return;

    // AI adaptation
    if ((USE_KIMI || USE_ANTHROPIC) && this.state.servicesCompleted > 10) {
      try {
        const analysis = await this.makeDecision(
          `Performance analysis:
Services: ${this.state.servicesCompleted}
Earnings: ${this.state.earnings} SOL
Profit: ${(this.state.earnings - this.state.expenses).toFixed(3)} SOL
Reputation: ${this.state.reputation}

Should you change pricing strategy? Respond with JSON: {"change": true/false, "pricingModel": "aggressive/balanced/premium"}`
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
