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

    // Schritt 1: Vereinsprofil von der KI erstellen mit aktuellen Internet-Daten
    const clubProfilePrompt = `Analysiere den Fußballverein "${clubName}" umfassend basierend auf aktuellen Informationen aus dem Internet (2025/2026 Saison). Recherchiere folgende Punkte:

1. AKTUELLE SPIELWEISE UND TAKTIK:
   - Welches taktische System spielt der Verein aktuell?
   - Wie ist die Spielphilosophie (z.B. Ballbesitzfußball, Konterfußball, Pressing)?
   - Welche Formationen werden bevorzugt?

2. TRAINER UND PHILOSOPHIE:
   - Wer ist der aktuelle Trainer?
   - Welche spielerische Ausrichtung hat der Trainer?
   - Welche Spielertypen bevorzugt der Trainer?

3. AKTUELLE TRENDS UND BERICHTE:
   - Aktuelle Transfergerüchte und -ziele
   - Welche Positionen werden verstärkt gesucht?
   - Aktuelle Entwicklungen und Presseberichte zum Verein
   - Transferstrategie und Budget-Situation

4. GESUCHTE SPIELERPROFILE:
   - Welche körperlichen Attribute sind wichtig (Größe, Schnelligkeit, Stärke)?
   - Welche technischen Fähigkeiten werden gesucht?
   - Welche mentalen/charakterlichen Eigenschaften sind gefragt?

5. LIGA UND WETTBEWERBSUMFELD:
   - In welcher Liga spielt der Verein?
   - Land und Wettbewerbsniveau

Gib ausführliche, aktuelle Informationen zurück.`;

    const clubProfileResponse = await base44.integrations.Core.InvokeLLM({
      prompt: clubProfilePrompt,
      add_context_from_internet: true,
      model: 'gemini_3_pro',
      response_json_schema: {
        type: "object",
        properties: {
          playing_style: { type: "string" },
          formations: { type: "array", items: { type: "string" } },
          key_attributes: { type: "array", items: { type: "string" } },
          coach_philosophy: { type: "string" },
          current_coach: { type: "string" },
          transfer_trends: { type: "string" },
          current_reports: { type: "string" },
          target_positions: { type: "array", items: { type: "string" } },
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

    // Schritt 3: Spieler detailliert mit KI matchen
    const playersData = allPlayers.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      secondary_positions: p.secondary_positions || [],
      age: p.age,
      nationality: p.nationality,
      current_club: p.current_club,
      market_value: p.market_value,
      strengths: p.strengths,
      foot: p.foot,
      height: p.height,
      speed_rating: p.speed_rating,
      strength_rating: p.strength_rating,
      stamina_rating: p.stamina_rating,
      agility_rating: p.agility_rating,
      personality_traits: p.personality_traits || [],
      current_form: p.current_form
    }));

    const matchingPrompt = `Du bist ein erfahrener Fußball-Scout und Transfer-Experte. Analysiere JEDEN einzelnen Spieler aus unserem Pool im Detail und vergleiche ihn mit den Anforderungen des Vereins "${clubName}".

VEREINSPROFIL:
${JSON.stringify(clubProfile, null, 2)}

VERFÜGBARE SPIELER IM POOL (${playersData.length} Spieler):
${JSON.stringify(playersData, null, 2)}

AUFGABE:
1. Gehe JEDEN Spieler einzeln durch
2. Vergleiche die Position des Spielers mit den gesuchten Positionen des Vereins
3. Bewerte die Passung basierend auf:
   - Taktische Eignung für die Spielweise
   - Physische Attribute (Größe, Schnelligkeit, Stärke)
   - Technische Fähigkeiten (aus Strengths)
   - Charaktereigenschaften (Personality Traits)
   - Alter und Entwicklungspotenzial
   - Aktuelle Form

4. Gib die TOP 10 BESTPASSENDEN Spieler zurück (sortiert nach Match-Score)

FÜR JEDEN EMPFOHLENEN SPIELER:
- Match-Score: 0-100 (sei präzise, nutze das volle Spektrum)
- Detaillierte Begründung: Erkläre KONKRET warum dieser Spieler zum Verein passt
- Key Strengths: Liste die 3-5 wichtigsten passenden Stärken auf
- Verwende die tatsächlichen Daten des Spielers in der Begründung

WICHTIG: Stelle sicher, dass du wirklich alle ${playersData.length} Spieler analysierst und die besten auswählst!`;

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
              },
              required: ["player_id", "player_name", "match_score", "reasoning", "key_strengths"]
            }
          },
          summary: { type: "string" }
        },
        required: ["recommendations", "summary"]
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