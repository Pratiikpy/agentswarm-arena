// Arena singleton - ensures one arena instance across server

import { ArenaEngine } from '../arena/engine';

declare global {
  var arenaEngine: ArenaEngine | undefined;
  var arenaReady: Promise<void> | undefined;
}

export function getArenaEngine(): ArenaEngine {
  if (!global.arenaEngine) {
    global.arenaEngine = new ArenaEngine();

    // Initialize agents but DON'T start setInterval ticking
    // Ticks are driven by the SSE route handler for Vercel compatibility
    global.arenaReady = global.arenaEngine.initialize(100).then(() => {
      console.log('✅ Arena initialized with 100 agents');
    });
  }

  return global.arenaEngine;
}

export async function waitForArena(): Promise<ArenaEngine> {
  const engine = getArenaEngine();
  if (global.arenaReady) {
    await global.arenaReady;
  }
  return engine;
}
