// Sentiment Agent - Analyzes social sentiment

import { BaseAgent } from './BaseAgent';
import { ServiceRequest } from '../types/agent';

export class SentimentAgent extends BaseAgent {
  async executeService(request: ServiceRequest): Promise<string> {
    const analysis = await this.makeDecision(
      `Client requests sentiment analysis: ${request.description}
       Payment: ${request.payment} SOL

       Analyze social sentiment:
       1. Overall sentiment (bullish/bearish)
       2. Key influencers
       3. Risk signals

       Keep response under 80 words.`
    );

    this.state.servicesCompleted++;
    this.updateBalance(request.payment);
    this.updateReputation(1);

    return `SENTIMENT ANALYSIS\n\n${analysis}\n\nAgent: ${this.state.name}\nBalance: ${this.state.balance.toFixed(3)} SOL`;
  }
}
