'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { AgentState } from '@/types/agent';

interface BetPanelProps {
  agents: AgentState[];
}

// Arena treasury — derived from deployed Anchor program on devnet
const ARENA_PROGRAM_ID = new PublicKey('2ZoSk1adD16aXyXYsornCS8qao2hYb6KSkqyCuYNeKKc');
const [ARENA_WALLET] = PublicKey.findProgramAddressSync(
  [Buffer.from('arena'), Buffer.from('agentswarm-arena-v1')],
  ARENA_PROGRAM_ID,
);

export function BetPanel({ agents }: BetPanelProps) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('0.01');
  const [status, setStatus] = useState<string>('');
  const [bets, setBets] = useState<Array<{ agent: string; amount: number; tx: string }>>([]);

  const aliveAgents = agents.filter((a) => a.status !== 'dead').sort((a, b) => b.balance - a.balance);

  const placeBet = async () => {
    if (!publicKey || !selectedAgent || !betAmount) return;

    setStatus('Processing...');

    try {
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const amount = parseFloat(betAmount);

      if (amount <= 0 || amount > 1) {
        setStatus('Bet must be between 0.001 and 1 SOL');
        return;
      }

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: ARENA_WALLET,
          lamports: Math.floor(amount * LAMPORTS_PER_SOL),
        }),
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      const agentName = aliveAgents.find((a) => a.id === selectedAgent)?.name || selectedAgent;
      setBets((prev) => [{ agent: agentName, amount, tx: signature }, ...prev]);
      setStatus(`Bet placed! ${amount} SOL on ${agentName}`);
    } catch (error: any) {
      setStatus(`Failed: ${error.message?.slice(0, 50)}`);
    }
  };

  return (
    <div className="terminal-border p-4">
      <h2 className="text-xl font-bold mb-4">BET ON AGENTS</h2>

      <div className="mb-4">
        <WalletMultiButton style={{
          backgroundColor: '#166534',
          fontSize: '0.875rem',
          height: '2.25rem',
          borderRadius: '0.5rem',
        }} />
      </div>

      {connected && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-green-500/70 block mb-1">Pick Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full bg-black border border-green-500/30 text-green-400 text-sm px-2 py-1.5 rounded"
            >
              <option value="">Select agent...</option>
              {aliveAgents.slice(0, 20).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.balance.toFixed(2)} SOL)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-green-500/70 block mb-1">Amount (devnet SOL)</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              min="0.001"
              max="1"
              step="0.01"
              className="w-full bg-black border border-green-500/30 text-green-400 text-sm px-2 py-1.5 rounded"
            />
          </div>

          <button
            onClick={placeBet}
            disabled={!selectedAgent || !betAmount}
            className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-900/30 disabled:text-green-500/30 text-black font-bold rounded transition-colors text-sm"
          >
            PLACE BET
          </button>

          {status && (
            <div className="text-xs text-yellow-400 animate-fadeIn">{status}</div>
          )}
        </div>
      )}

      {!connected && (
        <div className="text-xs text-green-500/50 text-center py-4">
          Connect wallet to bet on agents (devnet SOL)
        </div>
      )}

      {bets.length > 0 && (
        <div className="mt-4 pt-4 border-t border-green-500/20">
          <div className="text-xs text-green-500/70 mb-2">Your Bets</div>
          {bets.map((bet, i) => (
            <div key={i} className="text-xs py-1 flex justify-between">
              <span>{bet.agent}</span>
              <span className="text-yellow-400">{bet.amount} SOL</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
