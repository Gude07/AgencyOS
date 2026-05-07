import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { playerName, clubName, position, enableClubReplacement, targetClub, targetLeague, targetBudget } = await req.json();

  if (!playerName || !clubName) {
    return Response.json({ error: 'playerName und clubName sind erforderlich' }, { status: 400 });
  }

  // STEP 1 + 2 — parallel: player profile analysis + similar players search
  let playerProfile, similarPlayers;
  try {
    const [step1Result, step2RawResult] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
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
      }),
      base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        prompt: `Find 8-10 football players WORLDWIDE similar to "${playerName}" from "${clubName}"${position ? ` playing as ${position}` : ''}.

Requirements:
- Age ideally 18-30
- Same or closely related position: ${position || 'similar to reference player'}
- Search across ALL leagues globally
- Include undervalued or lesser-known players
- Do NOT include the reference player themselves

CRITICAL DATA ACCURACY REQUIREMENTS:
- For EACH player, look up their CURRENT club as of early 2026 on transfermarkt.de or sofascore.com
- Verify the current market value from transfermarkt.de
- Format market value as "X Mio. €" or "X Tsd. €"
- Add "contract_until" (Vertragsende) if findable

IMPORTANT: All text values must be written in GERMAN language.

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
      })
    ]);

    playerProfile = step1Result;
    similarPlayers = step2RawResult.similar_players || [];
    console.log('Step 1+2 done:', playerProfile.player_name, '/', similarPlayers.length, 'players');
  } catch (e) {
    return Response.json({ error: `Step 1/2 fehlgeschlagen: ${e.message}` }, { status: 500 });
  }

  // STEP 3, 4, 5 — all parallel (no internet needed for 3, optional internet for 4+5)
  const step3Promise = base44.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    prompt: `Reference player profile:
${JSON.stringify(playerProfile, null, 2)}

Similar players found:
${JSON.stringify(similarPlayers, null, 2)}

Evaluate how similar each player is to the reference player.

Fit Score (0-100) based on:
- Tactical role similarity (30%)
- Playing style similarity (30%)
- Key attributes overlap (25%)
- Physical profile similarity (15%)

IMPORTANT:
- Use the already-verified club and market_value from the input data — do NOT change them
- All text values must be written in GERMAN language
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
  }).catch(e => { console.warn('Step 3 fehlgeschlagen:', e.message); return { results: similarPlayers.map(p => ({ ...p, fit_score: 70, comparison_summary: '', strength_overlap: [], key_difference: [] })) }; });

  // Step 4 — Club Replacement (optional, no internet to save time)
  const step4Promise = enableClubReplacement
    ? base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        prompt: `You are evaluating which players could best REPLACE "${playerProfile.player_name}" at "${clubName}".

Reference player profile:
${JSON.stringify(playerProfile, null, 2)}

Candidate similar players:
${JSON.stringify(similarPlayers, null, 2)}

Evaluate which candidate players would fit BEST as a replacement within "${clubName}"'s typical system.

IMPORTANT: All text values must be written in GERMAN language.

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
      }).catch(e => { console.warn('Step 4 fehlgeschlagen:', e.message); return null; })
    : Promise.resolve(null);

  // Step 5 — Target Club Match (optional, with internet for club research)
  let step5Promise = Promise.resolve(null);
  if (targetClub) {
    let effectiveBudget = targetBudget;
    if (!effectiveBudget && targetLeague) {
      const ll = targetLeague.toLowerCase();
      if (/premier league|bundesliga(?! 2)|la liga|serie a(?! b)|ligue 1(?! 2)/.test(ll)) effectiveBudget = 80000000;
      else if (/2\. bundesliga|championship|serie b|segunda|ligue 2/.test(ll)) effectiveBudget = 8000000;
      else if (/3\. liga|dritte|league one/.test(ll)) effectiveBudget = 2000000;
      else effectiveBudget = 15000000;
    }

    step5Promise = base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      prompt: `Du bist Fußball-Scout-Experte. Der Verein "${targetClub}" sucht einen Spieler ähnlich wie "${playerProfile.player_name}".

SPIELERPROFIL (Referenz):
Stil: ${playerProfile.playing_style}
Taktische Rolle: ${playerProfile.tactical_role}
Stärken: ${(playerProfile.strengths || []).join(', ')}
Position: ${playerProfile.position}

LIGA: "${targetLeague || 'unbekannt'}"
MAX. BUDGET: ${effectiveBudget ? `€${effectiveBudget.toLocaleString()}` : 'nicht angegeben'}

KANDIDATEN:
${JSON.stringify(similarPlayers.slice(0, 8).map(p => ({ name: p.name, club: p.club, market_value: p.estimated_market_value, contract_until: p.contract_until })), null, 2)}

AUFGABE:
1. Recherchiere "${targetClub}": Formation, Spielstil, Liga-Niveau.
2. Welche Kandidaten passen zum Verein und sind budgettechnisch realistisch?
3. Schlage 2 weitere reale Spieler vor die besser passen könnten.

Alle Texte auf DEUTSCH. Antworte als JSON:
{
  "club_profile": { "name": "", "league": "", "formation": "", "playing_style": "", "tactical_philosophy": "", "estimated_transfer_budget": "", "squad_needs": "" },
  "matched_candidates": [{ "name": "", "club": "", "estimated_market_value": "", "club_fit_score": 80, "budget_feasible": true, "fit_explanation": "", "strengths_for_club": [], "concerns": [] }],
  "additional_recommendations": [{ "name": "", "current_club": "", "nationality": "", "age": 24, "position": "", "estimated_market_value": "", "contract_until": "", "why_fits_club": "", "similarity_to_reference": "" }]
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

  // Await all parallel steps
  const [step3Result, step4Result, step5Result] = await Promise.all([step3Promise, step4Promise, step5Promise]);
  console.log('Step 3+4+5 done');

  const fitResults = (step3Result?.results || []).sort((a, b) => b.fit_score - a.fit_score);

  let clubReplacement = step4Result;
  if (clubReplacement?.club_replacement_analysis) {
    clubReplacement.club_replacement_analysis.sort((a, b) => b.replacement_score - a.replacement_score);
  }

  let targetClubMatch = step5Result;
  if (targetClubMatch?.matched_candidates) {
    targetClubMatch.matched_candidates.sort((a, b) => b.club_fit_score - a.club_fit_score);
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