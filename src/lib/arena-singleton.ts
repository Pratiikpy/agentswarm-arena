// Arena singleton - ensures one arena instance across server

import { ArenaEngine } from '../arena/engine';

declare global {
  var arenaEngine: ArenaEngine | undefined;
}

export function getArenaEngine(): ArenaEngine {
  if (!global.arenaEngine) {
    global.arenaEngine = new ArenaEngine();

    // Initialize with 100 agents
    global.arenaEngine.initialize(100).then(() => {
      console.log('✅ Arena initialized with 100 agents');
      global.arenaEngine!.start();
      console.log('🚀 Arena started!');
    });
  }

  return global.arenaEngine;
}
