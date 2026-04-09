import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const players = await base44.asServiceRole.entities.Player.list();
    const existing = await base44.asServiceRole.entities.PlayerMarketValueHistory.list();

    // Get player IDs that already have at least one history entry
    const alreadyBackfilled = new Set(existing.map(h => h.player_id));

    let created = 0;
    for (const player of players) {
      if (!player.market_value) continue;
      if (alreadyBackfilled.has(player.id)) continue;

      await base44.asServiceRole.entities.PlayerMarketValueHistory.create({
        player_id: player.id,
        market_value: player.market_value,
        date: player.created_date || new Date().toISOString()
      });
      created++;
    }

    return Response.json({ success: true, backfilled: created, total_players: players.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});