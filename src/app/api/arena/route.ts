// API Route - Server-Sent Events for livestream

import { getArenaEngine } from '@/lib/arena-singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const arena = getArenaEngine();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      // Safe enqueue that won't throw if the stream is already closed
      const send = (type: string, data: any) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
          );
        } catch {
          // Stream closed, ignore
        }
      };

      // Send initial stats
      send('stats', arena.getStats());

      // Listen to arena events
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

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Stream closed, ignore
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        closed = true;
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
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
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
