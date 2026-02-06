// Solana Logger SDK - Log arena events on-chain

import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';

const PROGRAM_ID = new PublicKey('ArenaLog11111111111111111111111111111111111');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const LOGGING_ENABLED = process.env.SOLANA_LOGGING_ENABLED === 'true';

export class SolanaLogger {
  private connection: Connection;
  private enabled: boolean;
  private programId: PublicKey;

  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed');
    this.programId = PROGRAM_ID;

    // Enable if SOLANA_LOGGING_ENABLED=true in .env
    this.enabled = LOGGING_ENABLED;

    if (this.enabled) {
      console.log('🔗 Solana on-chain logging ENABLED');
      console.log(`   RPC: ${RPC_URL}`);
      console.log(`   Program: ${PROGRAM_ID.toString()}`);
    } else {
      console.log('📝 Solana logging in SIMULATION mode (set SOLANA_LOGGING_ENABLED=true to enable)');
    }
  }

  async logTransaction(
    transactionId: string,
    fromAgent: string,
    toAgent: string,
    amount: number,
    serviceType: string
  ): Promise<string | null> {
    if (!this.enabled) {
      console.log(`[Solana Logger Disabled] Would log: ${transactionId}`);
      return null;
    }

    try {
      // In production, this would send real transaction to Solana
      // For now, we log the intent
      console.log(`[Solana] Logging transaction ${transactionId}: ${fromAgent} -> ${toAgent}`);

      // TODO: Implement actual Solana transaction when wallet is configured
      // const tx = await program.methods
      //   .logTransaction(transactionId, fromAgent, toAgent, amount, serviceType)
      //   .rpc();

      return `simulated-tx-${Date.now()}`;
    } catch (error) {
      console.error('Failed to log transaction on-chain:', error);
      return null;
    }
  }

  async logDeath(
    agentId: string,
    agentName: string,
    finalBalance: number,
    servicesCompleted: number
  ): Promise<string | null> {
    if (!this.enabled) {
      console.log(`[Solana Logger Disabled] Would log death: ${agentName}`);
      return null;
    }

    try {
      console.log(`[Solana] Logging agent death: ${agentName}`);
      return `simulated-death-${Date.now()}`;
    } catch (error) {
      console.error('Failed to log death on-chain:', error);
      return null;
    }
  }

  async updateStats(
    aliveAgents: number,
    deadAgents: number,
    avgBalance: number,
    gini: number
  ): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      console.log(`[Solana] Updating stats: ${aliveAgents} alive, ${deadAgents} dead`);
      return `simulated-stats-${Date.now()}`;
    } catch (error) {
      console.error('Failed to update stats on-chain:', error);
      return null;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
let loggerInstance: SolanaLogger | null = null;

export function getSolanaLogger(): SolanaLogger {
  if (!loggerInstance) {
    loggerInstance = new SolanaLogger();
  }
  return loggerInstance;
}
