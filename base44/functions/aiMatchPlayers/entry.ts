import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    const { clubRequestId } = await req.json();
    
    if (!clubRequestId) {
      return Response.json({ 
        error: 'Vereinsanfrage-ID erforderlich' 
      }, { status: 400 });
    }
    
    // Vereinsanfrage laden
    const clubRequest = await base44.entities.ClubRequest.list();
    const request = clubRequest.find(r => r.id === clubRequestId);
    
    if (!request) {
      return Response.json({ 
        error: 'Vereinsanfrage nicht gefunden' 
      }, { status: 404 });
    }
    
    // Alle Spieler der Agentur laden
    const allPlayers = await base44.entities.Player.filter({
      agency_id: user.agency_id
    });
    
    // KI-Analyse für intelligentes Matching
    const matchingPrompt = `
Du bist ein Experte für Spielervermittlung im Fußball. Analysiere die folgende Vereinsanfrage und bestimme, welche der verfügbaren Spieler am besten passen.

VEREINSANFRAGE:
- Verein: ${request.club_name}
- Position: ${request.position_needed}
- Liga: ${request.league || 'nicht angegeben'}
- Land: ${request.country || 'nicht angegeben'}
- Transfer-Arten: ${Array.isArray(request.transfer_types) ? request.transfer_types.join(', ') : 'nicht angegeben'}
- Budget Min: ${request.budget_min ? request.budget_min + '€' : 'nicht angegeben'}
- Budget Max: ${request.budget_max ? request.budget_max + '€' : 'nicht angegeben'}
- Alter Min: ${request.age_min || 'nicht angegeben'}
- Alter Max: ${request.age_max || 'nicht angegeben'}
- Gehalt Min: ${request.salary_min ? request.salary_min + '€' : 'nicht angegeben'}
- Gehalt Max: ${request.salary_max ? request.salary_max + '€' : 'nicht angegeben'}
- Zusätzliche Anforderungen: ${request.requirements || 'keine'}

VERFÜGBARE SPIELER:
${allPlayers.map((p, idx) => `
${idx + 1}. ${p.name} (ID: ${p.id})
   - Position: ${p.position}${p.secondary_positions?.length ? ', auch: ' + p.secondary_positions.join(', ') : ''}
   - Alter: ${p.age || 'unbekannt'}
   - Verein: ${p.current_club || 'unbekannt'}
   - Marktwert: ${p.market_value ? p.market_value + '€' : 'unbekannt'}
   - Vertragsende: ${p.contract_until || 'unbekannt'}
   - Nationalität: ${p.nationality || 'unbekannt'}
   - Stärken: ${p.strengths || 'nicht dokumentiert'}
   - Notizen: ${p.notes || 'keine'}
`).join('\n')}

Bewerte jeden Spieler auf einer Skala von 0-100, wie gut er zur Anfrage passt.
Berücksichtige dabei:
1. Positionsübereinstimmung (sehr wichtig)
2. Alter und Erfahrung
3. Budget und Marktwert
4. Spezielle Anforderungen aus dem Freitext
5. Spielerqualitäten und Stärken
6. Vertragssituation

Gib für jeden Spieler eine Match-Score und eine kurze Begründung.
    `;
    
    const schema = {
      type: "object",
      properties: {
        matches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              player_id: { type: "string" },
              player_name: { type: "string" },
              match_score: { type: "number" },
              reasoning: { type: "string" },
              key_strengths: { 
                type: "array",
                items: { type: "string" }
              },
              potential_concerns: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        },
        overall_analysis: { type: "string" }
      }
    };
    
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: matchingPrompt,
      response_json_schema: schema,
      model: 'gemini_3_flash'
    });
    
    // Sortiere nach Match-Score
    const sortedMatches = aiResult.matches
      .filter(m => m.match_score >= 40) // Nur relevante Matches (>40%)
      .sort((a, b) => b.match_score - a.match_score);
    
    return Response.json({
      success: true,
      matches: sortedMatches,
      analysis: aiResult.overall_analysis,
      total_players_analyzed: allPlayers.length
    });
    
  } catch (error) {
    console.error('Error in AI matching:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});