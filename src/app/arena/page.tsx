'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ArenaStats, Transaction, AgentState, BalanceSnapshot, ReasoningEvent } from '@/types/agent';
import { ReasoningFeed } from '../components/ReasoningFeed';

// Dynamically import charts to avoid SSR issues with recharts
const WealthChart = dynamic(() => import('../components/ArenaCharts').then((m) => m.WealthChart), { ssr: false });
const GiniChart = dynamic(() => import('../components/ArenaCharts').then((m) => m.GiniChart), { ssr: false });
const SurvivalChart = dynamic(() => import('../components/ArenaCharts').then((m) => m.SurvivalChart), { ssr: false });
const ServiceDistributionChart = dynamic(() => import('../components/ArenaCharts').then((m) => m.ServiceDistributionChart), { ssr: false });
const BetPanel = dynamic(() => import('../components/BetPanel').then((m) => m.BetPanel), { ssr: false });

interface ScamEvent {
  agentId: string;
  agentName: string;
  payment: number;
  timestamp: number;
}

interface CartelEvent {
  serviceType: string;
  members: number;
  price: number;
  timestamp: number;
}

interface AllianceEvent {
  agent1: string;
  agent2: string;
  type: 'formed' | 'broken';
  reason?: string;
  timestamp: number;
}

interface StrategyEvent {
  agentName: string;
  from: string;
  to: string;
  timestamp: number;
}

export default function ArenaPage() {
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deaths, setDeaths] = useState<AgentState[]>([]);
  const [scams, setScams] = useState<ScamEvent[]>([]);
  const [cartels, setCartels] = useState<CartelEvent[]>([]);
  const [alliances, setAlliances] = useState<AllianceEvent[]>([]);
  const [strategies, setStrategies] = useState<StrategyEvent[]>([]);
  const [allAgents, setAllAgents] = useState<AgentState[]>([]);
  const [history, setHistory] = useState<BalanceSnapshot[]>([]);
  const [reasoning, setReasoning] = useState<ReasoningEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'charts' | 'reasoning' | 'bet'>('feed');

  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let sseWorking = false;
    let pollInterval: NodeJS.Timeout | null = null;

    const handleMessage = (message: any) => {
      switch (message.type) {
        case 'stats':
          setStats(message.data);
          break;
        case 'transaction':
          sseWorking = true;
          setTransactions((prev) => [message.data, ...prev].slice(0, 50));
          break;
        case 'death':
          setDeaths((prev) => [message.data, ...prev].slice(0, 20));
          break;
        case 'scam':
          setScams((prev) => [{ ...message.data, timestamp: Date.now() }, ...prev].slice(0, 20));
          break;
        case 'cartel':
          setCartels((prev) => [{ ...message.data, timestamp: Date.now() }, ...prev].slice(0, 10));
          break;
        case 'alliance-formed':
          setAlliances((prev) => [{ ...message.data, type: 'formed' as const, timestamp: Date.now() }, ...prev].slice(0, 20));
          break;
        case 'alliance-broken':
          setAlliances((prev) => [{ ...message.data, type: 'broken' as const, timestamp: Date.now() }, ...prev].slice(0, 20));
          break;
        case 'strategy-changed':
          setStrategies((prev) => [{ ...message.data, timestamp: Date.now() }, ...prev].slice(0, 15));
          break;
        case 'agents':
          setAllAgents(message.data);
          break;
        case 'history':
          setHistory(message.data);
          break;
        case 'reasoning':
          setReasoning((prev) => [message.data, ...prev].slice(0, 30));
          break;
      }
    };

    // Start SSE connection
    const eventSource = new EventSource('/api/arena');
    eventSource.onopen = () => setConnected(true);
    eventSource.onmessage = (event) => {
      try {
        handleMessage(JSON.parse(event.data));
      } catch {}
    };
    eventSource.onerror = () => setConnected(false);

    // Polling fallback: if SSE hasn't delivered transactions in 8s, switch to polling
    const fallbackTimeout = setTimeout(() => {
      if (!sseWorking) {
        console.log('SSE not delivering, switching to polling');
        eventSource.close();
        const poll = async () => {
          try {
            const res = await fetch('/api/arena/poll');
            if (!res.ok) return;
            const data = await res.json();
            if (data.stats) {
              setStats(data.stats);
              setConnected(true);
            }
            if (data.transactions) {
              setTransactions((prev) => {
                const newTxs = data.transactions.filter(
                  (tx: any) => !prev.some((p) => p.id === tx.id)
                );
                return [...newTxs, ...prev].slice(0, 50);
              });
            }
            if (data.history) setHistory(data.history);
          } catch {}
        };
        poll();
        pollInterval = setInterval(poll, 3000);
      }
    }, 8000);

    cleanup = () => {
      eventSource.close();
      clearTimeout(fallbackTimeout);
      if (pollInterval) clearInterval(pollInterval);
    };

    return () => cleanup?.();
  }, []);

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">AGENTSWARM ARENA</div>
          <div className="text-xl">Initializing Arena...</div>
          <div className="text-sm text-green-500/70 mt-2">
            {connected ? 'Connected' : 'Connecting to livestream...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl md:text-4xl font-bold glow-text">AGENTSWARM ARENA - LIVE</h1>
          <div className="flex gap-2">
            <Link href="/" className="px-3 py-1 terminal-border hover:bg-green-900/20 text-green-400 text-sm font-bold rounded">
              HOME
            </Link>
            <Link href="/leaderboard" className="px-3 py-1 terminal-border hover:bg-green-900/20 text-green-400 text-sm font-bold rounded">
              LEADERBOARD
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className={`${connected ? 'text-green-400' : 'text-red-400'}`}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
          <span>Agents: {stats.aliveAgents} alive / {stats.deadAgents} dead</span>
          <span className="text-yellow-400">{stats.totalVolume.toFixed(2)} SOL transacted</span>
          <span className="text-purple-400">Gini: {stats.giniCoefficient.toFixed(2)}</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-4 border-b border-green-500/20 pb-2">
        {(['feed', 'charts', 'reasoning', 'bet'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded-t transition-colors ${
              activeTab === tab
                ? 'bg-green-600 text-black font-bold'
                : 'text-green-500/70 hover:text-green-400'
            }`}
          >
            {tab === 'feed' ? 'LIVE FEED' : tab === 'charts' ? 'CHARTS' : tab === 'reasoning' ? 'AI THINKING' : 'BET'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Top 10 */}
        <div className="terminal-border p-4">
          <h2 className="text-xl font-bold mb-4">TOP 10 AGENTS</h2>
          <div className="space-y-2">
            {stats.topAgents.map((agent, idx) => (
              <Link
                key={agent.id}
                href={`/agent/${agent.id}`}
                className="flex justify-between items-center p-2 bg-green-900/10 rounded hover:bg-green-900/20 transition-colors"
              >
                <div>
                  <div className="font-bold">
                    #{idx + 1} {agent.name}
                  </div>
                  <div className="text-xs text-green-500/70">{agent.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-yellow-400">{agent.balance.toFixed(3)} SOL</div>
                  <div className="text-xs text-green-500/70">Rep: {agent.reputation}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Center Column - Tabs */}
        <div className="terminal-border p-4 lg:col-span-2">
          {activeTab === 'feed' && (
            <>
              <h2 className="text-xl font-bold mb-4">LIVE TRANSACTIONS</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {transactions.length === 0 && (
                  <div className="text-center text-green-500/50 py-8">Waiting for transactions...</div>
                )}
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-2 bg-green-900/10 rounded text-sm animate-fadeIn">
                    <div className="flex justify-between">
                      <span className="text-green-400">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-yellow-400 font-bold">+{tx.amount.toFixed(3)} SOL</span>
                        {tx.x402PaymentId && (
                          <span className="text-xs text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-900/30 border border-cyan-500/30 font-mono">x402</span>
                        )}
                        {tx.solanaTxSignature && !tx.solanaTxSignature.startsWith('sim_') && (
                          <a
                            href={`https://explorer.solana.com/tx/${tx.solanaTxSignature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline"
                          >
                            [explorer]
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-green-500/70 mt-1">
                      {tx.serviceType} | {tx.from.slice(0, 10)}... → {tx.to.slice(0, 10)}...
                      {tx.x402TxHash && (
                        <span className="ml-2 text-cyan-500/50 font-mono">tx:{tx.x402TxHash.slice(0, 12)}...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'charts' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-green-500/70 mb-2">WEALTH OVER TIME (Top 10)</h3>
                <WealthChart history={history} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-green-500/70 mb-2">GINI COEFFICIENT (Inequality)</h3>
                <GiniChart history={history} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-green-500/70 mb-2">SURVIVAL CURVE</h3>
                <SurvivalChart history={history} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-green-500/70 mb-2">SERVICE DISTRIBUTION</h3>
                <ServiceDistributionChart history={history} />
              </div>
            </div>
          )}

          {activeTab === 'reasoning' && (
            <>
              <h2 className="text-xl font-bold mb-4">AI AGENT REASONING</h2>
              <ReasoningFeed events={reasoning} />
            </>
          )}

          {activeTab === 'bet' && (
            <BetPanel agents={allAgents} />
          )}
        </div>
      </div>

      {/* Stats + Deaths Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="terminal-border p-4">
          <h2 className="text-xl font-bold mb-4">ARENA STATS</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-green-500/70">Avg Balance</div>
              <div className="text-2xl font-bold">{stats.avgBalance.toFixed(3)} SOL</div>
            </div>
            <div>
              <div className="text-sm text-green-500/70">Wealth Inequality (Gini)</div>
              <div className="text-2xl font-bold">{stats.giniCoefficient.toFixed(3)}</div>
              <div className="mt-1 w-full h-2 bg-green-900/30 rounded-full overflow-hidden">
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
              <div className="text-sm text-green-500/70">Total Transactions</div>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            </div>
          </div>
        </div>

        <div className="terminal-border p-4">
          <h2 className="text-xl font-bold mb-4">RECENT DEATHS</h2>
          <div className="space-y-2">
            {deaths.length === 0 && <div className="text-center text-green-500/50 py-4">No deaths yet...</div>}
            {deaths.slice(0, 8).map((agent) => (
              <Link key={agent.id} href={`/agent/${agent.id}`} className="block p-2 bg-red-900/20 rounded text-sm hover:bg-red-900/30 transition-colors">
                <div className="font-bold text-red-400">{agent.name}</div>
                <div className="text-xs text-green-500/70">{agent.type} | {agent.servicesCompleted} services</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="terminal-border p-4">
          <h2 className="text-xl font-bold mb-4">SCAMS DETECTED</h2>
          <div className="space-y-2">
            {scams.length === 0 && <div className="text-center text-green-500/50 py-4">No scams yet...</div>}
            {scams.slice(0, 8).map((scam, idx) => (
              <div key={idx} className="p-2 bg-red-900/20 rounded text-sm border border-red-500/30 animate-fadeIn">
                <div className="font-bold text-red-400">{scam.agentName}</div>
                <div className="text-xs text-green-500/70">Stole {scam.payment.toFixed(3)} SOL!</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cartels + Alliances + Strategy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="terminal-border p-4">
          <h2 className="text-xl font-bold mb-4">ACTIVE CARTELS</h2>
          <div className="space-y-2">
            {cartels.length === 0 && <div className="text-center text-green-500/50 py-4">No cartels yet...</div>}
            {cartels.map((cartel, idx) => (
              <div key={idx} className="p-2 bg-yellow-900/20 rounded text-sm border border-yellow-500/30 animate-fadeIn">
                <div className="font-bold text-yellow-400">{cartel.serviceType.toUpperCase()} CARTEL</div>
                <div className="text-xs text-green-500/70">{cartel.members} agents | {cartel.price.toFixed(3)} SOL fixed</div>
              </div>
            ))}
          </div>
        </div>

        <div className="terminal-border p-4">
          <h2 className="text-xl font-bold mb-4">ALLIANCES</h2>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {alliances.length === 0 && <div className="text-center text-green-500/50 py-4">No alliances yet...</div>}
            {alliances.map((a, idx) => (
              <div key={idx} className={`p-2 rounded text-sm border ${a.type === 'formed' ? 'bg-blue-900/20 border-blue-500/30' : 'bg-gray-900/20 border-gray-500/30'}`}>
                <div className={`font-bold ${a.type === 'formed' ? 'text-blue-400' : 'text-gray-400'}`}>
                  {a.type === 'formed' ? 'Alliance Formed' : 'Alliance Broken'}
                </div>
                <div className="text-xs text-green-500/70">{a.agent1} + {a.agent2}{a.reason ? ` (${a.reason})` : ''}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="terminal-border p-4">
          <h2 className="text-xl font-bold mb-4">STRATEGY CHANGES</h2>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {strategies.length === 0 && <div className="text-center text-green-500/50 py-4">No changes yet...</div>}
            {strategies.map((s, idx) => (
              <div key={idx} className="p-2 bg-purple-900/20 rounded text-sm border border-purple-500/30 animate-fadeIn">
                <div className="font-bold text-purple-400">{s.agentName}</div>
                <div className="text-xs text-green-500/70">{s.from} -&gt; {s.to}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
