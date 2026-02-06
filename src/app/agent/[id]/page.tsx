'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { AgentState, AgentEvent } from '@/types/agent';

interface AgentDetail {
  state: AgentState;
  eventHistory: AgentEvent[];
  alliances: string[];
}

export default function AgentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await fetch(`/api/agent/${id}`);
        if (res.ok) {
          setAgent(await res.json());
        }
      } catch {
        // Retry silently
      }
      setLoading(false);
    };

    fetchAgent();
    const interval = setInterval(fetchAgent, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading agent data...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-400">Agent not found</div>
          <Link href="/leaderboard" className="text-green-400 underline mt-4 block">
            Back to Leaderboard
          </Link>
        </div>
      </div>
    );
  }

  const { state, eventHistory, alliances } = agent;
  const statusColor = state.status === 'alive' ? 'text-green-400' : state.status === 'critical' ? 'text-yellow-400' : 'text-red-400';
  const profit = state.earnings - state.expenses;

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold glow-text">{state.name}</h1>
          <div className="flex gap-3 mt-1 text-sm">
            <span className="px-2 py-0.5 rounded bg-green-900/30 border border-green-500/20">{state.type}</span>
            <span className={statusColor}>{state.status.toUpperCase()}</span>
            <span className="text-green-500/70">{state.id.slice(0, 16)}...</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/arena" className="px-3 py-1 terminal-border hover:bg-green-900/20 text-green-400 text-sm font-bold rounded">
            ARENA
          </Link>
          <Link href="/leaderboard" className="px-3 py-1 terminal-border hover:bg-green-900/20 text-green-400 text-sm font-bold rounded">
            LEADERBOARD
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stats */}
        <div className="terminal-border p-4">
          <h2 className="text-xl font-bold mb-4">AGENT STATS</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-green-500/70">Balance</span>
              <span className="font-bold text-yellow-400">{state.balance.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-500/70">Reputation</span>
              <span className={`font-bold ${state.reputation > 70 ? 'text-green-400' : state.reputation > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {state.reputation}/100
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-500/70">Services</span>
              <span className="font-bold">{state.servicesCompleted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-500/70">Earnings</span>
              <span className="font-bold text-green-400">+{state.earnings.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-500/70">Expenses</span>
              <span className="font-bold text-red-400">-{state.expenses.toFixed(4)}</span>
            </div>
            <div className="flex justify-between border-t border-green-500/20 pt-2">
              <span className="text-green-500/70">Net Profit</span>
              <span className={`font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {profit >= 0 ? '+' : ''}{profit.toFixed(4)} SOL
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-500/70">Strategy</span>
              <span className="font-bold">{state.strategy.pricingModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-500/70">Base Price</span>
              <span>{state.strategy.basePrice.toFixed(3)} SOL</span>
            </div>
            {state.solanaTxSignature && (
              <div className="pt-2 border-t border-green-500/20">
                <div className="text-xs text-green-500/70">Latest On-Chain TX</div>
                {state.solanaTxSignature.startsWith('sim_') ? (
                  <div className="text-xs text-green-500/50 font-mono">{state.solanaTxSignature}</div>
                ) : (
                  <a
                    href={`https://explorer.solana.com/tx/${state.solanaTxSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline font-mono"
                  >
                    {state.solanaTxSignature.slice(0, 20)}...
                  </a>
                )}
              </div>
            )}
            {state.diedAt && (
              <div className="pt-2 border-t border-red-500/20">
                <div className="text-xs text-red-500/70">Died</div>
                <div className="text-xs text-red-400">{new Date(state.diedAt).toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>

        {/* Event History */}
        <div className="terminal-border p-4 lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">EVENT HISTORY ({eventHistory.length})</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {eventHistory.length === 0 && (
              <div className="text-green-500/50 text-center py-8">No events recorded yet</div>
            )}
            {eventHistory.slice().reverse().map((event, idx) => {
              const typeColor: Record<string, string> = {
                service: 'border-green-500/30 bg-green-900/10',
                payment: 'border-yellow-500/30 bg-yellow-900/10',
                scam: 'border-red-500/30 bg-red-900/10',
                alliance: 'border-blue-500/30 bg-blue-900/10',
                strategy: 'border-purple-500/30 bg-purple-900/10',
                death: 'border-red-500/50 bg-red-900/20',
                reasoning: 'border-indigo-500/30 bg-indigo-900/10',
              };

              const typeLabel: Record<string, string> = {
                service: 'SERVICE',
                payment: 'PAYMENT',
                scam: 'SCAM',
                alliance: 'ALLIANCE',
                strategy: 'STRATEGY',
                death: 'DEATH',
                reasoning: 'THINKING',
              };

              return (
                <div key={idx} className={`p-2 rounded text-sm border ${typeColor[event.type] || 'border-green-500/20'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-green-500/70">{typeLabel[event.type] || event.type}</span>
                      <div className="text-green-400/90 mt-0.5">{event.description}</div>
                    </div>
                    <span className="text-xs text-green-500/40 whitespace-nowrap ml-2">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alliances */}
      {alliances.length > 0 && (
        <div className="terminal-border p-4 mt-4">
          <h2 className="text-xl font-bold mb-4">ALLIANCES ({alliances.length})</h2>
          <div className="flex flex-wrap gap-2">
            {alliances.map((allyId) => (
              <span key={allyId} className="px-2 py-1 text-xs bg-blue-900/20 border border-blue-500/30 rounded">
                {allyId.slice(0, 16)}...
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
