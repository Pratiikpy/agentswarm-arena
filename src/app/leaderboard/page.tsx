'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ArenaStats, AgentState } from '@/types/agent';

export default function LeaderboardPage() {
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [allAgents, setAllAgents] = useState<AgentState[]>([]);
  const [filter, setFilter] = useState<'all' | 'alive' | 'dead'>('all');
  const [sortBy, setSortBy] = useState<'balance' | 'reputation' | 'services'>('balance');

  useEffect(() => {
    const eventSource = new EventSource('/api/arena');

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'stats') {
          setStats(message.data);
        }
        if (message.type === 'agents') {
          setAllAgents(message.data);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    return () => eventSource.close();
  }, []);

  // Use full agent list when available, falling back to top agents from stats
  const sortedAgents = [...(allAgents.length > 0 ? allAgents : stats?.topAgents || [])];

  // Apply filter
  const filteredAgents = sortedAgents.filter((agent) => {
    if (filter === 'alive') return agent.status === 'alive' || agent.status === 'critical';
    if (filter === 'dead') return agent.status === 'dead';
    return true;
  });

  // Apply sort
  filteredAgents.sort((a, b) => {
    if (sortBy === 'balance') return b.balance - a.balance;
    if (sortBy === 'reputation') return b.reputation - a.reputation;
    if (sortBy === 'services') return b.servicesCompleted - a.servicesCompleted;
    return 0;
  });

  const displayAgents = filteredAgents.slice(0, 50);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alive': return 'text-green-400';
      case 'critical': return 'text-yellow-400';
      case 'dead': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'alive': return '🟢';
      case 'critical': return '🟡';
      case 'dead': return '💀';
      default: return '⚪';
    }
  };

  const getRankEmoji = (idx: number) => {
    switch (idx) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${idx + 1}`;
    }
  };

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold glow-text">🏆 LEADERBOARD</h1>
            <p className="text-green-500/70 mt-1">
              Top performing agents ranked by wealth
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="px-4 py-2 terminal-border hover:bg-green-900/20 text-green-400 font-bold rounded-lg transition-colors"
            >
              HOME
            </Link>
            <Link
              href="/arena"
              className="px-4 py-2 terminal-border hover:bg-green-900/20 text-green-400 font-bold rounded-lg transition-colors"
            >
              LIVE ARENA
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="terminal-border p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.aliveAgents}</div>
              <div className="text-xs text-green-500/70">ALIVE</div>
            </div>
            <div className="terminal-border p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{stats.deadAgents}</div>
              <div className="text-xs text-green-500/70">DEAD</div>
            </div>
            <div className="terminal-border p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.avgBalance.toFixed(3)}</div>
              <div className="text-xs text-green-500/70">AVG SOL</div>
            </div>
            <div className="terminal-border p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.giniCoefficient.toFixed(2)}</div>
              <div className="text-xs text-green-500/70">GINI</div>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="terminal-border p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">TOP AGENTS</h2>
          <div className="flex gap-4 items-center">
            <div className="flex gap-1">
              {(['all', 'alive', 'dead'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filter === f
                      ? 'bg-green-600 text-black font-bold'
                      : 'terminal-border text-green-500/70 hover:text-green-400'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'balance' | 'reputation' | 'services')}
              className="bg-black border border-green-500/30 text-green-400 text-xs px-2 py-1 rounded"
            >
              <option value="balance">Sort: Balance</option>
              <option value="reputation">Sort: Reputation</option>
              <option value="services">Sort: Services</option>
            </select>
            <div className="text-sm text-green-500/70">
              {stats?.totalTransactions || 0} txns
            </div>
          </div>
        </div>

        {!stats && (
          <div className="text-center py-12 text-green-500/50">
            Loading leaderboard...
          </div>
        )}

        {displayAgents.length > 0 && (
          <div className="space-y-2">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-2 text-xs text-green-500/50 px-3 py-1 border-b border-green-500/20">
              <div className="col-span-1">RANK</div>
              <div className="col-span-3">AGENT</div>
              <div className="col-span-2">TYPE</div>
              <div className="col-span-2 text-right">BALANCE</div>
              <div className="col-span-1 text-right">REP</div>
              <div className="col-span-2 text-right">SERVICES</div>
              <div className="col-span-1 text-center">STATUS</div>
            </div>

            {/* Agent Rows */}
            {displayAgents.map((agent, idx) => (
              <div
                key={agent.id}
                className={`grid grid-cols-12 gap-2 items-center px-3 py-2 rounded animate-fadeIn ${
                  idx === 0
                    ? 'bg-yellow-900/20 border border-yellow-500/30'
                    : idx < 3
                    ? 'bg-green-900/15 border border-green-500/20'
                    : 'bg-green-900/5 hover:bg-green-900/10'
                } transition-colors`}
              >
                <div className="col-span-1 font-bold text-lg">
                  {getRankEmoji(idx)}
                </div>
                <div className="col-span-3">
                  <div className="font-bold">{agent.name}</div>
                  <div className="text-xs text-green-500/50">
                    {agent.id.slice(0, 12)}...
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-xs px-2 py-1 rounded bg-green-900/30 border border-green-500/20">
                    {agent.type}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <div className="font-bold text-yellow-400">
                    {agent.balance.toFixed(3)} SOL
                  </div>
                  <div className="text-xs text-green-500/50">
                    +{agent.earnings.toFixed(3)} / -{agent.expenses.toFixed(3)}
                  </div>
                </div>
                <div className="col-span-1 text-right">
                  <span className={agent.reputation > 70 ? 'text-green-400' : agent.reputation > 40 ? 'text-yellow-400' : 'text-red-400'}>
                    {agent.reputation}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <div className="font-bold">{agent.servicesCompleted}</div>
                  <div className="text-xs text-green-500/50">
                    {agent.strategy.pricingModel}
                  </div>
                </div>
                <div className="col-span-1 text-center">
                  {getStatusEmoji(agent.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wealth Distribution */}
      {stats && (
        <div className="terminal-border p-4 mt-4">
          <h2 className="text-xl font-bold mb-4">📊 WEALTH DISTRIBUTION</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-green-500/70 mb-2">Gini Coefficient</div>
              <div className="text-4xl font-bold">
                {stats.giniCoefficient.toFixed(3)}
              </div>
              <div className="text-xs text-green-500/50 mt-1">
                {stats.giniCoefficient < 0.3 ? 'Relatively equal' :
                 stats.giniCoefficient < 0.5 ? 'Moderate inequality' :
                 stats.giniCoefficient < 0.7 ? 'High inequality' :
                 'Extreme inequality'}
              </div>
              {/* Gini Bar */}
              <div className="mt-2 w-full h-3 bg-green-900/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    stats.giniCoefficient < 0.3 ? 'bg-green-500' :
                    stats.giniCoefficient < 0.5 ? 'bg-yellow-500' :
                    stats.giniCoefficient < 0.7 ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${stats.giniCoefficient * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-sm text-green-500/70 mb-2">Market Stats</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-500/70">Total Volume</span>
                  <span className="font-bold">{stats.totalVolume.toFixed(2)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-500/70">Avg Balance</span>
                  <span className="font-bold">{stats.avgBalance.toFixed(3)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-500/70">Survival Rate</span>
                  <span className="font-bold">
                    {stats.totalAgents > 0
                      ? Math.round((stats.aliveAgents / stats.totalAgents) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-500/70">Transactions</span>
                  <span className="font-bold">{stats.totalTransactions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-6 text-green-500/50 text-sm">
        AgentSwarm Arena - 100 AI Agents Compete for Survival on Solana
      </div>
    </div>
  );
}
