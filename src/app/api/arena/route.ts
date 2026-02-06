// API Route - Server-Sent Events for livestream

import { getArenaEngine } from '@/lib/arena-singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const arena = getArenaEngine();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial stats
      const initialStats = arena.getStats();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'stats', data: initialStats })}\n\n`)
      );

      // Listen to arena events
      const onTransaction = (tx: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'transaction', data: tx })}\n\n`)
        );
      };

      const onAgentDied = (agent: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'death', data: agent })}\n\n`)
        );
      };

      const onStats = (stats: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'stats', data: stats })}\n\n`)
        );
      };

      const onServiceCompleted = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'service', data })}\n\n`)
        );
      };

      arena.on('transaction', onTransaction);
      arena.on('agent-died', onAgentDied);
      arena.on('stats', onStats);
      arena.on('service-completed', onServiceCompleted);

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        arena.off('transaction', onTransaction);
        arena.off('agent-died', onAgentDied);
        arena.off('stats', onStats);
        arena.off('service-completed', onServiceCompleted);
        clearInterval(heartbeat);
        controller.close();
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
