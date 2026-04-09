import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    // Only process update events where market_value changed
    if (event.type !== 'update') {
      return Response.json({ skipped: true, reason: 'not an update event' });
    }

    const oldValue = old_data?.market_value;
    const newValue = data?.market_value;

    // Skip if market_value didn't change or is not set
    if (newValue == null || oldValue === newValue) {
      return Response.json({ skipped: true, reason: 'market_value unchanged' });
    }

    // Create a history entry
    await base44.asServiceRole.entities.PlayerMarketValueHistory.create({
      player_id: event.entity_id,
      market_value: newValue,
      date: new Date().toISOString()
    });

    return Response.json({ success: true, player_id: event.entity_id, market_value: newValue });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});