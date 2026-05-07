import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { playerName, clubName, position, enableClubReplacement, targetClub, targetLeague, targetBudget } = await req.json();

  if (!playerName || !clubName) {
    return Response.json({ error: 'playerName und clubName sind erforderlich' }, { status: 400 });
  }

  const parseJSON = (text) => {
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error('JSON parse failed');
    }
  };

  // STEP 1 — Reference Player Analysis
  let playerProfile;
  try {
    const step1Result = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      prompt: `Analyze the football player "${playerName}" from "${clubName}"${position ? ` playing as ${position}` : ''}.

Use publicly available football analysis sources, match reports, scouting articles, and statistical breakdowns to create a detailed tactical profile.

Focus on STYLE and TACTICAL ROLE, not just statistics.

IMPORTANT: All text values in the JSON must be written in GERMAN language.

Return ONLY valid JSON (no markdown, no explanation):
{
  "player_name": "",
  "club": "",
  "position": "",
  "playing_style": "",
  "tactical_role": "",
  "strengths": [],
  "weaknesses": [],
  "key_attributes": [],
  "physical_profile": "",
  "technical_profile": "",
  "tactical_profile": "",
  "comparable_player_types": []
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          player_name: { type: 'string' },
          club: { type: 'string' },
          position: { type: 'string' },
          playing_style: { type: 'string' },
          tactical_role: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          weaknesses: { type: 'array', items: { type: 'string' } },
          key_attributes: { type: 'array', items: { type: 'string' } },
          physical_profile: { type: 'string' },
          technical_profile: { type: 'string' },
          tactical_profile: { type: 'string' },
          comparable_player_types: { type: 'array', items: { type: 'string' } }
        }
      }
    });
    playerProfile = step1Result;
    console.log('Step 1 done:', playerProfile.player_name);
  } catch (e) {
    return Response.json({ error: `Step 1 fehlgeschlagen: ${e.message}` }, { status: 500 });
  }

  // STEP 2 — Find Similar Players
  let similarPlayers;
  try {
    const step2Result = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      prompt: `Based on this player profile:
${JSON.stringify(playerProfile, null, 2)}

Find 8–12 football players WORLDWIDE who have a similar playing style, tactical role, and key attributes.

Requirements:
- Age ideally 18–30
- Same or closely related position: ${playerProfile.position}
- Search across ALL leagues globally
- Include undervalued or lesser-known players
- Do NOT include the reference player themselves

CRITICAL DATA ACCURACY REQUIREMENTS:
- For EACH player you suggest, you MUST look up their CURRENT club as of March 2026 on transfermarkt.de, sofascore.com, or fbref.com
- Verify the current market value from transfermarkt.de specifically — use the most recent valuation available
- If a player changed clubs recently, use their NEW club (check recent transfer news)
- Do NOT rely on training data alone for club/market value — actively search and verify each player
- Format market value as "X Mio. €" or "X Tsd. €"
- Add "contract_until" (Vertragsende) if findable on transfermarkt.de

IMPORTANT: All text values (playing_style_summary, similarity_reason, etc.) must be written in GERMAN language.

Return ONLY valid JSON (no markdown):
{
  "similar_players": [
    {
      "name": "",
      "club": "",
      "league": "",
      "age": "",
      "nationality": "",
      "position": "",
      "estimated_market_value": "",
      "contract_until": "",
      "playing_style_summary": "",
      "similarity_reason": ""
    }
  ]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          similar_players: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                club: { type: 'string' },
                league: { type: 'string' },
                age: { type: 'string' },
                nationality: { type: 'string' },
                position: { type: 'string' },
                estimated_market_value: { type: 'string' },
                contract_until: { type: 'string' },
                playing_style_summary: { type: 'string' },
                similarity_reason: { type: 'string' }
              }
            }
          }
        }
      }
    });
    similarPlayers = step2Result.similar_players || [];
    console.log('Step 2 done:', similarPlayers.length, 'players found');
  } catch (e) {
    return Response.json({ error: `Step 2 fehlgeschlagen: ${e.message}` }, { status: 500 });
  }

  // STEP 3 — Tactical Fit Scoring
  let fitResults;
  try {
    const step3Result = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      prompt: `Reference player profile:
${JSON.stringify(playerProfile, null, 2)}

Similar players found (already verified with current club & market value data):
${JSON.stringify(similarPlayers, null, 2)}

Evaluate how similar each player is to the reference player.

Fit Score (0–100) based on:
- Tactical role similarity (30%)
- Playing style similarity (30%)
- Key attributes overlap (25%)
- Physical profile similarity (15%)

IMPORTANT:
- Use the already-verified club and market_value from the input data — do NOT change them
- All text values (comparison_summary, strength_overlap, key_difference, etc.) must be written in GERMAN language
- Include contract_until and nationality from input data in the output

Return ONLY valid JSON sorted by highest fit_score (no markdown):
{
  "results": [
    {
      "name": "",
      "club": "",
      "league": "",
      "nationality": "",
      "position": "",
      "estimated_market_value": "",
      "contract_until": "",
      "fit_score": 0,
      "comparison_summary": "",
      "strength_overlap": [],
      "key_difference": []
    }
  ]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                club: { type: 'string' },
                league: { type: 'string' },
                nationality: { type: 'string' },
                position: { type: 'string' },
                estimated_market_value: { type: 'string' },
                contract_until: { type: 'string' },
                fit_score: { type: 'number' },
                comparison_summary: { type: 'string' },
                strength_overlap: { type: 'array', items: { type: 'string' } },
                key_difference: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    });
    fitResults = (step3Result.results || []).sort((a, b) => b.fit_score - a.fit_score);
    console.log('Step 3 done');
  } catch (e) {
    return Response.json({ error: `Step 3 fehlgeschlagen: ${e.message}` }, { status: 500 });
  }

  // STEP 4 + 5 — Run optional analyses in parallel
  let clubReplacement = null;
  let targetClubMatch = null;

  // Build target club prompt helper
  let step5Promise = null;
  if (targetClub) {
    let effectiveBudget = targetBudget;
    if (!effectiveBudget && targetLeague) {
      const ll = targetLeague.toLowerCase();
      if (/champions|premier league|bundesliga(?! 2)|la liga|serie a(?! b)|ligue 1(?! 2)|eredivisie/.test(ll)) effectiveBudget = 80_000_000;
      else if (/2\. bundesliga|championship|serie b|segunda|ligue 2/.test(ll)) effectiveBudget = 8_000_000;
      else if (/3\. liga|dritte|league one|third/.test(ll)) effectiveBudget = 2_000_000;
      else effectiveBudget = 15_000_000;
    }

    step5Promise = base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      prompt: `Du bist Fußball-Scout-Experte. Ein Verein sucht einen Spieler mit einem bestimmten Spielerprofil.

GESUCHTER SPIELERTYP (Referenzprofil von "${playerProfile.player_name}"):
${JSON.stringify(playerProfile, null, 2)}

ZIELVEREIN: "${targetClub}"
LIGA: "${targetLeague || 'unbekannt'}"
MAX. BUDGET: ${effectiveBudget ? `€${effectiveBudget.toLocaleString()}` : 'nicht angegeben'}

KANDIDATEN (ähnliche Spieler, bereits gefunden):
${JSON.stringify(fitResults.slice(0, 8), null, 2)}

AUFGABE:
1. Recherchiere "${targetClub}" im Internet: Formation, Spielstil, taktische Philosophie, Liga-Niveau, typisches Transferbudget.
2. Bewerte, welche der Kandidaten-Spieler zu "${targetClub}" passen würden – basierend auf:
   - Taktischer Fit zum Vereinssystem
   - Budget-Realismus: Spieler deren Marktwert das Budget (€${effectiveBudget ? effectiveBudget.toLocaleString() : 'unbegrenzt'}) deutlich übersteigt AUSSCHLIESSEN
   - Ligakompatibilität
3. Schlage 2-3 weitere reale Spieler vor (aus dem Internet), die noch besser zum Verein und Budget passen.

WICHTIG: Alle Texte auf DEUTSCH. Nur budgettechnisch realistische Spieler vorschlagen!

Antworte als JSON:
{
  "club_profile": {
    "name": "${targetClub}",
    "league": "",
    "formation": "",
    "playing_style": "",
    "tactical_philosophy": "",
    "estimated_transfer_budget": "",
    "squad_needs": ""
  },
  "matched_candidates": [
    {
      "name": "",
      "club": "",
      "estimated_market_value": "",
      "club_fit_score": 85,
      "budget_feasible": true,
      "fit_explanation": "",
      "strengths_for_club": [],
      "concerns": []
    }
  ],
  "additional_recommendations": [
    {
      "name": "",
      "current_club": "",
      "nationality": "",
      "age": 24,
      "position": "",
      "estimated_market_value": "",
      "contract_until": "",
      "why_fits_club": "",
      "similarity_to_reference": ""
    }
  ]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          club_profile: { type: 'object', properties: { name: { type: 'string' }, league: { type: 'string' }, formation: { type: 'string' }, playing_style: { type: 'string' }, tactical_philosophy: { type: 'string' }, estimated_transfer_budget: { type: 'string' }, squad_needs: { type: 'string' } } },
          matched_candidates: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, club: { type: 'string' }, estimated_market_value: { type: 'string' }, club_fit_score: { type: 'number' }, budget_feasible: { type: 'boolean' }, fit_explanation: { type: 'string' }, strengths_for_club: { type: 'array', items: { type: 'string' } }, concerns: { type: 'array', items: { type: 'string' } } } } },
          additional_recommendations: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, current_club: { type: 'string' }, nationality: { type: 'string' }, age: { type: 'number' }, position: { type: 'string' }, estimated_market_value: { type: 'string' }, contract_until: { type: 'string' }, why_fits_club: { type: 'string' }, similarity_to_reference: { type: 'string' } } } }
        }
      }
    }).catch(e => { console.warn('Step 5 fehlgeschlagen:', e.message); return null; });
  }

  if (enableClubReplacement) {
    try {
      const step4Result = await base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        prompt: `You are evaluating which players could best REPLACE "${playerProfile.player_name}" at "${clubName}".

Reference player profile:
${JSON.stringify(playerProfile, null, 2)}

Candidate similar players:
${JSON.stringify(similarPlayers, null, 2)}

Use web research to understand "${clubName}"'s:
- Tactical system and formation
- Playing style and philosophy
- League level and competition
- Transfer market strategy and typical budget

Evaluate which of the candidate players would fit BEST as a replacement within THIS SPECIFIC CLUB SYSTEM.

IMPORTANT: All text values (tactical_fit_explanation, strength_for_club_system, potential_risk, playing_style, tactical_philosophy, etc.) must be written in GERMAN language.

Return ONLY valid JSON sorted by highest replacement_score (no markdown):
{
  "club_context": {
    "formation": "",
    "playing_style": "",
    "league": "",
    "tactical_philosophy": ""
  },
  "club_replacement_analysis": [
    {
      "name": "",
      "club": "",
      "position": "",
      "replacement_score": 0,
      "tactical_fit_explanation": "",
      "strength_for_club_system": [],
      "potential_risk": []
    }
  ]
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            club_context: {
              type: 'object',
              properties: {
                formation: { type: 'string' },
                playing_style: { type: 'string' },
                league: { type: 'string' },
                tactical_philosophy: { type: 'string' }
              }
            },
            club_replacement_analysis: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  club: { type: 'string' },
                  position: { type: 'string' },
                  replacement_score: { type: 'number' },
                  tactical_fit_explanation: { type: 'string' },
                  strength_for_club_system: { type: 'array', items: { type: 'string' } },
                  potential_risk: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      });
      clubReplacement = step4Result;
      if (clubReplacement.club_replacement_analysis) {
        clubReplacement.club_replacement_analysis.sort((a, b) => b.replacement_score - a.replacement_score);
      }
      console.log('Step 4 done');
    } catch (e) {
      console.warn('Step 4 fehlgeschlagen:', e.message);
      clubReplacement = null;
    }
  }

  // STEP 5 — await target club promise (started in parallel with step 4)
  if (step5Promise) {
    const step5Result = await step5Promise;
    if (step5Result) {
      targetClubMatch = step5Result;
      if (targetClubMatch?.matched_candidates) {
        targetClubMatch.matched_candidates.sort((a, b) => b.club_fit_score - a.club_fit_score);
      }
      console.log('Step 5 done');
    }
  }

  return Response.json({
    success: true,
    player_profile: playerProfile,
    similar_players: similarPlayers,
    fit_results: fitResults,
    club_replacement: clubReplacement,
    target_club_match: targetClubMatch
  });
});