// Base Agent Class - Supports Anthropic OR NVIDIA Kimi 2.5

import { AgentState, AgentStatus, ServiceType, ServiceRequest, AgentStrategy, AgentEvent, ReasoningEvent } from '../types/agent';
import Anthropic from '@anthropic-ai/sdk';
import { KimiClient } from '../lib/kimi-client';
import { getAgentName } from './agent-names';

const SURVIVAL_THRESHOLD = 0.1; // SOL
const CRITICAL_THRESHOLD = 0.01; // SOL

// Determine AI provider - prefer Kimi (free), fallback to Anthropic, then demo mode
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_KEY_FALLBACK = process.env.NVIDIA_API_KEY_FALLBACK;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const USE_KIMI = !!NVIDIA_API_KEY && NVIDIA_API_KEY.startsWith('nvapi-') && NVIDIA_API_KEY !== 'nvapi-YOUR-KEY-HERE';
const USE_ANTHROPIC = !USE_KIMI && !!ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.startsWith('sk-ant-') && ANTHROPIC_API_KEY !== 'sk-ant-api-YOUR-KEY-HERE';
let DEMO_MODE = !USE_KIMI && !USE_ANTHROPIC;

if (USE_KIMI) {
  console.log('[AI] Using NVIDIA Kimi 2.5 for agent reasoning (free tier)');
} else if (USE_ANTHROPIC) {
  console.log('[AI] Using Anthropic Claude for agent reasoning');
} else {
  console.log('[AI] WARNING: No AI provider configured — running in DEMO mode (hardcoded logic)');
  console.log('[AI] Set NVIDIA_API_KEY in .env for real AI agent reasoning');
}

// Circuit breaker: after 3 consecutive AI failures, switch to demo mode
let aiFailCount = 0;
const AI_FAIL_THRESHOLD = 3;

// Callback for reasoning events (set by engine)
let reasoningCallback: ((event: ReasoningEvent) => void) | null = null;

export function setReasoningCallback(cb: (event: ReasoningEvent) => void): void {
  reasoningCallback = cb;
}

export class BaseAgent {
  protected state: AgentState;
  protected anthropic: Anthropic | null = null;
  protected kimi: KimiClient | null = null;
  protected conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
  protected alliances: Set<string> = new Set();
  protected eventHistory: AgentEvent[] = [];

  constructor(
    id: string,
    type: ServiceType,
    initialBalance: number = 1.0,
    strategy: Partial<AgentStrategy> = {}
  ) {
    this.state = {
      id,
      type,
      name: getAgentName(type, id),
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

    // Initialize AI provider with fallback key support
    if (USE_KIMI) {
      this.kimi = new KimiClient(NVIDIA_API_KEY!, NVIDIA_API_KEY_FALLBACK);
    } else if (USE_ANTHROPIC) {
      this.anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY! });
    }
  }

  protected addEvent(event: Omit<AgentEvent, 'timestamp'>): void {
    this.eventHistory.push({ ...event, timestamp: Date.now() });
    // Keep last 100 events
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-100);
    }
  }

  protected emitReasoning(decision: string, factors: string[], confidence: number, rationale: string): void {
    if (reasoningCallback) {
      reasoningCallback({
        agentId: this.state.id,
        agentName: this.state.name,
        decision,
        factors,
        confidence,
        rationale,
        timestamp: Date.now(),
      });
    }
    this.addEvent({
      type: 'reasoning',
      description: `${decision}: ${rationale}`,
      data: { factors, confidence },
    });
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
      this.emitReasoning(
        'Accept request (critical)',
        ['Balance critically low', `Payment: ${request.payment.toFixed(3)} SOL`, 'Must accept to survive'],
        0.9,
        'Accepting any work to stay alive',
      );
      return request.payment >= this.state.strategy.minPrice;
    }

    // Always try AI first (Kimi or Claude), fall back to heuristic only if AI unavailable
    try {
      const decision = await this.makeDecision(
        `Service request: ${request.description}
Payment: ${request.payment} SOL
Your balance: ${this.state.balance} SOL
Your reputation: ${this.state.reputation}
Your pricing model: ${this.state.strategy.pricingModel}
Your base price: ${this.state.strategy.basePrice} SOL

Should you accept this job? Consider: payment vs your costs, your survival needs, reputation impact.
Respond ONLY with JSON: {"accept": true/false, "reason": "brief explanation"}`
      );

      // Try to parse AI response as JSON
      const jsonMatch = decision.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        this.emitReasoning(
          parsed.accept ? 'Accept request' : 'Reject request',
          [
            `Payment: ${request.payment.toFixed(3)} SOL`,
            `Balance: ${this.state.balance.toFixed(3)} SOL`,
            `Reputation: ${this.state.reputation}`,
            `Strategy: ${this.state.strategy.pricingModel}`,
          ],
          parsed.accept ? 0.8 + Math.random() * 0.15 : 0.6 + Math.random() * 0.15,
          parsed.reason || 'AI-driven decision',
        );
        return parsed.accept === true;
      }
      // If AI returned non-JSON, fall through to heuristic
    } catch {
      // AI call failed — use heuristic fallback
    }

    // Heuristic fallback (used when AI unavailable or returns unparseable response)
    const accept = request.payment >= this.state.strategy.basePrice * 0.8;
    this.emitReasoning(
      accept ? 'Accept request' : 'Reject request',
      [
        `Payment: ${request.payment.toFixed(3)} SOL`,
        `Min acceptable: ${(this.state.strategy.basePrice * 0.8).toFixed(3)} SOL`,
        `Balance: ${this.state.balance.toFixed(3)} SOL`,
        DEMO_MODE ? 'Mode: heuristic (no AI configured)' : 'Mode: heuristic fallback (AI unavailable)',
      ],
      accept ? 0.7 : 0.55,
      accept ? 'Payment meets threshold (heuristic)' : 'Payment too low (heuristic)',
    );
    return accept;
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
    // Base implementation: use AI to generate a service response
    // Subclasses (TraderAgent, OracleAgent, etc.) override this with real DeFi data
    this.state.servicesCompleted++;
    this.updateBalance(request.payment);
    this.updateReputation(1);

    this.addEvent({
      type: 'service',
      description: `Completed ${request.serviceType} service for ${request.payment.toFixed(3)} SOL`,
    });

    // Try AI-generated response for richer output
    if (!DEMO_MODE) {
      try {
        const result = await this.makeDecision(
          `You are providing a ${request.serviceType} service.
Task: ${request.description}
Payment: ${request.payment} SOL

Provide a brief, realistic service result (2-3 sentences). Be specific and professional.`
        );
        if (result && result !== 'Demo mode') {
          return `${this.state.type.toUpperCase()} SERVICE — ${this.state.name}

${result}

Payment: ${request.payment} SOL | Balance: ${this.state.balance.toFixed(3)} SOL`;
        }
      } catch {
        // Fall through to basic response
      }
    }

    return `${this.state.type.toUpperCase()} SERVICE — ${this.state.name}

Task: ${request.description}
Payment: ${request.payment} SOL
Balance: ${this.state.balance.toFixed(3)} SOL`;
  }

  protected async makeDecision(prompt: string): Promise<string> {
    // Try AI providers first (Kimi, then Anthropic), fall back to heuristic only if both fail

    // KIMI MODE (FREE!)
    if (USE_KIMI && this.kimi) {
      try {
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
        aiFailCount = 0; // Reset on success
        return response;
      } catch {
        aiFailCount++;
        if (aiFailCount >= AI_FAIL_THRESHOLD) {
          DEMO_MODE = true;
          console.log('[AI] Circuit breaker: switching to demo mode after consecutive failures');
        }
        // Fall through to demo fallback below
      }
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

    // Heuristic fallback (reached after AI failure or no provider configured)
    if (prompt.includes('Should you accept')) {
      const payment = parseFloat(prompt.match(/Payment: ([\d.]+)/)?.[1] || '0');
      const accept = payment >= this.state.strategy.basePrice * 0.8;
      return JSON.stringify({
        accept,
        reason: accept
          ? `Payment ${payment.toFixed(3)} SOL exceeds minimum threshold`
          : `Payment ${payment.toFixed(3)} SOL below minimum ${(this.state.strategy.basePrice * 0.8).toFixed(3)} SOL`,
      });
    }
    if (prompt.includes('Should you scam') || prompt.includes('scam')) {
      // Default: don't scam unless truly desperate
      const desperate = this.state.balance < 0.05;
      return JSON.stringify({
        scam: desperate,
        reasoning: desperate
          ? `Balance critically low at ${this.state.balance.toFixed(3)} SOL — desperate measures needed`
          : `Balance at ${this.state.balance.toFixed(3)} SOL — scamming not worth the reputation hit`,
      });
    }
    if (prompt.includes('cartel') || prompt.includes('Cartel')) {
      const shouldJoin = this.state.reputation > 65 && this.state.balance > 0.5;
      return JSON.stringify({
        join: shouldJoin,
        proposed_price_multiplier: shouldJoin ? 1.2 + Math.random() * 0.2 : 1.0,
        reasoning: shouldJoin
          ? 'Cartel membership would stabilize income at premium rates'
          : 'Current position does not warrant cartel risk',
      });
    }
    return `${this.state.type} analysis completed for the requested task.`;
  }

  getState(): Readonly<AgentState> {
    return { ...this.state, strategy: { ...this.state.strategy } };
  }

  getEventHistory(): AgentEvent[] {
    return [...this.eventHistory];
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
    this.addEvent({ type: 'death', description: `Died with ${this.state.balance.toFixed(4)} SOL after ${this.state.servicesCompleted} services` });
  }

  setSolanaTxSignature(sig: string): void {
    this.state.solanaTxSignature = sig;
  }

  // Alliance system
  formAlliance(otherAgentId: string): void {
    this.alliances.add(otherAgentId);
    this.addEvent({ type: 'alliance', description: `Formed alliance with ${otherAgentId}` });
  }

  breakAlliance(otherAgentId: string): void {
    this.alliances.delete(otherAgentId);
    this.addEvent({ type: 'alliance', description: `Broke alliance with ${otherAgentId}` });
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
      const oldModel = this.state.strategy.pricingModel;
      this.state.strategy.pricingModel = 'aggressive';
      this.state.strategy.minPrice = 0.005;
      if (oldModel !== 'aggressive') {
        this.emitReasoning(
          'Switch to aggressive pricing',
          ['Balance critical', `Only ${this.state.balance.toFixed(3)} SOL remaining`, 'Must undercut to get any work'],
          0.95,
          'Survival mode: accepting any work at any price',
        );
        this.addEvent({ type: 'strategy', description: `Switched to aggressive pricing (survival mode)` });
      }
      return;
    }

    if (this.state.balance > 3.0 && this.state.reputation > 80) {
      const oldModel = this.state.strategy.pricingModel;
      this.state.strategy.pricingModel = 'premium';
      if (oldModel !== 'premium') {
        this.emitReasoning(
          'Switch to premium pricing',
          ['High balance', 'High reputation', 'Can afford to be selective'],
          0.85,
          'Strong position allows premium pricing',
        );
        this.addEvent({ type: 'strategy', description: `Switched to premium pricing (dominant position)` });
      }
      return;
    }

    if (this.state.servicesCompleted < 5) return;

    // AI adaptation (or heuristic fallback)
    if (this.state.servicesCompleted > 10) {
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
          this.addEvent({ type: 'strategy', description: `AI adapted: switched to ${parsed.pricingModel} pricing` });
        }
      } catch {
        // Keep current strategy
      }
    }
  }
}
