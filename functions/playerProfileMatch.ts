import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { playerName, clubName, position, enableClubReplacement } = await req.json();

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
      model: 'gemini_3_pro',
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

  // STEP 4 — Club Context Replacement Analysis (optional)
  let clubReplacement = null;
  if (enableClubReplacement) {
    try {
      const step4Result = await base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_pro',
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

  return Response.json({
    success: true,
    player_profile: playerProfile,
    similar_players: similarPlayers,
    fit_results: fitResults,
    club_replacement: clubReplacement
  });
});