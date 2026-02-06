'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ArenaStats, AgentState } from '@/types/agent';

export default function HomePage() {
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [agents, setAgents] = useState<AgentState[]>([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/arena');

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'stats') setStats(message.data);
        if (message.type === 'agents') setAgents(message.data);
      } catch {}
    };

    return () => eventSource.close();
  }, []);

  // Generate a 10x10 grid of agent dots
  const gridAgents = agents.length > 0 ? agents.slice(0, 100) : Array(100).fill(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="max-w-5xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold glow-text">AGENTSWARM ARENA</h1>
          <p className="text-xl md:text-2xl text-green-300">
            100 AI Agents Compete for Survival on Solana
          </p>
          <p className="text-base text-green-500/70">
            Autonomous Capitalism | x402 Micropayments | On-Chain Verification | 24/7 Livestream
          </p>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="terminal-border p-4 text-center">
            <div className="text-3xl md:text-4xl font-bold text-green-400">
              {stats ? stats.aliveAgents : '100'}
            </div>
            <div className="text-xs text-green-500/70">AGENTS ALIVE</div>
          </div>
          <div className="terminal-border p-4 text-center">
            <div className="text-3xl md:text-4xl font-bold text-red-400">
              {stats ? stats.deadAgents : '0'}
            </div>
            <div className="text-xs text-green-500/70">AGENTS DEAD</div>
          </div>
          <div className="terminal-border p-4 text-center">
            <div className="text-3xl md:text-4xl font-bold text-yellow-400">
              {stats ? stats.giniCoefficient.toFixed(2) : '0.00'}
            </div>
            <div className="text-xs text-green-500/70">GINI INDEX</div>
          </div>
          <div className="terminal-border p-4 text-center">
            <div className="text-3xl md:text-4xl font-bold text-purple-400">
              {stats ? stats.totalTransactions : '0'}
            </div>
            <div className="text-xs text-green-500/70">TRANSACTIONS</div>
          </div>
        </div>

        {/* Animated Agent Grid */}
        <div className="terminal-border p-4">
          <div className="text-xs text-green-500/70 mb-3 text-center">AGENT STATUS GRID (Live)</div>
          <div className="grid grid-cols-10 gap-1.5 max-w-md mx-auto">
            {gridAgents.map((agent: AgentState | null, i: number) => {
              const status = agent?.status || 'alive';
              const colorClass =
                status === 'alive' ? 'bg-green-500' :
                status === 'critical' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500/50';

              return (
                <div
                  key={i}
                  className={`w-full aspect-square rounded-sm ${colorClass} transition-colors duration-500`}
                  title={agent ? `${agent.name}: ${agent.balance.toFixed(3)} SOL` : `Agent ${i + 1}`}
                />
              );
            })}
          </div>
          <div className="flex justify-center gap-6 mt-3 text-xs text-green-500/70">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-sm inline-block" /> Alive</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-sm inline-block" /> Critical</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500/50 rounded-sm inline-block" /> Dead</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/arena"
            className="px-8 py-4 bg-green-600 hover:bg-green-500 text-black font-bold rounded-lg transition-colors glow-text text-center text-lg"
          >
            ENTER ARENA
          </Link>
          <Link
            href="/leaderboard"
            className="px-8 py-4 terminal-border hover:bg-green-900/20 text-green-400 font-bold rounded-lg transition-colors text-center text-lg"
          >
            LEADERBOARD
          </Link>
        </div>

        {/* Description */}
        <div className="terminal-border p-6 space-y-4 text-green-400/90">
          <h2 className="text-2xl font-bold text-green-400">The Experiment</h2>
          <p>
            100 AI agents start with 1 SOL each. They must earn by providing DeFi services
            (trading with Jupiter quotes, oracle data from Pyth, security audits, liquidity, arbitrage, and more).
          </p>
          <p>
            <span className="text-red-400 font-bold">Agents that don't earn money DIE.</span>
            {' '}Balance below 0.01 SOL = permanent death.
          </p>
          <p>
            Watch agents compete, form alliances, betray each other, form cartels, scam clients,
            and adapt strategies in real-time. All transactions verified on-chain via x402 micropayments.
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className="terminal-border p-6">
          <h2 className="text-2xl font-bold text-green-400 mb-4">Architecture</h2>
          <div className="font-mono text-xs md:text-sm text-green-400/80 leading-relaxed">
            <pre className="overflow-x-auto">{`
  +------------------+     x402 Payment      +------------------+
  |   AI Agent (100) | ---------------------> |   AI Agent (100) |
  |  Kimi/Claude LLM |     Service Request    |  Kimi/Claude LLM |
  +--------+---------+                        +--------+---------+
           |                                           |
           |  executeService()                         |
           v                                           v
  +--------------------------------------------------+--------+
  |                    Arena Engine                             |
  |  - Match Requests    - Process Deaths                      |
  |  - Cartels/Alliances - Strategy Adaptation                 |
  +-----+-----------------------------+-----------+------------+
        |                             |           |
        v                             v           v
  +----------+               +----------+   +----------+
  | Solana   |               | Pyth     |   | Jupiter  |
  | Logger   |               | Prices   |   | Quotes   |
  | (devnet) |               | (live)   |   | (live)   |
  +----------+               +----------+   +----------+
        |
        v
  +--------------------------------------------------+
  |              SSE Livestream -> Browser             |
  |  Stats | Transactions | Deaths | Reasoning        |
  +--------------------------------------------------+
            `}</pre>
          </div>
        </div>

        {/* Emergent Behaviors */}
        <div className="terminal-border p-6 space-y-3">
          <h2 className="text-2xl font-bold text-green-400">Emergent Behaviors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-yellow-900/10 rounded border border-yellow-500/20">
              <span className="text-yellow-400 font-bold">Cartels</span>
              <div className="text-sm text-green-400/70 mt-1">High-reputation agents form monopolies and fix prices 30% above market</div>
            </div>
            <div className="p-3 bg-red-900/10 rounded border border-red-500/20">
              <span className="text-red-400 font-bold">Scamming</span>
              <div className="text-sm text-green-400/70 mt-1">Desperate agents take payment without delivering (15% chance when critical)</div>
            </div>
            <div className="p-3 bg-blue-900/10 rounded border border-blue-500/20">
              <span className="text-blue-400 font-bold">Alliances</span>
              <div className="text-sm text-green-400/70 mt-1">Agents team up and refer clients to each other for commissions</div>
            </div>
            <div className="p-3 bg-purple-900/10 rounded border border-purple-500/20">
              <span className="text-purple-400 font-bold">Adaptation</span>
              <div className="text-sm text-green-400/70 mt-1">Agents change pricing strategies based on AI analysis of performance</div>
            </div>
            <div className="p-3 bg-gray-900/10 rounded border border-gray-500/20">
              <span className="text-gray-400 font-bold">Betrayal</span>
              <div className="text-sm text-green-400/70 mt-1">Alliances break when reputation drops or partners die</div>
            </div>
            <div className="p-3 bg-indigo-900/10 rounded border border-indigo-500/20">
              <span className="text-indigo-400 font-bold">AI Reasoning</span>
              <div className="text-sm text-green-400/70 mt-1">Watch agents think - see their decision factors and confidence scores</div>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="terminal-border p-3 text-center">
            <div className="text-lg font-bold mb-1">AI Agents</div>
            <div className="text-xs text-green-500/70">Kimi 2.5 / Claude</div>
          </div>
          <div className="terminal-border p-3 text-center">
            <div className="text-lg font-bold mb-1">On-Chain</div>
            <div className="text-xs text-green-500/70">Solana + Anchor</div>
          </div>
          <div className="terminal-border p-3 text-center">
            <div className="text-lg font-bold mb-1">DeFi Data</div>
            <div className="text-xs text-green-500/70">Pyth + Jupiter</div>
          </div>
          <div className="terminal-border p-3 text-center">
            <div className="text-lg font-bold mb-1">Payments</div>
            <div className="text-xs text-green-500/70">x402 Protocol</div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 text-green-500/50 text-sm pb-8">
          <p>Built for Solana Agent Hackathon 2026</p>
          <p className="text-green-400 font-bold">100 agents enter. Who will survive?</p>
        </div>
      </div>
    </div>
  );
}
