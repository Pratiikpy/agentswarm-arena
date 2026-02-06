'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { BalanceSnapshot, ServiceType } from '@/types/agent';

interface ChartsProps {
  history: BalanceSnapshot[];
}

const AGENT_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#8b5cf6',
];

const SERVICE_COLORS: Record<string, string> = {
  trading: '#22c55e',
  research: '#3b82f6',
  security: '#ef4444',
  oracle: '#f59e0b',
  liquidity: '#06b6d4',
  arbitrage: '#a855f7',
  sentiment: '#ec4899',
  risk: '#f97316',
  yield: '#14b8a6',
  dao: '#8b5cf6',
};

export function WealthChart({ history }: ChartsProps) {
  const data = useMemo(() => {
    return history.map((snap, i) => {
      const entry: Record<string, any> = { tick: i };
      Object.entries(snap.balances).forEach(([name, balance]) => {
        entry[name] = Number(balance.toFixed(3));
      });
      return entry;
    });
  }, [history]);

  const agentNames = useMemo(() => {
    if (history.length === 0) return [];
    const latest = history[history.length - 1];
    return Object.keys(latest.balances);
  }, [history]);

  if (data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-green-500/50">
        Collecting data...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
        <XAxis dataKey="tick" stroke="#4ade80" tick={false} />
        <YAxis stroke="#4ade80" fontSize={10} tickFormatter={(v) => `${v}`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #22c55e40', fontSize: 11 }}
          labelStyle={{ color: '#22c55e' }}
        />
        {agentNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={AGENT_COLORS[i % AGENT_COLORS.length]}
            strokeWidth={1.5}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GiniChart({ history }: ChartsProps) {
  const data = useMemo(() => {
    return history.map((snap, i) => ({
      tick: i,
      gini: Number(snap.giniCoefficient.toFixed(3)),
    }));
  }, [history]);

  if (data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-green-500/50">
        Collecting data...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
        <XAxis dataKey="tick" stroke="#4ade80" tick={false} />
        <YAxis stroke="#4ade80" fontSize={10} domain={[0, 1]} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #22c55e40', fontSize: 11 }}
          labelStyle={{ color: '#22c55e' }}
        />
        <Area
          type="monotone"
          dataKey="gini"
          stroke="#f59e0b"
          fill="#f59e0b20"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SurvivalChart({ history }: ChartsProps) {
  const data = useMemo(() => {
    return history.map((snap, i) => ({
      tick: i,
      alive: snap.aliveCount,
      dead: snap.deadCount,
    }));
  }, [history]);

  if (data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-green-500/50">
        Collecting data...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
        <XAxis dataKey="tick" stroke="#4ade80" tick={false} />
        <YAxis stroke="#4ade80" fontSize={10} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #22c55e40', fontSize: 11 }}
          labelStyle={{ color: '#22c55e' }}
        />
        <Area type="monotone" dataKey="alive" stroke="#22c55e" fill="#22c55e20" stackId="1" />
        <Area type="monotone" dataKey="dead" stroke="#ef4444" fill="#ef444420" stackId="1" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ServiceDistributionChart({ history }: ChartsProps) {
  const data = useMemo(() => {
    if (history.length === 0) return [];
    const latest = history[history.length - 1];
    return Object.entries(latest.serviceVolume)
      .map(([name, count]) => ({ name: name.slice(0, 6), count, fullName: name }))
      .sort((a, b) => b.count - a.count);
  }, [history]);

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-green-500/50">
        Collecting data...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
        <XAxis dataKey="name" stroke="#4ade80" fontSize={9} />
        <YAxis stroke="#4ade80" fontSize={10} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #22c55e40', fontSize: 11 }}
          labelStyle={{ color: '#22c55e' }}
          labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
        />
        <Bar dataKey="count" fill="#22c55e80" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
