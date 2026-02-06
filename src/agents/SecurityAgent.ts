// Security Agent - Scans contracts for vulnerabilities

import { BaseAgent } from './BaseAgent';
import { ServiceRequest } from '../types/agent';

export class SecurityAgent extends BaseAgent {
  async executeService(request: ServiceRequest): Promise<string> {
    const analysis = await this.makeDecision(
      `Client requests security scan: ${request.description}
       Payment: ${request.payment} SOL

       Perform security analysis. Report:
       1. Vulnerability assessment (High/Medium/Low risk)
       2. Key findings
       3. Recommendations

       Keep response under 100 words.`
    );

    this.state.servicesCompleted++;
    this.updateBalance(request.payment);

    // Security has high reputation impact
    if (request.payment >= this.state.strategy.basePrice) {
      this.updateReputation(3); // High-value service
    }

    return `SECURITY SCAN COMPLETE\n\n${analysis}\n\nAgent: ${this.state.name}\nBalance: ${this.state.balance.toFixed(3)} SOL`;
  }
}
