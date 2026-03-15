import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { clubName } = await req.json();

    if (!clubName) {
      return Response.json({ error: 'Vereinsname fehlt' }, { status: 400 });
    }

    // Schritt 1: Vereinsprofil von der KI erstellen
    const clubProfilePrompt = `Analysiere den Fußballverein "${clubName}" umfassend. Finde aktuelle Informationen über:
    - Spielweise und taktisches System
    - Bevorzugte Formationen
    - Trainerphilosophie
    - Wichtige Spielerattribute, die gesucht werden
    - Aktuelle Transfertrends und -strategie
    - Liga und Land
    
    Gib die Informationen strukturiert zurück.`;

    const clubProfileResponse = await base44.integrations.Core.InvokeLLM({
      prompt: clubProfilePrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          playing_style: { type: "string" },
          formations: { type: "array", items: { type: "string" } },
          key_attributes: { type: "array", items: { type: "string" } },
          coach_philosophy: { type: "string" },
          transfer_trends: { type: "string" },
          league: { type: "string" },
          country: { type: "string" }
        }
      }
    });

    const clubProfile = clubProfileResponse;

    // Schritt 2: Alle Spieler im Pool abrufen
    const allPlayers = await base44.asServiceRole.entities.Player.filter({
      agency_id: user.agency_id
    });

    if (allPlayers.length === 0) {
      return Response.json({
        success: false,
        error: 'Keine Spieler im Pool gefunden'
      });
    }

    // Schritt 3: Spieler mit KI matchen
    const playersData = allPlayers.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      secondary_positions: p.secondary_positions || [],
      age: p.age,
      nationality: p.nationality,
      strengths: p.strengths,
      foot: p.foot,
      height: p.height,
      speed_rating: p.speed_rating,
      strength_rating: p.strength_rating,
      personality_traits: p.personality_traits || [],
      current_form: p.current_form
    }));

    const matchingPrompt = `Du bist ein Experte im Fußball-Scouting. Basierend auf dem folgenden Vereinsprofil, analysiere welche Spieler aus unserem Pool am besten passen würden.

Vereinsprofil für ${clubName}:
${JSON.stringify(clubProfile, null, 2)}

Verfügbare Spieler:
${JSON.stringify(playersData, null, 2)}

Analysiere jeden Spieler und gib die Top 10 Spieler zurück, die am besten zum Verein passen. Für jeden Spieler:
- Berechne einen Match-Score (0-100)
- Begründe die Empfehlung spezifisch
- Liste die wichtigsten passenden Stärken auf`;

    const matchingResponse = await base44.integrations.Core.InvokeLLM({
      prompt: matchingPrompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                player_id: { type: "string" },
                player_name: { type: "string" },
                match_score: { type: "number" },
                reasoning: { type: "string" },
                key_strengths: { type: "array", items: { type: "string" } }
              }
            }
          },
          summary: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      clubProfile: clubProfile,
      recommendations: matchingResponse.recommendations,
      summary: matchingResponse.summary,
      totalPlayersAnalyzed: allPlayers.length
    });

  } catch (error) {
    console.error('Club analysis error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Analyse fehlgeschlagen' 
    }, { status: 500 });
  }
});