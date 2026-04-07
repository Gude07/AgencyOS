import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const records = await base44.entities.SavedPlayerComparison.list(
    '-created_date',
    100
  );

  const parsed = records.map(r => ({
    ...r,
    player_profile: r.player_profile ? JSON.parse(r.player_profile) : {},
    similar_players: r.similar_players ? JSON.parse(r.similar_players) : [],
    fit_results: r.fit_results ? JSON.parse(r.fit_results) : [],
    club_replacement: r.club_replacement ? JSON.parse(r.club_replacement) : null
  }));

  return Response.json({ success: true, comparisons: parsed });
});