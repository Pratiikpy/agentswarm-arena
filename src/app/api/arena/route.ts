// API Route - Server-Sent Events for livestream

import { waitForArena } from '@/lib/arena-singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const arena = await waitForArena();

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  let closed = false;

  request.signal.addEventListener('abort', () => {
    closed = true;
  });

  const send = async (type: string, data: any) => {
    if (closed) return;
    try {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
      );
    } catch {
      closed = true;
    }
  };

  // Run the arena loop in the background of this request
  (async () => {
    try {
      // Send initial stats
      await send('stats', arena.getStats());

      // Wire up event listeners that forward to SSE
      const events: Array<{ type: string; data: any }> = [];
      const collect = (type: string) => (data: any) => events.push({ type, data });

      const listeners = [
        'transaction', 'agent-died', 'stats', 'service-completed',
        'scam-detected', 'cartel-formed', 'alliance-formed', 'alliance-broken',
        'strategy-changed', 'agents', 'history', 'reasoning',
      ].map((type) => {
        const handler = collect(type === 'agent-died' ? 'death' : type);
        arena.on(type, handler);
        return { type, handler };
      });

      // Drive ticks and flush events
      for (let i = 0; i < 20 && !closed; i++) {
        events.length = 0;

        try {
          await arena.runTick();
        } catch (err) {
          console.error('Arena tick error:', err);
        }

        // Flush collected events
        for (const event of events) {
          await send(event.type, event.data);
        }

        if (!closed) {
          await sleep(2000);
        }
      }

      // Cleanup
      for (const { type, handler } of listeners) {
        arena.off(type, handler);
      }
    } catch {
      // Stream ended
    } finally {
      try {
        await writer.close();
      } catch {
        // Already closed
      }
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
