'use client';

import { useState } from 'react';
import type { ReasoningEvent } from '@/types/agent';

interface ReasoningFeedProps {
  events: ReasoningEvent[];
}

export function ReasoningFeed({ events }: ReasoningFeedProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (events.length === 0) {
    return (
      <div className="text-center text-green-500/50 py-4">
        Waiting for agent reasoning...
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {events.map((event, idx) => {
        const isExpanded = expandedId === idx;
        const confidenceColor =
          event.confidence > 0.8 ? 'text-green-400' :
          event.confidence > 0.5 ? 'text-yellow-400' :
          'text-red-400';

        return (
          <div
            key={idx}
            className="p-2 bg-indigo-900/15 rounded text-sm border border-indigo-500/20 cursor-pointer hover:border-indigo-500/40 transition-colors animate-fadeIn"
            onClick={() => setExpandedId(isExpanded ? null : idx)}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-indigo-400">{event.agentName}</span>
                <span className="text-green-500/70 ml-2">{event.decision}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${confidenceColor}`}>
                  {(event.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-green-500/30 text-xs">
                  {isExpanded ? '[-]' : '[+]'}
                </span>
              </div>
            </div>

            <div className="text-xs text-green-500/60 mt-1">
              {event.rationale}
            </div>

            {isExpanded && (
              <div className="mt-2 pt-2 border-t border-indigo-500/20">
                <div className="text-xs text-green-500/50 mb-1">Factors considered:</div>
                <ul className="text-xs text-green-500/70 space-y-0.5">
                  {event.factors.map((factor, fi) => (
                    <li key={fi} className="flex items-start gap-1">
                      <span className="text-indigo-400">-</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-green-500/40 mt-1">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
