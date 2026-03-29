import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { playerId, selectedClubIds } = await req.json();
  if (!playerId) return Response.json({ error: 'playerId fehlt' }, { status: 400 });

  // Helper: ensure we always get a plain array
  const toArray = (v) => Array.isArray(v) ? v : (v?.items || v?.data || v?.results || []);

  // Lade alle relevanten Spielerdaten parallel
  const [playersRaw, scoutingRaw, careerRaw, clubProfilesRaw] = await Promise.all([
    base44.entities.Player.filter({ agency_id: user.agency_id }),
    base44.entities.ScoutingReport.filter({ player_id: playerId }).catch(() => []),
    base44.entities.PlayerCareerStat.filter({ player_id: playerId }).catch(() => []),
    base44.entities.ClubProfile.filter({ agency_id: user.agency_id }).catch(() => []),
  ]);

  const players = toArray(playersRaw);
  const scoutingReports = toArray(scoutingRaw);
  const careerStats = toArray(careerRaw);
  const clubProfiles = toArray(clubProfilesRaw);

  const player = players.find(p => p.id === playerId);
  if (!player) return Response.json({ error: 'Spieler nicht gefunden' }, { status: 404 });

  const playerScoutingReports = scoutingReports.filter(r => r.player_id === playerId);

  // Baue Spieler-Datenzusammenfassung für die KI
  const playerData = {
    name: player.name,
    position: player.position,
    secondary_positions: player.secondary_positions || [],
    age: player.age,
    nationality: player.nationality,
    market_value: player.market_value,
    foot: player.foot,
    height: player.height,
    current_club: player.current_club,
    strengths: player.strengths,
    notes: player.notes,
    speed_rating: player.speed_rating,
    strength_rating: player.strength_rating,
    stamina_rating: player.stamina_rating,
    agility_rating: player.agility_rating,
    personality_traits: player.personality_traits || [],
    current_form: player.current_form,
    form_description: player.form_description,
  };

  const careerSummary = careerStats.map(s =>
    `${s.season}: ${s.club} (${s.competition}) - ${s.appearances || 0} Spiele, ${s.goals || 0} Tore, ${s.assists || 0} Vorlagen`
  ).join('\n');

  const scoutingSummary = playerScoutingReports.slice(0, 3).map(r =>
    `Scouting: ${r.summary || r.notes || ''}`
  ).join('\n');

  // Schritt 1: KI generiert ideales Club-Profil für den Spieler
  const idealProfilePrompt = `Du bist ein erfahrener Fußball-Scout. Analysiere folgende Spielerdaten und beschreibe das ideale taktische Club-Umfeld für diesen Spieler.

SPIELERDATEN:
${JSON.stringify(playerData, null, 2)}

KARRIERESTATISTIKEN:
${careerSummary || 'Keine Daten'}

SCOUTING-BERICHTE:
${scoutingSummary || 'Keine Berichte'}

Erstelle ein strukturiertes "Ideales Club-Profil" aus der Sicht dieses Spielers. Antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text drum herum):
{
  "player_summary": "Kurze Beschreibung des Spielerprofils",
  "ideal_playing_style": "Beschreibung des idealen Spielstils für diesen Spieler",
  "ideal_formations": ["Formation1", "Formation2"],
  "ideal_club_attributes": ["Attribut1", "Attribut2", "Attribut3"],
  "ideal_league_level": "Liganiveau-Beschreibung",
  "key_requirements": ["Anforderung1", "Anforderung2"],
  "development_environment": "Beschreibung der idealen Entwicklungsumgebung",
  "tactical_role": "Beschreibung der idealen taktischen Rolle"
}`;

  const idealProfileResult = await base44.integrations.Core.InvokeLLM({
    prompt: idealProfilePrompt,
    add_context_from_internet: false,
    response_json_schema: {
      type: "object",
      properties: {
        player_summary: { type: "string" },
        ideal_playing_style: { type: "string" },
        ideal_formations: { type: "array", items: { type: "string" } },
        ideal_club_attributes: { type: "array", items: { type: "string" } },
        ideal_league_level: { type: "string" },
        key_requirements: { type: "array", items: { type: "string" } },
        development_environment: { type: "string" },
        tactical_role: { type: "string" }
      }
    }
  });

  const idealProfile = typeof idealProfileResult === 'string' ? JSON.parse(idealProfileResult) : idealProfileResult;

  // Schritt 2: Abgleich mit vorhandenen Club-Profilen
  // Filtere nach ausgewählten Clubs falls angegeben
  const profilesToCompare = (selectedClubIds && selectedClubIds.length > 0)
    ? clubProfiles.filter(cp => selectedClubIds.includes(cp.id))
    : clubProfiles;

  if (!profilesToCompare || profilesToCompare.length === 0) {
    return Response.json({
      success: true,
      idealProfile,
      clubFitResults: [],
      message: 'Keine Club-Profile in der Datenbank gefunden. Bitte fügen Sie Vereinsprofile über die KI-Vereinsanalyse hinzu.'
    });
  }

  // Vergleich: Spieler-Idealprofil vs. Club-Profile (ein KI-Aufruf für alle)
  const clubProfilesSummary = profilesToCompare.map((cp, i) => ({
    index: i,
    id: cp.id,
    club_name: cp.club_name,
    league: cp.league,
    country: cp.country,
    playing_style: cp.playing_style,
    formations: cp.formations,
    coach_philosophy: cp.coach_philosophy,
    key_attributes: cp.key_attributes,
    club_culture: cp.club_culture,
    player_culture_fit: cp.player_culture_fit,
    target_positions: cp.target_positions,
  }));

  const matchPrompt = `Du bist ein erfahrener Fußball-Scout. Vergleiche das ideale Club-Profil eines Spielers mit einer Liste von Club-Profilen und berechne einen Fit-Score.
ANTWORTE AUSSCHLIESSLICH AUF DEUTSCH. Alle Texte (summary, reasons_for, reasons_against, match_level) müssen auf Deutsch sein.
match_level muss einer dieser Werte sein: "Sehr gut", "Gut", "Mittel", "Gering".

IDEALES CLUB-PROFIL DES SPIELERS (${player.name}):
${JSON.stringify(idealProfile, null, 2)}

CLUB-PROFILE ZUM VERGLEICH:
${JSON.stringify(clubProfilesSummary, null, 2)}

Für jeden Verein: Berechne einen Fit-Score (0-100) und gib eine kurze Begründung auf Deutsch.
Antworte NUR mit einem JSON-Objekt:
{
  "results": [
    {
      "club_id": "ID des Vereins",
      "club_name": "Name des Vereins",
      "fit_score": 85,
      "match_level": "Sehr gut",
      "reasons_for": ["Grund 1 auf Deutsch", "Grund 2 auf Deutsch"],
      "reasons_against": ["Grund 1 auf Deutsch"],
      "summary": "Kurze Zusammenfassung auf Deutsch"
    }
  ]
}`;

  const matchResult = await base44.integrations.Core.InvokeLLM({
    prompt: matchPrompt,
    add_context_from_internet: false,
    response_json_schema: {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              club_id: { type: "string" },
              club_name: { type: "string" },
              fit_score: { type: "number" },
              match_level: { type: "string" },
              reasons_for: { type: "array", items: { type: "string" } },
              reasons_against: { type: "array", items: { type: "string" } },
              summary: { type: "string" }
            }
          }
        }
      }
    }
  });

  const matchData = typeof matchResult === 'string' ? JSON.parse(matchResult) : matchResult;

  // Ergänze Club-IDs aus den Profilen (KI kennt nur den Index/Namen)
  const resultsWithIds = (matchData.results || []).map(r => {
    const matchedProfile = profilesToCompare.find(cp => cp.club_name === r.club_name);
    return {
      ...r,
      club_id: matchedProfile?.id || r.club_id,
    };
  }).sort((a, b) => b.fit_score - a.fit_score);

  return Response.json({
    success: true,
    idealProfile,
    clubFitResults: resultsWithIds,
    totalClubsAnalyzed: profilesToCompare.length
  });
});