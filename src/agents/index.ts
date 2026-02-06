// Agent Factory - Creates agents of different types

import { BaseAgent } from './BaseAgent';
import { TraderAgent } from './TraderAgent';
import { SecurityAgent } from './SecurityAgent';
import { ResearchAgent } from './ResearchAgent';
import { ServiceType } from '../types/agent';

export function createAgent(id: string, type: ServiceType, initialBalance: number = 1.0): BaseAgent {
  switch (type) {
    case 'trading':
      return new TraderAgent(id, type, initialBalance);
    case 'security':
      return new SecurityAgent(id, type, initialBalance);
    case 'research':
      return new ResearchAgent(id, type, initialBalance);
    // Add more agent types as needed
    default:
      return new BaseAgent(id, type, initialBalance);
  }
}

export { BaseAgent, TraderAgent, SecurityAgent, ResearchAgent };
