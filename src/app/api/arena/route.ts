// API Route - Server-Sent Events for livestream

import { waitForArena } from '@/lib/arena-singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const arena = await waitForArena();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (type: string, data: any) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
          );
        } catch {
          closed = true;
        }
      };

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        closed = true;
      });

      // Send initial stats
      send('stats', arena.getStats());

      // Collect events from arena
      const onTransaction = (tx: any) => send('transaction', tx);
      const onAgentDied = (agent: any) => send('death', agent);
      const onStats = (stats: any) => send('stats', stats);
      const onServiceCompleted = (data: any) => send('service', data);
      const onScamDetected = (data: any) => send('scam', data);
      const onCartelFormed = (data: any) => send('cartel', data);
      const onAllianceFormed = (data: any) => send('alliance-formed', data);
      const onAllianceBroken = (data: any) => send('alliance-broken', data);
      const onStrategyChanged = (data: any) => send('strategy-changed', data);
      const onAgents = (data: any) => send('agents', data);
      const onHistory = (data: any) => send('history', data);
      const onReasoning = (data: any) => send('reasoning', data);

      arena.on('transaction', onTransaction);
      arena.on('agent-died', onAgentDied);
      arena.on('stats', onStats);
      arena.on('service-completed', onServiceCompleted);
      arena.on('scam-detected', onScamDetected);
      arena.on('cartel-formed', onCartelFormed);
      arena.on('alliance-formed', onAllianceFormed);
      arena.on('alliance-broken', onAllianceBroken);
      arena.on('strategy-changed', onStrategyChanged);
      arena.on('agents', onAgents);
      arena.on('history', onHistory);
      arena.on('reasoning', onReasoning);

      const cleanup = () => {
        arena.off('transaction', onTransaction);
        arena.off('agent-died', onAgentDied);
        arena.off('stats', onStats);
        arena.off('service-completed', onServiceCompleted);
        arena.off('scam-detected', onScamDetected);
        arena.off('cartel-formed', onCartelFormed);
        arena.off('alliance-formed', onAllianceFormed);
        arena.off('alliance-broken', onAllianceBroken);
        arena.off('strategy-changed', onStrategyChanged);
        arena.off('agents', onAgents);
        arena.off('history', onHistory);
        arena.off('reasoning', onReasoning);
      };

      // Drive ticks within this request (works on both local and Vercel)
      // Run up to 20 ticks per connection
      for (let i = 0; i < 20 && !closed; i++) {
        try {
          await arena.runTick();
        } catch (err) {
          console.error('Arena tick error:', err);
        }
        // Wait between ticks (2s for fast action)
        if (!closed) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      cleanup();
      if (!closed) {
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
