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
    const clubProfilePrompt = `Analysiere den Fußballverein "${clubName}" umfassend basierend auf aktuellen Informationen aus dem Internet (März 2026, Saison 2025/2026). Recherchiere folgende Punkte:

1. AKTUELLE SPIELWEISE UND TAKTIK:
   - Welches taktische System spielt der Verein aktuell?
   - Wie ist die Spielphilosophie (z.B. Ballbesitzfußball, Konterfußball, Pressing)?
   - Welche Formationen werden bevorzugt?

2. TRAINER UND PHILOSOPHIE:
   - Wer ist der aktuelle Trainer?
   - Welche spielerische Ausrichtung hat der Trainer?
   - Welche Spielertypen bevorzugt der Trainer?

3. AKTUELLE TRENDS UND BERICHTE:
   - Aktuelle Transfergerüchte und -ziele (März 2026)
   - Welche Positionen werden verstärkt gesucht?
   - Aktuelle Entwicklungen und Presseberichte zum Verein
   - Transferstrategie und Budget-Situation
   - WICHTIG: Aktuelle Verletzungssituation im Kader - welche Spieler fehlen verletzungsbedingt?

4. GESUCHTE SPIELERPROFILE:
   - Welche körperlichen Attribute sind wichtig (Größe, Schnelligkeit, Stärke)?
   - Welche technischen Fähigkeiten werden gesucht?
   - Welche mentalen/charakterlichen Eigenschaften sind gefragt?

5. LIGA UND WETTBEWERBSUMFELD:
   - In welcher Liga spielt der Verein?
   - Land und Wettbewerbsniveau

Gib ausführliche, aktuelle Informationen zurück, insbesondere zu aktuellen Verletzungen und daraus resultierenden Transferbedarf.`;

    const clubProfileResponse = await base44.integrations.Core.InvokeLLM({
      prompt: clubProfilePrompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
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
          injury_situation: { type: "string" },
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

    console.log(`Gefundene Spieler: ${allPlayers.length}`);

    if (allPlayers.length === 0) {
      return Response.json({
        success: false,
        error: 'Keine Spieler im Pool gefunden'
      });
    }

    // Schritt 3: Spieler detailliert mit KI matchen - Alle relevanten Daten mitgeben
    const playersData = allPlayers.map(p => {
      const playerData = {
        id: p.id,
        name: p.name,
        position: p.position,
        secondary_positions: p.secondary_positions || [],
        age: p.age || 'N/A',
        nationality: p.nationality || 'N/A',
        current_club: p.current_club || 'Vereinslos',
        market_value: p.market_value || 0,
        strengths: p.strengths || 'Keine Angaben',
        foot: p.foot || 'N/A',
        height: p.height || 0,
        speed_rating: p.speed_rating || 0,
        strength_rating: p.strength_rating || 0,
        stamina_rating: p.stamina_rating || 0,
        agility_rating: p.agility_rating || 0,
        personality_traits: p.personality_traits || [],
        current_form: p.current_form || 'N/A',
        contract_until: p.contract_until || 'N/A'
      };
      return playerData;
    });

    console.log(`Spielerdaten vorbereitet für Matching: ${playersData.length} Spieler`);

    // LÖSUNG: Kompakter JSON-Ansatz für bessere KI-Verarbeitung
    console.log('Starte KI-Matching mit kompakten Spielerdaten...');

    const matchingPrompt = `Du bist ein Fußball-Scout-Experte. Analysiere die Spieler und empfehle die TOP 10 für "${clubName}".

VEREINSPROFIL:
Spielweise: ${clubProfile.playing_style}
Formationen: ${clubProfile.formations?.join(', ') || 'N/A'}
Trainer: ${clubProfile.current_coach || 'N/A'}
Philosophie: ${clubProfile.coach_philosophy || 'N/A'}
Gesuchte Attribute: ${clubProfile.key_attributes?.join(', ') || 'N/A'}
Gesuchte Positionen: ${clubProfile.target_positions?.join(', ') || 'Alle'}
Liga: ${clubProfile.league || 'N/A'} (${clubProfile.country || 'N/A'})

VERFÜGBARE SPIELER (${playersData.length}):
${JSON.stringify(playersData.slice(0, 50), null, 2)}

${playersData.length > 50 ? `\n... und ${playersData.length - 50} weitere Spieler:\n${JSON.stringify(playersData.slice(50).map(p => ({ id: p.id, name: p.name, position: p.position, age: p.age })), null, 2)}` : ''}

WICHTIG:
- Analysiere ALLE ${playersData.length} Spieler
- Wähle die TOP 10 basierend auf Vereinsprofil
- Nutze die player_id aus der Liste
- Match-Score 0-100
- Konkrete Begründungen

ANTWORTE NUR mit folgendem JSON-Format (kein Markdown, kein Text drumherum):
{
  "recommendations": [
    {
      "player_id": "die_exakte_id_aus_der_liste",
      "player_name": "Spielername",
      "match_score": 85,
      "reasoning": "Detaillierte Begründung warum dieser Spieler passt",
      "key_strengths": ["Stärke 1", "Stärke 2", "Stärke 3"]
    }
  ],
  "summary": "Gesamteinschätzung der Empfehlungen"
}`;

    const matchingResponse = await base44.integrations.Core.InvokeLLM({
      prompt: matchingPrompt,
      model: 'gpt_5_mini'
    });

    console.log('Raw LLM Response:', matchingResponse);

    // Parse die Antwort falls String
    let parsedResponse;
    if (typeof matchingResponse === 'string') {
      try {
        // Extrahiere JSON aus Markdown falls vorhanden
        const jsonMatch = matchingResponse.match(/```json\n([\s\S]*?)\n```/) || matchingResponse.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[1]);
        } else {
          parsedResponse = JSON.parse(matchingResponse);
        }
      } catch (e) {
        console.error('JSON Parse Error:', e);
        return Response.json({
          success: false,
          error: 'KI-Antwort konnte nicht verarbeitet werden.'
        });
      }
    } else {
      parsedResponse = matchingResponse;
    }

    console.log(`Empfehlungen gefunden: ${parsedResponse?.recommendations?.length || 0}`);

    // Validierung
    if (!parsedResponse || !parsedResponse.recommendations || parsedResponse.recommendations.length === 0) {
      console.error('Keine Empfehlungen in parsedResponse:', parsedResponse);
      return Response.json({
        success: false,
        error: 'Die KI konnte keine passenden Spieler finden.'
      });
    }

    return Response.json({
      success: true,
      clubProfile: clubProfile,
      recommendations: parsedResponse.recommendations,
      summary: parsedResponse.summary || 'Analyse abgeschlossen',
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