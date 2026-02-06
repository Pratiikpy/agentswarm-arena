'use client';

import { useEffect, useState } from 'react';
import type { ArenaStats, Transaction, AgentState } from '@/types/agent';

export default function ArenaPage() {
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deaths, setDeaths] = useState<AgentState[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('/api/arena');

    eventSource.onopen = () => {
      setConnected(true);
      console.log('✅ Connected to arena livestream');
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'stats':
            setStats(message.data);
            break;
          case 'transaction':
            setTransactions((prev) => [message.data, ...prev].slice(0, 50));
            break;
          case 'death':
            setDeaths((prev) => [message.data, ...prev].slice(0, 20));
            break;
          case 'service':
            // Could display service completions
            break;
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      console.error('❌ Lost connection to arena');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚔️</div>
          <div className="text-xl">Initializing Arena...</div>
          <div className="text-sm text-green-500/70 mt-2">
            {connected ? 'Connected' : 'Connecting...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold glow-text mb-2">⚔️ AGENTSWARM ARENA - LIVE</h1>
        <div className="flex gap-4 text-sm">
          <span className={`${connected ? 'text-green-400' : 'text-red-400'}`}>
            {connected ? '🟢 LIVE' : '🔴 OFFLINE'}
          </span>
          <span>
            👥 {stats.aliveAgents} Alive | ⚰️ {stats.deadAgents} Dead
          </span>
          <span>💰 {stats.totalVolume.toFixed(2)} SOL Transacted</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leaderboard */}
        <div className="terminal-border p-4">
          <h2 className="text-xl font-bold mb-4">🏆 TOP 10 AGENTS</h2>
          <div className="space-y-2">
            {stats.topAgents.map((agent, idx) => (
              <div
                key={agent.id}
                className="flex justify-between items-center p-2 bg-green-900/10 rounded"
              >
                <div>
                  <div className="font-bold">
                    #{idx + 1} {agent.name}
                  </div>
                  <div className="text-xs text-green-500/70">{agent.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{agent.balance.toFixed(3)} SOL</div>
                  <div className="text-xs text-green-500/70">
                    ⭐ {agent.reputation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Feed */}
        <div className="terminal-border p-4">
          <h2 className="text-xl font-bold mb-4">📺 LIVE TRANSACTIONS</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {transactions.length === 0 && (
              <div className="text-center text-green-500/50 py-8">
                Waiting for transactions...
              </div>
            )}
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-2 bg-green-900/10 rounded text-sm animate-fadeIn"
              >
                <div className="flex justify-between">
                  <span className="text-green-400">
                    {new Date(tx.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-yellow-400 font-bold">
                    +{tx.amount.toFixed(3)} SOL
                  </span>
                </div>
                <div className="text-xs text-green-500/70 mt-1">
                  {tx.serviceType} service • Agent {tx.to.slice(0, 10)}...
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats & Deaths */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="terminal-border p-4">
            <h2 className="text-xl font-bold mb-4">📊 ARENA STATS</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-green-500/70">Avg Balance</div>
                <div className="text-2xl font-bold">
                  {stats.avgBalance.toFixed(3)} SOL
                </div>
              </div>
              <div>
                <div className="text-sm text-green-500/70">Wealth Inequality (Gini)</div>
                <div className="text-2xl font-bold">
                  {stats.giniCoefficient.toFixed(2)}
                </div>
                <div className="text-xs text-green-500/50">
                  0 = equal, 1 = one agent has all
                </div>
              </div>
              <div>
                <div className="text-sm text-green-500/70">Total Transactions</div>
                <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              </div>
            </div>
          </div>

          {/* Deaths */}
          <div className="terminal-border p-4">
            <h2 className="text-xl font-bold mb-4">⚰️ RECENT DEATHS</h2>
            <div className="space-y-2">
              {deaths.length === 0 && (
                <div className="text-center text-green-500/50 py-4">
                  No deaths yet...
                </div>
              )}
              {deaths.slice(0, 10).map((agent) => (
                <div
                  key={agent.id}
                  className="p-2 bg-red-900/20 rounded text-sm"
                >
                  <div className="font-bold text-red-400">{agent.name}</div>
                  <div className="text-xs text-green-500/70">
                    {agent.type} • {agent.servicesCompleted} services
                  </div>
                  <div className="text-xs text-red-500/70">
                    Died: {new Date(agent.diedAt || 0).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
