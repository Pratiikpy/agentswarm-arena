// Polling endpoint - runs a tick and returns current state
// Used on Vercel where SSE streaming doesn't work reliably

import { waitForArena } from '@/lib/arena-singleton';
import { getSolanaLogger } from '@/lib/solana-logger';

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

  const solana = getSolanaLogger();

  return Response.json({
    stats,
    transactions: recentTransactions,
    history,
    solana: {
      enabled: solana.isEnabled(),
      programId: solana.getProgramId(),
      arenaPda: solana.getArenaPda(),
      walletKeySet: !!process.env.SOLANA_WALLET_KEY,
      walletKeyLength: process.env.SOLANA_WALLET_KEY?.length || 0,
      walletKeyStart: process.env.SOLANA_WALLET_KEY?.slice(0, 5) || '',
      loggingEnvSet: process.env.SOLANA_LOGGING_ENABLED,
    },
  });
}
