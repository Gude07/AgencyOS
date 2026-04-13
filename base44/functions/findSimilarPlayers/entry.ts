import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { referencePlayerName, referencePlayerId, budget_max, budget_min, age_min, age_max, position, club_league, club_name } = await req.json();
    if (!referencePlayerName) return Response.json({ error: 'Spielername fehlt' }, { status: 400 });

    const allPlayers = await base44.asServiceRole.entities.Player.filter({ agency_id: user.agency_id });

    // Find reference player in system
    let referencePlayer = null;
    if (referencePlayerId) referencePlayer = allPlayers.find(p => p.id === referencePlayerId);
    if (!referencePlayer) referencePlayer = allPlayers.find(p => p.name.toLowerCase().includes(referencePlayerName.toLowerCase()));

    // STEP 1: Research the reference player thoroughly via internet (especially if not in system)
    const researchPrompt = `Recherchiere detailliert über den Fußballspieler "${referencePlayerName}".

Suche nach folgenden konkreten Informationen:
- Vollständiger Name und aktueller Verein (Stand 2025/2026)
- Genaue Position und Spielstil (z.B. Box-to-Box-Mittelfeldspieler, falsche Neun, Pressing-Stürmer)
- Physische Merkmale: Größe, Gewicht, starker Fuß, Alter
- Technische Stärken und Schwächen (konkreter Beispiele aus Spielen)
- Taktisches Profil: Pressing-Intensität, Ballbesitzspiel, Zweikampfwerte
- Aktuelle Saisonstatistiken 2024/25: Spiele, Tore, Vorlagen, Kilometer gelaufen
- Marktwert und Vertragsende
- Charakteristisches Spielprofil: Was macht diesen Spieler einzigartig?

Antworte als JSON:
{
  "full_name": "...",
  "current_club": "...",
  "age": 25,
  "position": "...",
  "nationality": "...",
  "height_cm": 183,
  "foot": "rechts",
  "market_value_eur": 45000000,
  "contract_until": "2027",
  "playing_style": "Ausführliche Beschreibung des Spielstils...",
  "key_strengths": ["Stärke 1", "Stärke 2", "Stärke 3"],
  "weaknesses": ["Schwäche 1"],
  "physical_profile": "Beschreibung physischer Eigenschaften",
  "tactical_profile": "Taktische Eigenschaften",
  "stats_2024_25": "Statistiken der aktuellen/letzten Saison",
  "player_archetype": "Spieler-Archetyp (z.B. 'Moderner Box-to-Box CM mit hoher Pressingintensität')"
}`;

    const playerResearch = await base44.integrations.Core.InvokeLLM({
      prompt: researchPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          full_name: { type: "string" },
          current_club: { type: "string" },
          age: { type: "number" },
          position: { type: "string" },
          nationality: { type: "string" },
          height_cm: { type: "number" },
          foot: { type: "string" },
          market_value_eur: { type: "number" },
          contract_until: { type: "string" },
          playing_style: { type: "string" },
          key_strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          physical_profile: { type: "string" },
          tactical_profile: { type: "string" },
          stats_2024_25: { type: "string" },
          player_archetype: { type: "string" }
        }
      }
    });

    // Merge with system data if available
    const refProfile = {
      ...(referencePlayer || {}),
      name: referencePlayerName,
      ...playerResearch
    };

    // STEP 2: Find similar players from our system (top half)
    // Derive reasonable budget range from club league if not explicitly set
    let effectiveBudgetMax = budget_max;
    let effectiveBudgetMin = budget_min;
    if (!effectiveBudgetMax && club_league) {
      // Heuristic budget caps by league tier
      const leagueLower = club_league.toLowerCase();
      if (leagueLower.includes('champions') || leagueLower.includes('premier') || leagueLower.includes('bundesliga') || leagueLower.includes('la liga') || leagueLower.includes('serie a') || leagueLower.includes('ligue 1')) {
        effectiveBudgetMax = 80_000_000;
      } else if (leagueLower.includes('2. bundesliga') || leagueLower.includes('championship') || leagueLower.includes('serie b') || leagueLower.includes('segunda')) {
        effectiveBudgetMax = 8_000_000;
      } else if (leagueLower.includes('3') || leagueLower.includes('third') || leagueLower.includes('dritte')) {
        effectiveBudgetMax = 2_000_000;
      } else {
        effectiveBudgetMax = 20_000_000;
      }
    }

    const budgetInfo = effectiveBudgetMax
      ? `Budget-Rahmen des Vereins (${club_name || 'Verein'} in ${club_league || 'unbekannte Liga'}): max. €${effectiveBudgetMax.toLocaleString()}${effectiveBudgetMin ? `, min. €${effectiveBudgetMin.toLocaleString()}` : ''}. NUR Spieler vorschlagen, die in diesen Budget-Rahmen passen!`
      : 'Kein Budget-Limit gesetzt';
    const budgetFilter = budgetInfo;
    const ageFilter = (age_min || age_max) ? `Alter: ${age_min || 0}-${age_max || 40} Jahre` : '';

    const systemPlayers = allPlayers.filter(p => p.id !== referencePlayer?.id).map(p => ({
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
      current_form: p.current_form,
      contract_until: p.contract_until
    }));

    const systemPrompt = `Du bist Fußball-Scout-Experte. Finde die ähnlichsten Spieler zum Referenzspieler in unserem Pool.

REFERENZSPIELER (recherchiertes Profil):
${JSON.stringify(refProfile, null, 2)}

SPIELER-POOL (${systemPlayers.length} Spieler aus unserem System):
${JSON.stringify(systemPlayers, null, 2)}

FILTER: ${budgetFilter}. ${ageFilter}

Analysiere alle Spieler und finde die TOP 4 ähnlichsten Spieler aus dem Pool basierend auf:
- Spielertyp, Archetyp und Position
- Physische Ähnlichkeit (Größe, Tempo, Körper)
- Spielstil und Stärken
- Alter und Entwicklungsphase

ANTWORTE NUR mit JSON:
{
  "similar_players": [
    {
      "player_id": "...",
      "player_name": "...",
      "similarity_score": 85,
      "similarity_reasons": ["konkreter Grund 1", "konkreter Grund 2"],
      "key_differences": ["Unterschied 1"],
      "verdict": "Kurze präzise Einschätzung"
    }
  ]
}`;

    // STEP 3: Find similar players from internet (other half)
    const internetPrompt = `Du bist Fußball-Scout-Experte. Suche im Internet nach realen Fußballspielern, die dem folgenden Spielerprofil ähneln und zum Budget des anfragenden Vereins passen.

REFERENZSPIELER (recherchiertes Profil):
Name: ${refProfile.full_name || referencePlayerName}
Archetyp: ${refProfile.player_archetype || ''}
Spielstil: ${refProfile.playing_style || ''}
Position: ${refProfile.position || ''}
Stärken: ${(refProfile.key_strengths || []).join(', ')}
Physik: ${refProfile.physical_profile || ''}
Taktik: ${refProfile.tactical_profile || ''}
Marktwert: €${(refProfile.market_value_eur || 0).toLocaleString()}

SUCHKRITERIEN:
- ${budgetFilter}
- ${ageFilter || 'Kein Alters-Filter'}
- Ähnliche Position und Spielstil wie der Referenzspieler
- Spieler aus dem Profi-Fußball weltweit (Ligen: Bundesliga, Premier League, Serie A, La Liga, Ligue 1, Eredivisie, etc.)
- NICHT den Referenzspieler selbst vorschlagen
- NUR Spieler vorschlagen, deren Marktwert realistisch zum Budget passt!
- Ein 2.-Liga-Verein kann sich keinen 20-Mio-Spieler leisten!

Finde genau 4 real existierende Spieler, die dem Referenzspieler ähneln, die sich auch im Budget-Rahmen befinden könnten.
Recherchiere aktuelle Informationen zu jedem gefundenen Spieler.

ANTWORTE NUR mit JSON:
{
  "internet_players": [
    {
      "player_name": "Vorname Nachname",
      "current_club": "Verein",
      "nationality": "Nationalität",
      "age": 24,
      "position": "Position",
      "market_value_eur": 15000000,
      "similarity_score": 78,
      "similarity_reasons": ["konkreter Ähnlichkeitsgrund 1", "konkreter Ähnlichkeitsgrund 2", "konkreter Ähnlichkeitsgrund 3"],
      "key_differences": ["Hauptunterschied"],
      "stats_info": "Relevante aktuelle Statistiken",
      "verdict": "Warum passt dieser Spieler?",
      "transfermarkt_hint": "Suche auf Transfermarkt.de nach diesem Spieler für mehr Details"
    }
  ]
}`;

    // Run system matching and internet search in parallel
    const [systemResponse, internetResponse] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            similar_players: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  player_id: { type: "string" },
                  player_name: { type: "string" },
                  similarity_score: { type: "number" },
                  similarity_reasons: { type: "array", items: { type: "string" } },
                  key_differences: { type: "array", items: { type: "string" } },
                  verdict: { type: "string" }
                }
              }
            }
          }
        }
      }),
      base44.integrations.Core.InvokeLLM({
        prompt: internetPrompt,
        add_context_from_internet: true,
        model: 'gemini_3_1_pro',
        response_json_schema: {
          type: "object",
          properties: {
            internet_players: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  player_name: { type: "string" },
                  current_club: { type: "string" },
                  nationality: { type: "string" },
                  age: { type: "number" },
                  position: { type: "string" },
                  market_value_eur: { type: "number" },
                  similarity_score: { type: "number" },
                  similarity_reasons: { type: "array", items: { type: "string" } },
                  key_differences: { type: "array", items: { type: "string" } },
                  stats_info: { type: "string" },
                  verdict: { type: "string" },
                  transfermarkt_hint: { type: "string" }
                }
              }
            }
          }
        }
      })
    ]);

    return Response.json({
      success: true,
      referencePlayer: refProfile,
      reference_profile_summary: refProfile.player_archetype || refProfile.playing_style || '',
      similar_players: systemResponse?.similar_players || [],
      internet_players: internetResponse?.internet_players || []
    });

  } catch (error) {
    console.error('Similar players error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});