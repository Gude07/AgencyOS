import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { referencePlayerName, referencePlayerId } = await req.json();
    if (!referencePlayerName) return Response.json({ error: 'Spielername fehlt' }, { status: 400 });

    const allPlayers = await base44.asServiceRole.entities.Player.filter({ agency_id: user.agency_id });

    let referencePlayer = null;
    if (referencePlayerId) {
      referencePlayer = allPlayers.find(p => p.id === referencePlayerId);
    }
    if (!referencePlayer) {
      referencePlayer = allPlayers.find(p => p.name.toLowerCase().includes(referencePlayerName.toLowerCase()));
    }

    const otherPlayers = allPlayers.filter(p => p.id !== referencePlayer?.id).map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      secondary_positions: p.secondary_positions || [],
      age: p.age,
      nationality: p.nationality,
      market_value: p.market_value || 0,
      strengths: p.strengths || '',
      foot: p.foot,
      height: p.height,
      speed_rating: p.speed_rating || 0,
      strength_rating: p.strength_rating || 0,
      stamina_rating: p.stamina_rating || 0,
      agility_rating: p.agility_rating || 0,
      personality_traits: p.personality_traits || [],
      current_form: p.current_form
    }));

    const refProfile = referencePlayer ? {
      id: referencePlayer.id,
      name: referencePlayer.name,
      position: referencePlayer.position,
      secondary_positions: referencePlayer.secondary_positions || [],
      age: referencePlayer.age,
      nationality: referencePlayer.nationality,
      market_value: referencePlayer.market_value || 0,
      strengths: referencePlayer.strengths || '',
      foot: referencePlayer.foot,
      height: referencePlayer.height,
      speed_rating: referencePlayer.speed_rating || 0,
      strength_rating: referencePlayer.strength_rating || 0,
      stamina_rating: referencePlayer.stamina_rating || 0,
      agility_rating: referencePlayer.agility_rating || 0,
      personality_traits: referencePlayer.personality_traits || [],
      current_form: referencePlayer.current_form
    } : { name: referencePlayerName };

    const prompt = `Du bist Fußball-Scout-Experte. Finde die ähnlichsten Spieler zum Referenzspieler in unserem Pool.

REFERENZSPIELER:
${JSON.stringify(refProfile, null, 2)}

SPIELER-POOL (${otherPlayers.length} Spieler):
${JSON.stringify(otherPlayers, null, 2)}

Analysiere alle Spieler und finde die TOP 5 ähnlichsten Spieler basierend auf:
- Spielertyp und Position
- Physische Attribute (Größe, Tempo, Stärke)
- Spielstil und Stärken
- Alter und Entwicklungsphase
- Persönlichkeitsmerkmale

ANTWORTE NUR mit JSON:
{
  "similar_players": [
    {
      "player_id": "...",
      "player_name": "...",
      "similarity_score": 85,
      "similarity_reasons": ["Grund 1", "Grund 2"],
      "key_differences": ["Unterschied 1"],
      "verdict": "Kurze Einschätzung"
    }
  ],
  "reference_profile_summary": "Kurze Beschreibung des Spielertyps des Referenzspielers"
}`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gpt_5' });

    let parsed;
    if (typeof response === 'string') {
      try {
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(response);
      } catch (e) {
        return Response.json({ success: false, error: 'Antwort konnte nicht verarbeitet werden' });
      }
    } else {
      parsed = response;
    }

    return Response.json({ success: true, ...parsed, referencePlayer: refProfile });

  } catch (error) {
    console.error('Similar players error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});