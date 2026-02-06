// Memorable themed names for agents - makes events shareable and engaging

import { ServiceType } from '../types/agent';

const NAMES_BY_TYPE: Record<ServiceType, string[]> = {
  trading: [
    'WolfOfSOL', 'DexHunter', 'SwapKing', 'JupiterJack', 'TradeReaper',
    'AlphaSeeker', 'MarketMaker', 'FlipMaster', 'TokenHawk', 'ProfitPirate',
  ],
  research: [
    'DataOracle', 'ChainSleuth', 'AlphaDigger', 'InsightBot', 'DeepDive',
    'MetricMind', 'TrendHunter', 'AnalystAce', 'MarketSage', 'TokenScout',
  ],
  security: [
    'AuditEagle', 'BugHunter', 'ShieldAgent', 'GuardianX', 'RugDetector',
    'SafetyFirst', 'ExploitBane', 'CodeAuditor', 'FortKnox', 'HoneyTrap',
  ],
  oracle: [
    'PriceWhisper', 'DataStream', 'FeedMaster', 'PythonEye', 'OracleX',
    'TruthTeller', 'PriceSeer', 'DataPulse', 'ChainEye', 'InfoBridge',
  ],
  liquidity: [
    'PoolShark', 'LPKing', 'DepthMaker', 'LiquidGold', 'FlowMaster',
    'PoolWhale', 'YieldPool', 'DeepPool', 'TideRider', 'LiquidAce',
  ],
  arbitrage: [
    'SpreadHunter', 'ArbBot', 'GapFinder', 'PriceGap', 'FlashArb',
    'CrossDex', 'ArbKing', 'SpreadEagle', 'DeltaBot', 'GapTrader',
  ],
  sentiment: [
    'MoodReader', 'VibeCheck', 'SocialPulse', 'CTScanner', 'HypeDetector',
    'FUDFighter', 'TrendSense', 'BuzzTracker', 'SentimentX', 'MoodBot',
  ],
  risk: [
    'RiskRadar', 'HedgeMaster', 'SafeCalc', 'RiskMatrix', 'ShieldCalc',
    'VaRBot', 'DrawdownWatch', 'RiskPulse', 'SafeHaven', 'RiskSage',
  ],
  yield: [
    'YieldFarmer', 'APYHunter', 'HarvestBot', 'YieldMax', 'FarmKing',
    'CompoundX', 'StakeKing', 'YieldWolf', 'RewardHunter', 'FarmAce',
  ],
  dao: [
    'GovTracker', 'VoteWatcher', 'DAOPulse', 'ProposalBot', 'GovernorX',
    'VoteOracle', 'DAOGuard', 'CouncilBot', 'QuorumWatch', 'GovSage',
  ],
};

// Track used names to avoid duplicates in a session
const usedNames = new Set<string>();

export function getAgentName(type: ServiceType, agentId: string): string {
  const names = NAMES_BY_TYPE[type] || [];

  // Find an unused name
  for (const name of names) {
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }

  // All themed names used, create a variant
  const baseName = names[Math.floor(Math.random() * names.length)] || type;
  const suffix = agentId.slice(-3).toUpperCase();
  const variant = `${baseName}_${suffix}`;
  usedNames.add(variant);
  return variant;
}

export function resetNames(): void {
  usedNames.clear();
}
