import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { player_id } = await req.json();

    if (!player_id) {
      return Response.json({ error: 'Missing player_id' }, { status: 400 });
    }

    // Fetch player data
    const players = await base44.asServiceRole.entities.Player.list();
    const player = players.find(p => p.id === player_id);

    if (!player) {
      return Response.json({ error: 'Player not found' }, { status: 404 });
    }

    // Fetch related data
    const careerStats = await base44.asServiceRole.entities.PlayerCareerStat.filter({ player_id });
    const scoutingReports = await base44.asServiceRole.entities.ScoutingReport.filter({ player_id });
    const comments = await base44.asServiceRole.entities.PlayerComment.filter({ player_id });
    const clubRequests = await base44.asServiceRole.entities.ClubRequest.list();
    
    // Get matched requests
    const matchedRequests = clubRequests.filter(req => 
      player.matched_requests?.includes(req.id) || 
      player.favorite_matches?.includes(req.id)
    );

    // Build comprehensive analysis prompt
    const prompt = `Du bist ein erfahrener Fußball-Scout und Transferberater. Analysiere das vollständige Profil dieses Spielers und erstelle eine detaillierte Bewertung.

SPIELER: ${player.name}

GRUNDDATEN:
- Alter: ${player.age || 'unbekannt'}
- Position: ${player.position}
- Nebenpositionen: ${player.secondary_positions?.join(', ') || 'keine'}
- Aktueller Verein: ${player.current_club || 'unbekannt'}
- Nationalität: ${player.nationality || 'unbekannt'}
- Vertrag bis: ${player.contract_until || 'unbekannt'}
- Marktwert: ${player.market_value ? `${(player.market_value/1000000).toFixed(1)}M €` : 'unbekannt'}
- Starker Fuß: ${player.foot || 'unbekannt'}
- Größe: ${player.height ? `${player.height} cm` : 'unbekannt'}

PHYSISCHE ATTRIBUTE:
${player.speed_rating ? `- Tempo: ${player.speed_rating}/10` : ''}
${player.strength_rating ? `- Stärke: ${player.strength_rating}/10` : ''}
${player.stamina_rating ? `- Ausdauer: ${player.stamina_rating}/10` : ''}
${player.agility_rating ? `- Agilität: ${player.agility_rating}/10` : ''}

PERSÖNLICHKEIT:
${player.personality_traits?.length > 0 ? player.personality_traits.join(', ') : 'Keine Angaben'}

AKTUELLE FORM:
${player.current_form ? `${player.current_form}` : 'Keine Angaben'}
${player.form_description ? `Details: ${player.form_description}` : ''}

STÄRKEN:
${player.strengths || 'Keine Angaben'}

NOTIZEN:
${player.notes || 'Keine Notizen'}

KARRIERESTATISTIKEN (letzte Saisons):
${careerStats.length > 0 ? JSON.stringify(careerStats.slice(0, 5), null, 2) : 'Keine Statistiken verfügbar'}

SCOUTING-BERICHTE:
${scoutingReports.length > 0 ? JSON.stringify(scoutingReports.slice(0, 3).map(r => ({
  date: r.report_date,
  scout: r.scout_name,
  rating: r.overall_rating,
  recommendation: r.recommendation,
  strengths: r.strengths,
  weaknesses: r.weaknesses,
  potential: r.potential
})), null, 2) : 'Keine Scouting-Berichte'}

SPIELERPRÄFERENZEN:
${player.preferences ? JSON.stringify(player.preferences, null, 2) : 'Keine Präferenzen definiert'}

AKTUELLE MATCHES/ANFRAGEN:
${matchedRequests.length > 0 ? matchedRequests.map(r => `- ${r.club_name} (${r.league}, ${r.position_needed})`).join('\n') : 'Keine aktuellen Matches'}

KOMMENTARE (letzte 3):
${comments.length > 0 ? comments.slice(0, 3).map(c => `- ${c.created_by}: ${c.content}`).join('\n') : 'Keine Kommentare'}

Erstelle eine umfassende KI-Analyse mit folgenden Punkten:
1. Gesamtbewertung des Spielers (Stärken, Schwächen, Potenzial)
2. Spielstil und taktische Eignung
3. Transfermarkt-Einschätzung (Wert, Nachfrage, beste Zeitpunkt)
4. Empfehlung für die Agentur (nächste Schritte, passende Vereine)
5. Risiken und Chancen`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_rating: { 
            type: "number", 
            minimum: 1, 
            maximum: 10,
            description: "Gesamtbewertung 1-10" 
          },
          summary: { 
            type: "string",
            description: "2-3 Sätze Zusammenfassung" 
          },
          strengths: {
            type: "array",
            items: { type: "string" },
            description: "5-7 konkrete Stärken"
          },
          weaknesses: {
            type: "array",
            items: { type: "string" },
            description: "3-5 Schwächen oder Entwicklungsbereiche"
          },
          playing_style: {
            type: "string",
            description: "Detaillierte Beschreibung des Spielstils (3-4 Sätze)"
          },
          tactical_fit: {
            type: "array",
            items: { type: "string" },
            description: "Passende Systeme/Taktiken (z.B. '4-3-3 als Flügelstürmer')"
          },
          market_value_assessment: {
            type: "object",
            properties: {
              current_value_fair: { type: "boolean" },
              estimated_value: { type: "string", description: "z.B. '2-3M €'" },
              trend: { type: "string", enum: ["steigend", "stabil", "fallend"] },
              reasoning: { type: "string" }
            }
          },
          transfer_timing: {
            type: "string",
            enum: ["sofort", "winter_2025_26", "sommer_2026", "später"],
            description: "Bester Zeitpunkt für Transfer"
          },
          suitable_clubs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                league_type: { type: "string", description: "z.B. 'Top 5 Ligen', '2. Bundesliga'" },
                club_profile: { type: "string" },
                reasoning: { type: "string" }
              }
            }
          },
          risks: {
            type: "array",
            items: { type: "string" },
            description: "Potenzielle Risiken (Verletzungen, Form, etc.)"
          },
          opportunities: {
            type: "array",
            items: { type: "string" },
            description: "Chancen und Potenziale"
          },
          next_steps: {
            type: "array",
            items: { type: "string" },
            description: "3-5 konkrete Handlungsempfehlungen für die Agentur"
          }
        }
      }
    });

    return Response.json({ success: true, analysis: result });

  } catch (error) {
    console.error('Error analyzing player:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});