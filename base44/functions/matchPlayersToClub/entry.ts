import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { clubName, clubProfile, criteriaWeights = {}, whatIfBudget = null, whatIfPositions = [] } = await req.json();
    if (!clubName || !clubProfile) return Response.json({ error: 'Vereinsname oder Profil fehlt' }, { status: 400 });

    console.log(`Starte Spieler-Matching für: ${clubName}`);

    const allPlayers = await base44.asServiceRole.entities.Player.filter({ agency_id: user.agency_id });
    console.log(`Gefundene Spieler gesamt: ${allPlayers.length}`);

    if (allPlayers.length === 0) {
      return Response.json({ success: false, error: 'Keine Spieler im Pool gefunden' });
    }

    // Load scouting reports for players
    let scoutingReports = [];
    try {
      scoutingReports = await base44.asServiceRole.entities.ScoutingReport.filter({ agency_id: user.agency_id });
    } catch (e) {
      console.warn('Scouting reports not available:', e.message);
    }

    const scoutingByPlayer = {};
    scoutingReports.forEach(r => {
      if (!scoutingByPlayer[r.player_id]) scoutingByPlayer[r.player_id] = [];
      scoutingByPlayer[r.player_id].push(r);
    });

    // Use whatIf overrides if provided
    const effectiveBudget = whatIfBudget || clubProfile.realistic_budget;
    const targetPositions = whatIfPositions.length > 0 ? whatIfPositions : (clubProfile.target_positions || []);

    // Filter by position
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
    }

    // Filter by budget
    if (effectiveBudget && effectiveBudget.max > 0) {
      const budgetAvg = effectiveBudget.average || effectiveBudget.max;
      let minMarketValue = 0;
      if (budgetAvg > 15000000) minMarketValue = budgetAvg * 0.3;
      else if (budgetAvg > 5000000) minMarketValue = budgetAvg * 0.2;

      relevantPlayers = relevantPlayers.filter(p => {
        const mv = p.market_value || 0;
        return mv >= minMarketValue && mv <= effectiveBudget.max * 1.2;
      });
    }

    if (relevantPlayers.length === 0) {
      return Response.json({ success: false, error: 'Keine Spieler für die gewählten Kriterien gefunden' });
    }

    // Build player list with scouting data
    const playersForAnalysis = relevantPlayers.map(p => {
      const reports = scoutingByPlayer[p.id] || [];
      const latestReport = reports.sort((a, b) => new Date(b.report_date) - new Date(a.report_date))[0];
      return {
        id: p.id,
        name: p.name,
        position: p.position,
        secondary_positions: p.secondary_positions || [],
        age: p.age || 'N/A',
        nationality: p.nationality || 'N/A',
        current_club: p.current_club || 'Vereinslos',
        market_value: p.market_value || 0,
        strengths: p.strengths || '',
        foot: p.foot || 'N/A',
        height: p.height || 0,
        speed_rating: p.speed_rating || 0,
        strength_rating: p.strength_rating || 0,
        stamina_rating: p.stamina_rating || 0,
        agility_rating: p.agility_rating || 0,
        personality_traits: p.personality_traits || [],
        current_form: p.current_form || 'N/A',
        scouting_report: latestReport ? {
          overall_rating: latestReport.overall_rating,
          recommendation: latestReport.recommendation,
          strengths: latestReport.strengths,
          weaknesses: latestReport.weaknesses,
          potential: latestReport.potential,
          technical: {
            passing: latestReport.technical_passing,
            dribbling: latestReport.technical_dribbling,
            shooting: latestReport.technical_shooting,
            tackling: latestReport.technical_tackling
          },
          physical: {
            speed: latestReport.physical_speed,
            endurance: latestReport.physical_endurance,
            strength: latestReport.physical_strength
          },
          mental: {
            leadership: latestReport.mental_leadership,
            work_rate: latestReport.mental_work_rate,
            composure: latestReport.mental_composure
          }
        } : null
      };
    });

    // Build criteria weights description
    const weights = {
      position_fit: criteriaWeights.position_fit ?? 5,
      playing_style: criteriaWeights.playing_style ?? 5,
      physical: criteriaWeights.physical ?? 5,
      technical: criteriaWeights.technical ?? 5,
      mental: criteriaWeights.mental ?? 5,
      age_potential: criteriaWeights.age_potential ?? 5,
      form: criteriaWeights.form ?? 5,
      culture_fit: criteriaWeights.culture_fit ?? 5
    };

    const isWhatIf = !!whatIfBudget || whatIfPositions.length > 0;

    const matchingPrompt = `Du bist Fußball-Scout-Experte. Analysiere die ${playersForAnalysis.length} Spieler und empfehle die TOP 10 für "${clubName}".

VEREINSPROFIL:
- Spielweise: ${clubProfile.playing_style || 'N/A'}
- Formationen: ${clubProfile.formations?.join(', ') || 'N/A'}
- Trainer: ${clubProfile.current_coach || 'N/A'}
- Philosophie: ${clubProfile.coach_philosophy || 'N/A'}
- Vereinskultur: ${clubProfile.club_culture || 'N/A'}
- Kultureller Fit: ${clubProfile.player_culture_fit || 'N/A'}
- Gesuchte Attribute: ${clubProfile.key_attributes?.join(', ') || 'N/A'}
- Gesuchte Positionen: ${targetPositions.join(', ') || 'Alle'}
- Verletzungssituation: ${clubProfile.injury_situation || 'N/A'}
- Liga: ${clubProfile.league || 'N/A'} (${clubProfile.country || 'N/A'})
- Budget: ${effectiveBudget ? `${effectiveBudget.min?.toLocaleString('de-DE')}€ - ${effectiveBudget.max?.toLocaleString('de-DE')}€ (Ø ${effectiveBudget.average?.toLocaleString('de-DE')}€)` : 'N/A'}
${isWhatIf ? '⚠️ WAS-WÄRE-WENN-SZENARIO: Budget/Positionen wurden manuell überschrieben!' : ''}

GEWICHTUNG DER KRITERIEN (1=unwichtig, 10=sehr wichtig):
- Positionspassung: ${weights.position_fit}/10
- Spielstil-Übereinstimmung: ${weights.playing_style}/10
- Physische Attribute: ${weights.physical}/10
- Technische Fähigkeiten: ${weights.technical}/10
- Mentale Stärke & Charakter: ${weights.mental}/10
- Alter & Entwicklungspotenzial: ${weights.age_potential}/10
- Aktuelle Form: ${weights.form}/10
- Kultureller Fit zum Verein: ${weights.culture_fit}/10

BEWERTUNGSHINWEIS: Gewichte deine Analyse entsprechend der obigen Wichtigkeit. Kriterien mit Wert 8-10 sind entscheidend, 1-3 sind Nebensache.

VERFÜGBARE SPIELER (${playersForAnalysis.length}):
${JSON.stringify(playersForAnalysis, null, 2)}

AUFGABE: Empfehle TOP 10 Spieler. Bei Scouting-Berichten: berücksichtige diese als wichtige qualitative Einschätzung.

ANTWORTE NUR mit folgendem JSON:
{
  "recommendations": [
    {
      "player_id": "...",
      "player_name": "...",
      "match_score": 85,
      "reasoning": "Detaillierte Begründung",
      "key_strengths": ["...", "..."],
      "culture_fit": "Kurze Einschätzung kultureller Passung",
      "risk_factors": ["Mögliche Risiken oder Bedenken"],
      "radar_scores": {
        "position": 0,
        "style": 0,
        "physical": 0,
        "technical": 0,
        "mental": 0,
        "culture": 0
      }
    }
  ],
  "summary": "...",
  "what_if_note": "${isWhatIf ? 'Szenario-Analyse: ' : ''}..."
}`;

    const matchingResponse = await base44.integrations.Core.InvokeLLM({
      prompt: matchingPrompt,
      model: 'gpt_5'
    });

    let parsedResponse;
    if (typeof matchingResponse === 'string') {
      try {
        const jsonMatch = matchingResponse.match(/```json\n([\s\S]*?)\n```/) || matchingResponse.match(/```\n([\s\S]*?)\n```/);
        parsedResponse = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(matchingResponse);
      } catch (e) {
        console.error('JSON Parse Error:', e);
        return Response.json({ success: false, error: 'KI-Antwort konnte nicht verarbeitet werden' });
      }
    } else {
      parsedResponse = matchingResponse;
    }

    if (!parsedResponse?.recommendations?.length) {
      return Response.json({ success: false, error: 'Keine passenden Spieler gefunden' });
    }

    return Response.json({
      success: true,
      recommendations: parsedResponse.recommendations,
      summary: parsedResponse.summary || 'Analyse abgeschlossen',
      what_if_note: parsedResponse.what_if_note,
      analyzedPlayers: playersForAnalysis.length,
      isWhatIfScenario: isWhatIf
    });

  } catch (error) {
    console.error('Matching error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});