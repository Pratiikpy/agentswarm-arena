// Polling endpoint - runs a tick and returns current state
// Used on Vercel where SSE streaming doesn't work reliably

import { getArenaEngine } from '@/lib/arena-singleton';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const arena = getArenaEngine();

  // Try to run a tick (may fail on cold start while agents initialize)
  try {
    await arena.runTick();
  } catch (err) {
    console.error('Arena tick error:', err);
  }

  // Collect state - always return whatever is available
  const stats = arena.getStats();
  const recentTransactions = arena.getRecentTransactions(10);
  const history = arena.getHistory();

  return Response.json({
    stats,
    transactions: recentTransactions,
    history,
  });
}
