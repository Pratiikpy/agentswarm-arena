// Core Agent Types for AgentSwarm Arena

export type AgentStatus = 'alive' | 'critical' | 'dead';

export type ServiceType =
  | 'trading'
  | 'research'
  | 'security'
  | 'oracle'
  | 'liquidity'
  | 'arbitrage'
  | 'sentiment'
  | 'risk'
  | 'yield'
  | 'dao';

export interface AgentState {
  id: string;
  type: ServiceType;
  name: string;
  balance: number; // SOL balance
  status: AgentStatus;
  reputation: number; // 0-100
  servicesCompleted: number;
  servicesRequested: number;
  earnings: number;
  expenses: number;
  createdAt: number;
  diedAt?: number;
  strategy: AgentStrategy;
}

export interface AgentStrategy {
  pricingModel: 'aggressive' | 'balanced' | 'premium';
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  qualityFocus: number; // 0-1 (0 = speed, 1 = quality)
  allianceThreshold: number; // Min reputation to partner with
  riskTolerance: number; // 0-1 (0 = safe, 1 = risky)
}

export interface ServiceRequest {
  id: string;
  clientId: string;
  agentId: string;
  serviceType: ServiceType;
  payment: number;
  description: string;
  createdAt: number;
  completedAt?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  serviceType: ServiceType;
  timestamp: number;
  txHash?: string;
  onChain: boolean;
}

export interface ArenaStats {
  totalAgents: number;
  aliveAgents: number;
  deadAgents: number;
  totalTransactions: number;
  totalVolume: number; // Total SOL moved
  avgBalance: number;
  topAgents: AgentState[];
  giniCoefficient: number; // Wealth inequality measure
}
