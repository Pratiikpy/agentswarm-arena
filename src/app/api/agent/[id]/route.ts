// API Route - Get agent details

import { waitForArena } from '@/lib/arena-singleton';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const arena = await waitForArena();
  const agent = arena.getAgent(id);

  if (!agent) {
    return Response.json({ error: 'Agent not found' }, { status: 404 });
  }

  return Response.json({
    state: agent.getState(),
    eventHistory: agent.getEventHistory(),
    alliances: agent.getAlliances(),
  });
}
