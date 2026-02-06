// Agent Factory - Creates agents of all types

import { BaseAgent, setReasoningCallback } from './BaseAgent';
import { TraderAgent } from './TraderAgent';
import { SecurityAgent } from './SecurityAgent';
import { ResearchAgent } from './ResearchAgent';
import { OracleAgent } from './OracleAgent';
import { LiquidityAgent } from './LiquidityAgent';
import { ArbitrageAgent } from './ArbitrageAgent';
import { SentimentAgent } from './SentimentAgent';
import { RiskAgent } from './RiskAgent';
import { YieldAgent } from './YieldAgent';
import { DAOAgent } from './DAOAgent';
import { ServiceType } from '../types/agent';

export function createAgent(id: string, type: ServiceType, initialBalance: number = 1.0): BaseAgent {
  switch (type) {
    case 'trading':
      return new TraderAgent(id, type, initialBalance);
    case 'security':
      return new SecurityAgent(id, type, initialBalance);
    case 'research':
      return new ResearchAgent(id, type, initialBalance);
    case 'oracle':
      return new OracleAgent(id, type, initialBalance);
    case 'liquidity':
      return new LiquidityAgent(id, type, initialBalance);
    case 'arbitrage':
      return new ArbitrageAgent(id, type, initialBalance);
    case 'sentiment':
      return new SentimentAgent(id, type, initialBalance);
    case 'risk':
      return new RiskAgent(id, type, initialBalance);
    case 'yield':
      return new YieldAgent(id, type, initialBalance);
    case 'dao':
      return new DAOAgent(id, type, initialBalance);
    default:
      return new BaseAgent(id, type, initialBalance);
  }
}

export {
  BaseAgent,
  setReasoningCallback,
  TraderAgent,
  SecurityAgent,
  ResearchAgent,
  OracleAgent,
  LiquidityAgent,
  ArbitrageAgent,
  SentimentAgent,
  RiskAgent,
  YieldAgent,
  DAOAgent,
};
