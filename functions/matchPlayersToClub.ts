import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { clubName, clubProfile } = await req.json();

    if (!clubName || !clubProfile) {
      return Response.json({ error: 'Vereinsname oder Profil fehlt' }, { status: 400 });
    }

    console.log(`Starte Spieler-Matching für: ${clubName}`);

    // Hole alle Spieler
    const allPlayers = await base44.asServiceRole.entities.Player.filter({
      agency_id: user.agency_id
    });

    console.log(`Gefundene Spieler gesamt: ${allPlayers.length}`);

    if (allPlayers.length === 0) {
      return Response.json({
        success: false,
        error: 'Keine Spieler im Pool gefunden'
      });
    }

    // Filtere Spieler nach gesuchten Positionen
    const targetPositions = clubProfile.target_positions || [];
    let relevantPlayers = allPlayers;

    if (targetPositions.length > 0) {
      relevantPlayers = allPlayers.filter(p => {
        const playerPositions = [p.position, ...(p.secondary_positions || [])];
        return playerPositions.some(pos => 
          targetPositions.some(target => 
            pos.toLowerCase().includes(target.toLowerCase()) || 
            target.toLowerCase().includes(pos.toLowerCase())
          )
        );
      });
      console.log(`Gefilterte Spieler nach Position: ${relevantPlayers.length}`);
    }

    // Filtere zusätzlich nach Budget, wenn vorhanden
    if (clubProfile.realistic_budget && clubProfile.realistic_budget.max > 0) {
      const budgetMin = clubProfile.realistic_budget.min || 0;
      const budgetMax = clubProfile.realistic_budget.max;
      const budgetAvg = clubProfile.realistic_budget.average || budgetMax;

      // Bei hohem Budget (>15 Mio): Spieler sollten mindestens 30% des Durchschnittsbudgets wert sein
      // Bei mittlerem Budget (5-15 Mio): Spieler sollten mindestens 20% wert sein
      // Bei niedrigem Budget (<5 Mio): Keine Mindestgrenze
      let minMarketValue = 0;
      if (budgetAvg > 15000000) {
        minMarketValue = budgetAvg * 0.3;
      } else if (budgetAvg > 5000000) {
        minMarketValue = budgetAvg * 0.2;
      }

      relevantPlayers = relevantPlayers.filter(p => {
        const marketValue = p.market_value || 0;
        return marketValue >= minMarketValue && marketValue <= budgetMax * 1.2; // 20% Toleranz nach oben
      });

      console.log(`Budget-Filter angewendet (${budgetMin}€ - ${budgetMax}€, Min: ${minMarketValue}€): ${relevantPlayers.length} Spieler`);
    }

    if (relevantPlayers.length === 0) {
      return Response.json({
        success: false,
        error: 'Keine Spieler gefunden, die zu den gesuchten Positionen und dem Budget passen'
      });
    }

    // Erstelle kompakte Spielerliste
    const playersForAnalysis = relevantPlayers.map(p => ({
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
      current_form: p.current_form || 'N/A'
    }));

    console.log(`Analysiere ${playersForAnalysis.length} relevante Spieler...`);

    // KI-Matching
    const matchingPrompt = `Du bist Fußball-Scout-Experte. Analysiere die ${playersForAnalysis.length} Spieler und empfehle die TOP 10 für "${clubName}".

VEREINSPROFIL:
- Spielweise: ${clubProfile.playing_style || 'N/A'}
- Formationen: ${clubProfile.formations?.join(', ') || 'N/A'}
- Trainer: ${clubProfile.current_coach || 'N/A'}
- Philosophie: ${clubProfile.coach_philosophy || 'N/A'}
- Gesuchte Attribute: ${clubProfile.key_attributes?.join(', ') || 'N/A'}
- Gesuchte Positionen: ${targetPositions.join(', ') || 'Alle'}
- Verletzungssituation: ${clubProfile.injury_situation || 'N/A'}
- Liga: ${clubProfile.league || 'N/A'} (${clubProfile.country || 'N/A'})
- Realistisches Budget: ${clubProfile.realistic_budget ? `${clubProfile.realistic_budget.min}€ - ${clubProfile.realistic_budget.max}€ (Ø ${clubProfile.realistic_budget.average}€)` : 'N/A'}
- Budget-Hinweise: ${clubProfile.realistic_budget?.notes || 'N/A'}

VERFÜGBARE SPIELER (${playersForAnalysis.length}):
${JSON.stringify(playersForAnalysis, null, 2)}

AUFGABE:
Analysiere JEDEN der ${playersForAnalysis.length} Spieler einzeln und wähle die TOP 10 aus, die am besten zum Vereinsprofil passen.

Bewertungskriterien:
- Passung zur gesuchten Position
- Übereinstimmung mit Spielweise und Philosophie
- Physische Voraussetzungen (Größe, Tempo, Kraft)
- Technische Fähigkeiten
- Charaktereigenschaften
- Alter und Entwicklungspotenzial
- Aktuelle Form
- WICHTIG Budget-Logik: 
  * Marktwert muss im Budget-Rahmen liegen (${clubProfile.realistic_budget ? `${clubProfile.realistic_budget.min?.toLocaleString('de-DE')}€ - ${clubProfile.realistic_budget.max?.toLocaleString('de-DE')}€` : 'nicht definiert'})
  * Bei hohem Budget (>15 Mio): BEVORZUGE Spieler im oberen Marktwert-Segment, die dem Budget entsprechen
  * Bei mittlerem Budget (5-15 Mio): Wähle Spieler mit angemessenem Marktwert zum Budget
  * Je höher das Budget, desto höher sollte auch der durchschnittliche Marktwert der empfohlenen Spieler sein
  * Vermeide Spieler mit zu niedrigem Marktwert bei hohem Budget (wirkt unrealistisch)

ANTWORTE NUR mit folgendem JSON-Format:
{
  "recommendations": [
    {
      "player_id": "exakte_id_aus_der_liste",
      "player_name": "Name",
      "match_score": 85,
      "reasoning": "Detaillierte Begründung mit konkreten Bezügen",
      "key_strengths": ["Stärke 1", "Stärke 2", "Stärke 3"]
    }
  ],
  "summary": "Gesamteinschätzung der Empfehlungen"
}`;

    const matchingResponse = await base44.integrations.Core.InvokeLLM({
      prompt: matchingPrompt,
      model: 'gpt_5'
    });

    console.log('Raw matching response erhalten');

    // Parse Response
    let parsedResponse;
    if (typeof matchingResponse === 'string') {
      try {
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
          error: 'KI-Antwort konnte nicht verarbeitet werden'
        });
      }
    } else {
      parsedResponse = matchingResponse;
    }

    console.log(`Empfehlungen gefunden: ${parsedResponse?.recommendations?.length || 0}`);

    if (!parsedResponse || !parsedResponse.recommendations || parsedResponse.recommendations.length === 0) {
      return Response.json({
        success: false,
        error: 'Keine passenden Spieler gefunden'
      });
    }

    return Response.json({
      success: true,
      recommendations: parsedResponse.recommendations,
      summary: parsedResponse.summary || 'Analyse abgeschlossen',
      analyzedPlayers: playersForAnalysis.length
    });

  } catch (error) {
    console.error('Matching error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Matching fehlgeschlagen' 
    }, { status: 500 });
  }
});