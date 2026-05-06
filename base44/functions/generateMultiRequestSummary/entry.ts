import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestIds } = await req.json();
    if (!requestIds || requestIds.length === 0) {
      return Response.json({ error: 'Keine Anfragen angegeben' }, { status: 400 });
    }

    // Fetch all required data in parallel
    const [allRequests, allPlayers] = await Promise.all([
      base44.entities.ClubRequest.list(),
      base44.entities.Player.list(),
    ]);

    const selectedRequests = allRequests.filter(r => requestIds.includes(r.id));
    
    if (selectedRequests.length === 0) {
      return Response.json({ error: 'Keine passenden Anfragen gefunden' }, { status: 404 });
    }

    // For each request, collect favorited players (from shortlist) + top matched players
    const requestSummaries = selectedRequests.map(req => {
      const shortlistedPlayerIds = req.shortlist || [];
      const favoritedPlayers = allPlayers.filter(p => shortlistedPlayerIds.includes(p.id));
      
      // Also find top matched (non-shortlisted) players by position
      const matchedPlayerIds = req.matched_players || [];
      const additionalMatches = allPlayers
        .filter(p => matchedPlayerIds.includes(p.id) && !shortlistedPlayerIds.includes(p.id))
        .slice(0, 3); // Max 3 additional non-shortlisted matches

      return {
        club: req.club_name,
        league: req.league,
        country: req.country,
        position: req.position_needed,
        soughtFoot: req.sought_foot,
        transferTypes: req.transfer_types?.join(', '),
        budgetMin: req.budget_min,
        budgetMax: req.budget_max,
        ageMin: req.age_min,
        ageMax: req.age_max,
        transferPeriod: req.transfer_period,
        priority: req.priority,
        requirements: req.requirements,
        shortlistedPlayers: favoritedPlayers.map(p => ({
          name: p.name,
          position: p.position,
          age: p.age,
          foot: p.foot,
          currentClub: p.current_club,
          marketValue: p.market_value,
          contractUntil: p.contract_until,
          nationality: p.nationality,
          strengths: p.strengths,
        })),
        additionalMatches: additionalMatches.map(p => ({
          name: p.name,
          position: p.position,
          age: p.age,
          foot: p.foot,
          currentClub: p.current_club,
          marketValue: p.market_value,
          contractUntil: p.contract_until,
          nationality: p.nationality,
        })),
      };
    });

    const prompt = `Du bist ein erfahrener Fußball-Scout und Berater einer Spieleragentur. Erstelle eine professionelle, strukturierte Zusammenfassung für folgende ${selectedRequests.length} Vereinsanfragen und ihre potenziellen Spielerkandidaten.

VEREINSANFRAGEN & SPIELER:
${JSON.stringify(requestSummaries, null, 2)}

AUFGABE:
Erstelle eine prägnante Zusammenfassung mit folgender Struktur:

1. **ÜBERBLICK** (2-3 Sätze): Kurze Gesamtübersicht über die analysierten Anfragen und die wichtigsten Erkenntnisse.

2. **PRO VEREIN** (für jeden Verein):
   - Vereinsname & Anforderungen (Position, Budget, Alter, Fuß)
   - **Shortlist-Spieler** (falls vorhanden): Für jeden Spieler: Name, Position, Alter, Verein, Marktwert, Stärken und warum er gut passt
   - **Weitere mögliche Kandidaten** (falls vorhanden): Kurze Nennung mit Begründung
   - Empfehlung/nächste Schritte

3. **SPIELER IM FOKUS**: Wenn ein Spieler zu MEHREREN Anfragen passt, hebe das explizit hervor – das ist besonders wertvoll für die Agentur.

4. **HANDLUNGSEMPFEHLUNGEN**: 2-3 konkrete nächste Schritte.

Schreibe professionell und prägnant. Nutze Aufzählungen für bessere Lesbarkeit. Antworte auf DEUTSCH.`;

    const summary = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
    });

    return Response.json({ summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});