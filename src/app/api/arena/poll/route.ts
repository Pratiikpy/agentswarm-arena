// Polling endpoint - runs a tick and returns current state
// Used on Vercel where SSE streaming doesn't work reliably

import { waitForArena } from '@/lib/arena-singleton';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET() {
  const arena = await waitForArena();

  // Run a tick
  try {
    await arena.runTick();
  } catch (err) {
    console.error('Arena tick error:', err);
  }

  // Collect state
  const stats = arena.getStats();
  const recentTransactions = arena.getRecentTransactions(10);
  const history = arena.getHistory();

  return Response.json({
    stats,
    transactions: recentTransactions,
    history,
  });
}
