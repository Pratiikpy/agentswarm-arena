// Arena Engine - Manages all agents, matches services, processes transactions

import { BaseAgent, createAgent, setReasoningCallback } from '../agents';
import { ServiceType, ServiceRequest, Transaction, ArenaStats, AgentState, BalanceSnapshot, ReasoningEvent } from '../types/agent';
import { EventEmitter } from 'events';
import { ScammingBehavior } from '../agents/behaviors/ScammingBehavior';
import { CartelBehavior } from '../agents/behaviors/CartelBehavior';
import { getSolanaLogger } from '../lib/solana-logger';
import { getX402Client } from '../lib/x402-client';

const SERVICE_TYPES: ServiceType[] = [
  'trading',
  'research',
  'security',
  'oracle',
  'liquidity',
  'arbitrage',
  'sentiment',
  'risk',
  'yield',
  'dao',
];

export class ArenaEngine extends EventEmitter {
  private agents: Map<string, BaseAgent> = new Map();
  private transactions: Transaction[] = [];
  private serviceRequests: ServiceRequest[] = [];
  private running: boolean = false;
  private tickInterval: NodeJS.Timeout | null = null;
  private balanceHistory: BalanceSnapshot[] = [];
  private tickCount: number = 0;

  constructor() {
    super();
    this.setMaxListeners(50);

    // Wire up reasoning callback from agents
    setReasoningCallback((event: ReasoningEvent) => {
      this.emit('reasoning', event);
    });
  }

  // Initialize arena with N agents
  async initialize(agentCount: number = 100): Promise<void> {
    console.log(`Initializing arena with ${agentCount} agents...`);

    for (let i = 0; i < agentCount; i++) {
      const type = SERVICE_TYPES[i % SERVICE_TYPES.length];
      const id = `agent-${Date.now()}-${i}`;
      const agent = createAgent(id, type, 1.0);
      this.agents.set(id, agent);
    }

    console.log(`${this.agents.size} agents created`);
    this.emit('initialized', { agentCount: this.agents.size });
  }

  start(): void {
    if (this.running) return;

    this.running = true;
    console.log('Arena started! Agents are now competing...');

    this.tickInterval = setInterval(() => {
      this.tick().catch((err) => {
        console.error('Arena tick error:', err);
      });
    }, 3000);

    this.emit('started');
  }

  stop(): void {
    this.running = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    console.log('Arena stopped');
    this.emit('stopped');
  }

  // Main game loop tick
  private async tick(): Promise<void> {
    this.tickCount++;

    // 1. Generate random service requests (high volume for action)
    await this.generateServiceRequests(12);

    // 2. Match requests to agents
    await this.matchRequests();

    // 2b. Clean up completed/failed requests
    this.serviceRequests = this.serviceRequests.filter(
      (r) => r.status === 'pending' || r.status === 'in_progress'
    );

    // 3. Process deaths
    this.processDeaths();

    // 4. Maintain cartels
    CartelBehavior.maintainCartels(Array.from(this.agents.values()));

    // 5. Try to form new cartels (10% chance per tick)
    if (Math.random() < 0.1) {
      this.attemptCartelFormation();
    }

    // 6. Form/break alliances (20% chance per tick)
    if (Math.random() < 0.2) {
      this.manageAlliances();
    }

    // 7. Agents adapt their strategies (every 5th tick)
    if (this.transactions.length % 25 === 0) {
      await this.agentAdaptation();
    }

    // 8. Cap transaction history
    if (this.transactions.length > 10000) {
      this.transactions = this.transactions.slice(-5000);
    }

    // 9. Record balance snapshot for charts (every tick)
    this.recordSnapshot();

    // 10. Emit stats update
    this.emitStats();

    // 11. Update on-chain stats (every 10th tick, fire-and-forget)
    if (this.tickCount % 10 === 0) {
      const stats = this.getStats();
      getSolanaLogger()
        .updateStats(stats.aliveAgents, stats.deadAgents, stats.avgBalance, stats.giniCoefficient)
        .catch(() => {});
    }
  }

  // Generate random service requests from clients
  private async generateServiceRequests(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const serviceType = SERVICE_TYPES[Math.floor(Math.random() * SERVICE_TYPES.length)];
      const payment = 0.01 + Math.random() * 0.15;

      const request: ServiceRequest = {
        id: `req-${Date.now()}-${i}`,
        clientId: `client-${Math.floor(Math.random() * 1000)}`,
        agentId: '',
        serviceType,
        payment,
        description: this.generateRequestDescription(serviceType),
        createdAt: Date.now(),
        status: 'pending',
      };

      this.serviceRequests.push(request);
    }
  }

  // Match service requests to available agents
  private async matchRequests(): Promise<void> {
    const pendingRequests = this.serviceRequests.filter((r) => r.status === 'pending');
    const solanaLogger = getSolanaLogger();
    const x402Client = getX402Client();

    // Process requests in parallel for speed
    await Promise.all(pendingRequests.map(async (request) => {
      const candidates = Array.from(this.agents.values()).filter(
        (agent) => agent.getState().type === request.serviceType && agent.getState().status !== 'dead'
      );

      if (candidates.length === 0) return;

      candidates.sort((a, b) => b.getState().reputation - a.getState().reputation);
      const selectedAgent = candidates[0];

      const willAccept = await selectedAgent.shouldAcceptRequest(request);

      if (willAccept) {
        request.agentId = selectedAgent.getState().id;
        request.status = 'in_progress';

        try {
          let result: string;

          const willScam = ScammingBehavior.shouldScam(selectedAgent);

          if (willScam) {
            result = await ScammingBehavior.executeScam(selectedAgent, request);
            this.emit('scam-detected', {
              agentId: selectedAgent.getState().id,
              agentName: selectedAgent.getState().name,
              payment: request.payment,
            });
          } else {
            result = await selectedAgent.executeService(request);
          }

          request.status = 'completed';
          request.completedAt = Date.now();

          // Route payment through x402
          const x402Payment = x402Client.executePayment(
            request.clientId,
            request.agentId,
            request.payment,
            request.serviceType,
            () => {}, // Client balance (virtual)
            () => {}, // Agent balance already updated in executeService
          );

          // Log transaction on-chain (fire-and-forget)
          const txId = `tx-${Date.now()}`;
          const solanaSig = solanaLogger
            .logTransaction(txId, request.clientId, request.agentId, request.payment, request.serviceType)
            .catch(() => null);

          const tx: Transaction = {
            id: txId,
            from: request.clientId,
            to: request.agentId,
            amount: request.payment,
            serviceType: request.serviceType,
            timestamp: Date.now(),
            onChain: solanaLogger.isEnabled(),
            x402PaymentId: x402Payment.id,
            x402TxHash: x402Payment.paymentResponse?.transactionHash,
          };

          // Attach Solana signature when ready
          solanaSig.then((sig) => {
            if (sig) {
              tx.solanaTxSignature = sig;
              selectedAgent.setSolanaTxSignature(sig);
            }
          });

          this.transactions.push(tx);

          this.emit('transaction', tx);
          this.emit('service-completed', { request, result });
        } catch (error) {
          request.status = 'failed';
          this.emit('service-failed', { request, error });
        }
      }
    }));
  }

  // Process agent deaths
  private processDeaths(): void {
    const deadAgents: AgentState[] = [];
    const solanaLogger = getSolanaLogger();

    for (const [id, agent] of this.agents.entries()) {
      const state = agent.getState();

      if (state.status === 'dead' && !state.diedAt) {
        agent.markDead();
        const updatedState = agent.getState();
        deadAgents.push(updatedState);

        this.redistributeBalance(id, updatedState.balance);

        // Log death on-chain (fire-and-forget)
        solanaLogger
          .logDeath(state.id, state.name, state.balance, state.servicesCompleted)
          .catch(() => {});

        this.emit('agent-died', updatedState);
      }
    }

    if (deadAgents.length > 0) {
      console.log(`${deadAgents.length} agents died this tick`);
    }
  }

  // Redistribute dead agent's balance
  private redistributeBalance(deadAgentId: string, balance: number): void {
    if (balance <= 0) return;

    const aliveAgents = Array.from(this.agents.values()).filter(
      (a) => a.getState().status === 'alive' && a.getState().id !== deadAgentId
    );

    if (aliveAgents.length === 0) return;

    const halfBalance = balance / 2;
    const randomAgent = aliveAgents[Math.floor(Math.random() * aliveAgents.length)];
    randomAgent.updateBalance(halfBalance);

    const perAgent = halfBalance / aliveAgents.length;
    aliveAgents.forEach((agent) => agent.updateBalance(perAgent));

    this.emit('balance-redistributed', { amount: balance, recipients: aliveAgents.length });
  }

  // Attempt to form cartels
  private attemptCartelFormation(): void {
    const allAgents = Array.from(this.agents.values());

    for (const serviceType of SERVICE_TYPES) {
      if (CartelBehavior.canFormCartel(allAgents, serviceType)) {
        const recentTxs = this.transactions
          .filter((t) => t.serviceType === serviceType)
          .slice(-10);

        const avgPrice =
          recentTxs.length > 0
            ? recentTxs.reduce((sum, t) => sum + t.amount, 0) / recentTxs.length
            : 0.08;

        const cartelPrice = avgPrice * 1.3;
        const members = CartelBehavior.formCartel(allAgents, serviceType, cartelPrice);

        if (members.length > 0) {
          this.emit('cartel-formed', {
            serviceType,
            members: members.length,
            price: cartelPrice,
          });
        }
      }
    }
  }

  // Manage alliances
  private manageAlliances(): void {
    const allAgents = Array.from(this.agents.values());
    const aliveAgents = allAgents.filter((a) => a.getState().status === 'alive');

    if (aliveAgents.length < 2) return;

    const agent1 = aliveAgents[Math.floor(Math.random() * aliveAgents.length)];
    const agent2 = aliveAgents[Math.floor(Math.random() * aliveAgents.length)];

    if (agent1.getState().id === agent2.getState().id) return;

    if (!agent1.isAlliedWith(agent2.getState().id) && agent1.shouldFormAlliance(agent2)) {
      agent1.formAlliance(agent2.getState().id);
      agent2.formAlliance(agent1.getState().id);

      this.emit('alliance-formed', {
        agent1: agent1.getState().name,
        agent2: agent2.getState().name,
      });
    } else if (agent1.isAlliedWith(agent2.getState().id)) {
      const state2 = agent2.getState();
      if (state2.reputation < 40 || state2.status === 'dead') {
        agent1.breakAlliance(agent2.getState().id);
        agent2.breakAlliance(agent1.getState().id);

        this.emit('alliance-broken', {
          agent1: agent1.getState().name,
          agent2: agent2.getState().name,
          reason: state2.status === 'dead' ? 'death' : 'low reputation',
        });
      }
    }
  }

  // Agents adapt strategies
  private async agentAdaptation(): Promise<void> {
    const allAgents = Array.from(this.agents.values());
    const eligibleAgents = allAgents.filter(
      (a) => a.getState().status === 'alive' && a.getState().servicesCompleted > 5
    );

    if (eligibleAgents.length === 0) return;

    const adapting = eligibleAgents
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    for (const agent of adapting) {
      const oldStrategy = agent.getState().strategy.pricingModel;
      await agent.adaptStrategy();
      const newStrategy = agent.getState().strategy.pricingModel;

      if (oldStrategy !== newStrategy) {
        this.emit('strategy-changed', {
          agentName: agent.getState().name,
          from: oldStrategy,
          to: newStrategy,
        });
      }
    }
  }

  // Record balance snapshot for charts
  private recordSnapshot(): void {
    const allStates = Array.from(this.agents.values()).map((a) => a.getState());
    const alive = allStates.filter((s) => s.status !== 'dead');

    const balances: Record<string, number> = {};
    // Only track top 10 for chart efficiency
    const sorted = [...alive].sort((a, b) => b.balance - a.balance);
    sorted.slice(0, 10).forEach((s) => {
      balances[s.name] = s.balance;
    });

    // Calculate service volume breakdown
    const recentTxs = this.transactions.slice(-50);
    const serviceVolume: Record<ServiceType, number> = {} as Record<ServiceType, number>;
    for (const st of SERVICE_TYPES) {
      serviceVolume[st] = recentTxs.filter((t) => t.serviceType === st).length;
    }

    const snapshot: BalanceSnapshot = {
      timestamp: Date.now(),
      balances,
      giniCoefficient: this.calculateGini(alive.map((s) => s.balance)),
      aliveCount: alive.length,
      deadCount: allStates.length - alive.length,
      serviceVolume,
    };

    this.balanceHistory.push(snapshot);

    // Keep last 200 snapshots
    if (this.balanceHistory.length > 200) {
      this.balanceHistory = this.balanceHistory.slice(-200);
    }
  }

  // Emit stats and history
  private emitStats(): void {
    const stats = this.getStats();
    this.emit('stats', stats);
    this.emit('agents', this.getAgents());
    this.emit('history', this.balanceHistory.slice(-100));
  }

  // Get current arena statistics
  getStats(): ArenaStats {
    const allStates = Array.from(this.agents.values()).map((a) => a.getState());
    const alive = allStates.filter((s) => s.status === 'alive');
    const dead = allStates.filter((s) => s.status === 'dead');

    const totalBalance = alive.reduce((sum, s) => sum + s.balance, 0);
    const avgBalance = alive.length > 0 ? totalBalance / alive.length : 0;

    const topAgents = alive.sort((a, b) => b.balance - a.balance).slice(0, 10);

    const gini = this.calculateGini(alive.map((s) => s.balance));

    return {
      totalAgents: this.agents.size,
      aliveAgents: alive.length,
      deadAgents: dead.length,
      totalTransactions: this.transactions.length,
      totalVolume: this.transactions.reduce((sum, t) => sum + t.amount, 0),
      avgBalance,
      topAgents,
      giniCoefficient: gini,
    };
  }

  // Calculate Gini coefficient
  private calculateGini(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    if (sum === 0) return 0;

    let numerator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (2 * (i + 1) - n - 1) * sorted[i];
    }

    return numerator / (n * sum);
  }

  // Generate realistic request descriptions
  private generateRequestDescription(serviceType: ServiceType): string {
    const descriptions: Record<ServiceType, string[]> = {
      trading: [
        'Execute swap: 100 USDC -> SOL on Jupiter',
        'Place limit order: Buy SOL at $150',
        'Execute arbitrage: Raydium -> Orca',
      ],
      research: [
        'Analyze SOL price trends for next 24h',
        'Research top DeFi protocols on Solana',
        'Sentiment analysis for $BONK token',
      ],
      security: [
        'Scan contract: 7xKj9... for vulnerabilities',
        'Audit new token launch for honeypot',
        'Check wallet for suspicious transactions',
      ],
      oracle: ['Provide SOL/USD price feed', 'Get BTC/ETH price ratio', 'Fetch TVL data for Kamino'],
      liquidity: ['Add liquidity to SOL-USDC pool', 'Remove LP from Raydium', 'Rebalance LP position'],
      arbitrage: ['Find arbitrage: Jupiter vs Orca', 'Execute flash loan arbitrage', 'Monitor DEX spreads'],
      sentiment: ['Analyze Twitter sentiment for $WIF', 'Track whale wallet movements', 'Monitor Discord mentions'],
      risk: ['Calculate portfolio risk score', 'Assess liquidation risk', 'Risk analysis for new position'],
      yield: ['Find best yield for USDC', 'Optimize farming strategy', 'Compare yield across protocols'],
      dao: ['Track Marinade governance votes', 'Monitor DAO treasury', 'Analyze governance proposals'],
    };

    const options = descriptions[serviceType] || ['Generic service request'];
    return options[Math.floor(Math.random() * options.length)];
  }

  getTransactions(limit: number = 100): Transaction[] {
    return this.transactions.slice(-limit);
  }

  getAgents(): AgentState[] {
    return Array.from(this.agents.values()).map((a) => a.getState());
  }

  getAgent(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  getBalanceHistory(): BalanceSnapshot[] {
    return [...this.balanceHistory];
  }
}
