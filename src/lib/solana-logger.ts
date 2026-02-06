// Solana Logger - Real Anchor client for on-chain logging

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as fs from 'fs';

const PROGRAM_ID_STR = process.env.ARENA_PROGRAM_ID || 'ArenaLog11111111111111111111111111111111111';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const LOGGING_ENABLED = process.env.SOLANA_LOGGING_ENABLED === 'true';
const WALLET_PATH = process.env.SOLANA_WALLET_PATH || `${process.env.HOME}/.config/solana/id.json`;
const ARENA_ID = process.env.ARENA_ID || 'agentswarm-arena-v1';

export class SolanaLogger {
  private connection: Connection;
  private enabled: boolean;
  private programId: PublicKey;
  private wallet: Keypair | null = null;
  private arenaInitialized: boolean = false;
  private arenaPda: PublicKey | null = null;
  private txCount: number = 0;

  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed');
    this.programId = new PublicKey(PROGRAM_ID_STR);
    this.enabled = LOGGING_ENABLED;

    // Load wallet if available
    if (this.enabled) {
      try {
        // Try env var first (for Vercel/serverless), then file
        const walletKeyEnv = process.env.SOLANA_WALLET_KEY;
        let walletData: number[];
        if (walletKeyEnv) {
          walletData = JSON.parse(walletKeyEnv);
        } else {
          walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
        }
        this.wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
        console.log(`[Solana] Wallet loaded: ${this.wallet.publicKey.toString()}`);
      } catch {
        console.warn('[Solana] No wallet found, falling back to simulation mode');
        this.enabled = false;
      }
    }

    // Derive arena PDA
    const [arenaPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('arena'), Buffer.from(ARENA_ID)],
      this.programId,
    );
    this.arenaPda = arenaPda;

    if (this.enabled) {
      console.log('[Solana] On-chain logging ENABLED');
      console.log(`  RPC: ${RPC_URL}`);
      console.log(`  Program: ${PROGRAM_ID_STR}`);
      console.log(`  Arena PDA: ${arenaPda.toString()}`);
      this.initializeArena().catch((err) =>
        console.error('[Solana] Arena init error:', err.message),
      );
    } else {
      console.log('[Solana] Logging in SIMULATION mode (set SOLANA_LOGGING_ENABLED=true to enable)');
    }
  }

  private async initializeArena(): Promise<void> {
    if (!this.enabled || !this.wallet) return;

    try {
      // Check if arena account already exists
      const info = await this.connection.getAccountInfo(this.arenaPda!);
      if (info) {
        this.arenaInitialized = true;
        console.log('[Solana] Arena account already initialized');
        return;
      }

      // Build initialize_arena instruction manually
      // Using raw transaction since we may not have the IDL loaded
      const { Transaction, SystemProgram } = await import('@solana/web3.js');

      // Anchor discriminator for initialize_arena
      const { createHash } = await import('crypto');
      const discriminator = createHash('sha256')
        .update('global:initialize_arena')
        .digest()
        .slice(0, 8);

      const arenaIdBytes = Buffer.from(ARENA_ID);
      const arenaIdLen = Buffer.alloc(4);
      arenaIdLen.writeUInt32LE(arenaIdBytes.length);

      const data = Buffer.concat([discriminator, arenaIdLen, arenaIdBytes]);

      const [arenaPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('arena'), Buffer.from(ARENA_ID)],
        this.programId,
      );

      const ix = {
        keys: [
          { pubkey: arenaPda, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data,
      };

      const tx = new Transaction().add(ix);
      tx.feePayer = this.wallet.publicKey;
      tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      tx.sign(this.wallet);
      const sig = await this.connection.sendRawTransaction(tx.serialize());
      await this.connection.confirmTransaction(sig, 'confirmed');

      this.arenaInitialized = true;
      console.log(`[Solana] Arena initialized! Tx: ${sig}`);
    } catch (error: any) {
      // Account may already exist
      if (error.message?.includes('already in use')) {
        this.arenaInitialized = true;
        console.log('[Solana] Arena account already exists');
      } else {
        console.error('[Solana] Failed to initialize arena:', error.message);
      }
    }
  }

  async logTransaction(
    transactionId: string,
    fromAgent: string,
    toAgent: string,
    amount: number,
    serviceType: string,
  ): Promise<string | null> {
    this.txCount++;

    if (!this.enabled || !this.wallet) {
      // Simulation mode - return a simulated signature for UI display
      const simSig = `sim_${Date.now().toString(36)}_${this.txCount}`;
      return simSig;
    }

    try {
      const { Transaction, SystemProgram } = await import('@solana/web3.js');
      const { createHash } = await import('crypto');

      // Anchor discriminator for log_transaction
      const discriminator = createHash('sha256')
        .update('global:log_transaction')
        .digest()
        .slice(0, 8);

      // Encode instruction data
      const txIdBytes = Buffer.from(transactionId.slice(0, 50));
      const fromBytes = Buffer.from(fromAgent.slice(0, 50));
      const toBytes = Buffer.from(toAgent.slice(0, 50));
      const serviceBytes = Buffer.from(serviceType.slice(0, 20));

      const amountLamports = BigInt(Math.floor(amount * 1_000_000_000));
      const amountBuf = Buffer.alloc(8);
      amountBuf.writeBigUInt64LE(amountLamports);

      const encodeString = (buf: Buffer) => {
        const len = Buffer.alloc(4);
        len.writeUInt32LE(buf.length);
        return Buffer.concat([len, buf]);
      };

      const data = Buffer.concat([
        discriminator,
        encodeString(txIdBytes),
        encodeString(fromBytes),
        encodeString(toBytes),
        amountBuf,
        encodeString(serviceBytes),
      ]);

      // Derive transaction PDA
      const [txPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('transaction'), Buffer.from(transactionId.slice(0, 50))],
        this.programId,
      );

      const ix = {
        keys: [
          { pubkey: txPda, isSigner: false, isWritable: true },
          { pubkey: this.arenaPda!, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data,
      };

      const tx = new Transaction().add(ix);
      tx.feePayer = this.wallet.publicKey;
      tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      tx.sign(this.wallet);
      const sig = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });

      // Don't await confirmation to avoid blocking
      this.connection.confirmTransaction(sig, 'confirmed').catch(() => {});

      return sig;
    } catch (error: any) {
      console.error(`[Solana] Failed to log transaction: ${error.message}`);
      return `sim_err_${Date.now().toString(36)}`;
    }
  }

  async logDeath(
    agentId: string,
    agentName: string,
    finalBalance: number,
    servicesCompleted: number,
  ): Promise<string | null> {
    if (!this.enabled || !this.wallet) {
      return `sim_death_${Date.now().toString(36)}`;
    }

    try {
      const { Transaction, SystemProgram } = await import('@solana/web3.js');
      const { createHash } = await import('crypto');

      const discriminator = createHash('sha256')
        .update('global:log_death')
        .digest()
        .slice(0, 8);

      const agentIdBytes = Buffer.from(agentId.slice(0, 50));
      const nameBytes = Buffer.from(agentName.slice(0, 50));

      const balanceLamports = BigInt(Math.floor(finalBalance * 1_000_000_000));
      const balanceBuf = Buffer.alloc(8);
      balanceBuf.writeBigUInt64LE(balanceLamports);

      const servicesBuf = Buffer.alloc(4);
      servicesBuf.writeUInt32LE(servicesCompleted);

      const encodeString = (buf: Buffer) => {
        const len = Buffer.alloc(4);
        len.writeUInt32LE(buf.length);
        return Buffer.concat([len, buf]);
      };

      const data = Buffer.concat([
        discriminator,
        encodeString(agentIdBytes),
        encodeString(nameBytes),
        balanceBuf,
        servicesBuf,
      ]);

      const [deathPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('death'), Buffer.from(agentId.slice(0, 50))],
        this.programId,
      );

      const ix = {
        keys: [
          { pubkey: deathPda, isSigner: false, isWritable: true },
          { pubkey: this.arenaPda!, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data,
      };

      const tx = new Transaction().add(ix);
      tx.feePayer = this.wallet.publicKey;
      tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      tx.sign(this.wallet);
      const sig = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });

      this.connection.confirmTransaction(sig, 'confirmed').catch(() => {});
      return sig;
    } catch (error: any) {
      console.error(`[Solana] Failed to log death: ${error.message}`);
      return `sim_death_err_${Date.now().toString(36)}`;
    }
  }

  async updateStats(
    aliveAgents: number,
    deadAgents: number,
    avgBalance: number,
    gini: number,
  ): Promise<string | null> {
    if (!this.enabled || !this.wallet) {
      return null;
    }

    try {
      const { Transaction } = await import('@solana/web3.js');
      const { createHash } = await import('crypto');

      const discriminator = createHash('sha256')
        .update('global:update_stats')
        .digest()
        .slice(0, 8);

      const aliveBuf = Buffer.alloc(4);
      aliveBuf.writeUInt32LE(aliveAgents);

      const deadBuf = Buffer.alloc(4);
      deadBuf.writeUInt32LE(deadAgents);

      const avgBuf = Buffer.alloc(8);
      avgBuf.writeBigUInt64LE(BigInt(Math.floor(avgBalance * 1_000_000_000)));

      const giniBuf = Buffer.alloc(2);
      giniBuf.writeUInt16LE(Math.floor(gini * 100));

      const data = Buffer.concat([discriminator, aliveBuf, deadBuf, avgBuf, giniBuf]);

      const ix = {
        keys: [
          { pubkey: this.arenaPda!, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        ],
        programId: this.programId,
        data,
      };

      const tx = new Transaction().add(ix);
      tx.feePayer = this.wallet.publicKey;
      tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      tx.sign(this.wallet);
      const sig = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });

      this.connection.confirmTransaction(sig, 'confirmed').catch(() => {});
      return sig;
    } catch (error: any) {
      console.error(`[Solana] Failed to update stats: ${error.message}`);
      return null;
    }
  }

  getExplorerUrl(signature: string): string {
    if (signature.startsWith('sim_')) {
      return ''; // No explorer link for simulated transactions
    }
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getProgramId(): string {
    return PROGRAM_ID_STR;
  }

  getArenaPda(): string {
    return this.arenaPda?.toString() || '';
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
