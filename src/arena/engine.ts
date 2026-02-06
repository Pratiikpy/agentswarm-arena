// Arena Engine - Manages all agents, matches services, processes transactions

import { BaseAgent, createAgent } from '../agents';
import { ServiceType, ServiceRequest, Transaction, ArenaStats, AgentState } from '../types/agent';
import { EventEmitter } from 'events';
import { ScammingBehavior } from '../agents/behaviors/ScammingBehavior';
import { CartelBehavior } from '../agents/behaviors/CartelBehavior';

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

  constructor() {
    super();
    // Allow many concurrent SSE connections without warning
    this.setMaxListeners(50);
  }

  // Initialize arena with N agents
  async initialize(agentCount: number = 100): Promise<void> {
    console.log(`🏟️ Initializing arena with ${agentCount} agents...`);

    // Create agents with varied types
    for (let i = 0; i < agentCount; i++) {
      const type = SERVICE_TYPES[i % SERVICE_TYPES.length];
      const id = `agent-${Date.now()}-${i}`;
      const agent = createAgent(id, type, 1.0);

      this.agents.set(id, agent);
    }

    console.log(`✅ ${this.agents.size} agents created`);
    this.emit('initialized', { agentCount: this.agents.size });
  }

  // Start the arena (agents begin competing)
  start(): void {
    if (this.running) return;

    this.running = true;
    console.log('🚀 Arena started! Agents are now competing...');

    // Tick every 5 seconds
    this.tickInterval = setInterval(() => {
      this.tick().catch((err) => {
        console.error('Arena tick error:', err);
      });
    }, 5000);

    this.emit('started');
  }

  // Stop the arena
  stop(): void {
    this.running = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    console.log('⏸️ Arena stopped');
    this.emit('stopped');
  }

  // Main game loop tick
  private async tick(): Promise<void> {
    // 1. Generate random service requests
    await this.generateServiceRequests(5);

    // 2. Match requests to agents
    await this.matchRequests();

    // 2b. Clean up completed/failed requests to prevent memory leak
    this.serviceRequests = this.serviceRequests.filter(
      (r) => r.status === 'pending' || r.status === 'in_progress'
    );

    // 3. Process deaths
    this.processDeaths();

    // 4. Maintain cartels (break if members drop)
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

    // 8. Cap transaction history to prevent unbounded memory growth
    if (this.transactions.length > 10000) {
      this.transactions = this.transactions.slice(-5000);
    }

    // 9. Emit stats update
    this.emitStats();
  }

  // Generate random service requests from clients
  private async generateServiceRequests(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const serviceType = SERVICE_TYPES[Math.floor(Math.random() * SERVICE_TYPES.length)];
      const payment = 0.01 + Math.random() * 0.15; // 0.01-0.16 SOL

      const request: ServiceRequest = {
        id: `req-${Date.now()}-${i}`,
        clientId: `client-${Math.floor(Math.random() * 1000)}`,
        agentId: '', // Will be assigned
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

    for (const request of pendingRequests) {
      // Find agents of matching type that are alive
      const candidates = Array.from(this.agents.values()).filter(
        (agent) => agent.getState().type === request.serviceType && agent.getState().status !== 'dead'
      );

      if (candidates.length === 0) continue;

      // Pick agent with best reputation
      candidates.sort((a, b) => b.getState().reputation - a.getState().reputation);
      const selectedAgent = candidates[0];

      // Ask agent if they'll accept
      const willAccept = await selectedAgent.shouldAcceptRequest(request);

      if (willAccept) {
        request.agentId = selectedAgent.getState().id;
        request.status = 'in_progress';

        // Execute service (or scam!)
        try {
          let result: string;

          // Check if agent will scam
          const willScam = ScammingBehavior.shouldScam(selectedAgent);

          if (willScam) {
            // Agent scams the client!
            result = await ScammingBehavior.executeScam(selectedAgent, request);
            this.emit('scam-detected', {
              agentId: selectedAgent.getState().id,
              agentName: selectedAgent.getState().name,
              payment: request.payment,
            });
          } else {
            // Normal service execution
            result = await selectedAgent.executeService(request);
          }

          request.status = 'completed';
          request.completedAt = Date.now();

          // Record transaction
          const tx: Transaction = {
            id: `tx-${Date.now()}`,
            from: request.clientId,
            to: request.agentId,
            amount: request.payment,
            serviceType: request.serviceType,
            timestamp: Date.now(),
            onChain: false, // Will be logged to Solana later
          };

          this.transactions.push(tx);

          // Emit event
          this.emit('transaction', tx);
          this.emit('service-completed', { request, result });
        } catch (error) {
          request.status = 'failed';
          this.emit('service-failed', { request, error });
        }
      }
    }
  }

  // Process agent deaths
  private processDeaths(): void {
    const deadAgents: AgentState[] = [];

    for (const [id, agent] of this.agents.entries()) {
      const state = agent.getState();

      if (state.status === 'dead' && !state.diedAt) {
        // Mark the time of death on the actual agent state
        agent.markDead();

        // Get the updated state with diedAt set
        const updatedState = agent.getState();
        deadAgents.push(updatedState);

        // Redistribute balance
        this.redistributeBalance(id, updatedState.balance);

        this.emit('agent-died', updatedState);
      }
    }

    if (deadAgents.length > 0) {
      console.log(`⚰️ ${deadAgents.length} agents died this tick`);
    }
  }

  // Redistribute dead agent's balance
  private redistributeBalance(deadAgentId: string, balance: number): void {
    if (balance <= 0) return;

    const aliveAgents = Array.from(this.agents.values()).filter(
      (a) => a.getState().status === 'alive' && a.getState().id !== deadAgentId
    );

    if (aliveAgents.length === 0) return;

    // 50% to random alive agent, 50% distributed equally
    const halfBalance = balance / 2;
    const randomAgent = aliveAgents[Math.floor(Math.random() * aliveAgents.length)];
    randomAgent.updateBalance(halfBalance);

    const perAgent = halfBalance / aliveAgents.length;
    aliveAgents.forEach((agent) => agent.updateBalance(perAgent));

    this.emit('balance-redistributed', { amount: balance, recipients: aliveAgents.length });
  }

  // Attempt to form cartels for each service type
  private attemptCartelFormation(): void {
    const allAgents = Array.from(this.agents.values());

    for (const serviceType of SERVICE_TYPES) {
      // Check if cartel can be formed
      if (CartelBehavior.canFormCartel(allAgents, serviceType)) {
        // Get current market price for this service (average of recent transactions)
        const recentTxs = this.transactions
          .filter((t) => t.serviceType === serviceType)
          .slice(-10);

        const avgPrice =
          recentTxs.length > 0
            ? recentTxs.reduce((sum, t) => sum + t.amount, 0) / recentTxs.length
            : 0.08;

        // Set cartel price 30% above market
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

  // Manage alliance formation and breaking
  private manageAlliances(): void {
    const allAgents = Array.from(this.agents.values());
    const aliveAgents = allAgents.filter((a) => a.getState().status === 'alive');

    if (aliveAgents.length < 2) return;

    // Pick 2 random alive agents
    const agent1 = aliveAgents[Math.floor(Math.random() * aliveAgents.length)];
    const agent2 = aliveAgents[Math.floor(Math.random() * aliveAgents.length)];

    if (agent1.getState().id === agent2.getState().id) return;

    // Try to form alliance
    if (!agent1.isAlliedWith(agent2.getState().id) && agent1.shouldFormAlliance(agent2)) {
      agent1.formAlliance(agent2.getState().id);
      agent2.formAlliance(agent1.getState().id);

      this.emit('alliance-formed', {
        agent1: agent1.getState().name,
        agent2: agent2.getState().name,
      });
    }
    // Or break existing alliance (if reputation drops)
    else if (agent1.isAlliedWith(agent2.getState().id)) {
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

  // Agents adapt their strategies based on performance
  private async agentAdaptation(): Promise<void> {
    const allAgents = Array.from(this.agents.values());
    const eligibleAgents = allAgents.filter(
      (a) => a.getState().status === 'alive' && a.getState().servicesCompleted > 5
    );

    if (eligibleAgents.length === 0) return;

    // Pick 3 random agents to adapt
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

  // Emit current arena stats and agent list
  private emitStats(): void {
    const stats = this.getStats();
    this.emit('stats', stats);
    this.emit('agents', this.getAgents());
  }

  // Get current arena statistics
  getStats(): ArenaStats {
    const allStates = Array.from(this.agents.values()).map((a) => a.getState());
    const alive = allStates.filter((s) => s.status === 'alive');
    const dead = allStates.filter((s) => s.status === 'dead');

    const totalBalance = alive.reduce((sum, s) => sum + s.balance, 0);
    const avgBalance = alive.length > 0 ? totalBalance / alive.length : 0;

    // Top 10 agents by balance
    const topAgents = alive.sort((a, b) => b.balance - a.balance).slice(0, 10);

    // Calculate Gini coefficient (wealth inequality)
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

  // Calculate Gini coefficient for wealth distribution
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
        'Execute swap: 100 USDC → SOL on Jupiter',
        'Place limit order: Buy SOL at $150',
        'Execute arbitrage: Raydium → Orca',
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

  // Get all transactions (for livestream)
  getTransactions(limit: number = 100): Transaction[] {
    return this.transactions.slice(-limit);
  }

  // Get all agents
  getAgents(): AgentState[] {
    return Array.from(this.agents.values()).map((a) => a.getState());
  }
}
