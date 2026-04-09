import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (event.type === 'create') {
      if (data && data.market_value != null) {
        await base44.asServiceRole.entities.PlayerMarketValueHistory.create({
          player_id: event.entity_id,
          market_value: data.market_value,
          date: data.created_date || new Date().toISOString()
        });
        return Response.json({ success: true, event: 'create', player_id: event.entity_id });
      }
      return Response.json({ skipped: true, reason: 'no market_value on create' });
    }

    if (event.type === 'update') {
      const oldValue = old_data ? old_data.market_value : null;
      const newValue = data ? data.market_value : null;

      if (newValue != null && oldValue !== newValue) {
        await base44.asServiceRole.entities.PlayerMarketValueHistory.create({
          player_id: event.entity_id,
          market_value: newValue,
          date: new Date().toISOString()
        });
        return Response.json({ success: true, event: 'update', player_id: event.entity_id, market_value: newValue });
      }
      return Response.json({ skipped: true, reason: 'market_value unchanged' });
    }

    return Response.json({ skipped: true, reason: 'unhandled event type' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});