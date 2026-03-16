import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { reference_player, reference_club, player_profile, similar_players, fit_results, club_replacement } = body;

  if (!reference_player || !reference_club) {
    return Response.json({ error: 'reference_player und reference_club erforderlich' }, { status: 400 });
  }

  const record = await base44.entities.SavedPlayerComparison.create({
    reference_player,
    reference_club,
    player_profile: JSON.stringify(player_profile || {}),
    similar_players: JSON.stringify(similar_players || []),
    fit_results: JSON.stringify(fit_results || []),
    club_replacement: JSON.stringify(club_replacement || null),
    created_by_user: user.email,
    analysis_date: new Date().toISOString()
  });

  return Response.json({ success: true, id: record.id });
});