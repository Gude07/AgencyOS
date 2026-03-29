import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { clubName, manualPositions = [], forceRefresh = false, existingProfileId = null, newCoach = null } = await req.json();
    if (!clubName) return Response.json({ error: 'Vereinsname fehlt' }, { status: 400 });

    console.log(`Analysiere Verein: ${clubName}, forceRefresh: ${forceRefresh}`);

    // --- 1. Check for existing ClubProfile in DB ---
    let existingProfile = null;
    try {
      const profiles = await base44.asServiceRole.entities.ClubProfile.filter({ agency_id: user.agency_id });
      const normalize = (s) => s.toLowerCase().replace(/\s+/g, '').trim();
      existingProfile = profiles.find(p => normalize(p.club_name) === normalize(clubName));
      if (!existingProfile && existingProfileId) {
        existingProfile = profiles.find(p => p.id === existingProfileId);
      }
    } catch (e) {
      console.warn('Could not load ClubProfiles:', e.message);
    }

    // --- 2. Load matched ClubRequests ---
    let matchedRequests = [];
    try {
      const allRequests = await base44.asServiceRole.entities.ClubRequest.filter({ agency_id: user.agency_id });
      const activeRequests = allRequests.filter(r => !r.archive_id && r.status !== 'abgeschlossen' && r.status !== 'abgelehnt');

      const normalizeClub = (str) => str.toLowerCase()
        .replace(/^(fc|sv|sc|vfb|bsc|tsg|rb|rw|vfl|fsv|sg|tus|fk|sk|ac|as|ss|cf|cd|rc|atletico|atlético|real|inter|ssc)\s+/gi, '')
        .replace(/\s+/g, ' ').trim();

      const clubNormalized = normalizeClub(clubName);
      const clubParts = clubNormalized.split(' ').filter(p => p.length > 2);

      matchedRequests = activeRequests.filter(r => {
        if (!r.club_name) return false;
        const reqNormalized = normalizeClub(r.club_name);
        if (reqNormalized.includes(clubNormalized) || clubNormalized.includes(reqNormalized)) return true;
        return clubParts.some(part => reqNormalized.includes(part) && part.length > 3);
      });
      console.log(`Gefundene passende Vereinsanfragen: ${matchedRequests.length}`);
    } catch (e) {
      console.warn('Could not load ClubRequests:', e.message);
    }

    const requestPositions = [...new Set(
      matchedRequests.map(r => r.position_needed).filter(p => p && p !== 'Alle Positionen')
    )];
    const allTargetPositions = [...new Set([...requestPositions, ...manualPositions])];
    const positionHintText = allTargetPositions.length > 0
      ? `\nHINWEIS: Unsere Agentur hat aktuelle Vereinsanfragen für folgende Positionen bei diesem Verein: ${allTargetPositions.join(', ')}. Berücksichtige dies bei den möglichen Prioritätspositionen, aber beschreibe diese immer als KI-Einschätzung basierend auf dem tatsächlichen Bedarf des Vereins – nicht als fixe Vorgabe.`
      : '';

    // --- 3. Build prompt: use existing profile as base if available and not force refresh ---
    let clubProfile;
    const useExistingAsBase = existingProfile && !forceRefresh && !newCoach;

    if (useExistingAsBase) {
      // Existing profile found: only supplement/update missing or outdated info
      const existingJson = JSON.stringify({
        playing_style: existingProfile.playing_style,
        formations: existingProfile.formations,
        key_attributes: existingProfile.key_attributes,
        coach_philosophy: existingProfile.coach_philosophy,
        current_coach: existingProfile.current_coach,
        club_culture: existingProfile.club_culture,
        player_culture_fit: existingProfile.player_culture_fit,
        transfer_trends: existingProfile.transfer_trends,
        injury_situation: existingProfile.injury_situation,
        target_positions: existingProfile.target_positions,
        league: existingProfile.league,
        country: existingProfile.country,
        realistic_budget: existingProfile.realistic_budget,
      }, null, 2);

      const supplementPrompt = `Wir haben bereits folgendes Vereinsprofil für "${clubName}" in unserer Datenbank (Stand: ${existingProfile.last_analyzed_date || existingProfile.created_date}):

${existingJson}

Bitte ergänze und aktualisiere dieses Profil nur mit NEUEN Informationen aus dem Internet (aktuell März 2026, Saison 2025/2026). 
Behalte bestehende Informationen bei, wenn sie noch aktuell sind. 
Ergänze besonders: aktuelle Transfergerüchte, Verletzungen, neue Informationen über den Trainer, aktuelle Spielform und Transferbudget.
${positionHintText}

Für das Feld "target_positions": Beschreibe dies als KI-Einschätzung der MÖGLICHEN Prioritätspositionen des Vereins basierend auf aktuellem Kader, Verletzungen und Transferstrategie – keine fixe Liste, sondern eine fundierte Einschätzung.

ANTWORTE NUR mit folgendem JSON (alle Felder müssen ausgefüllt sein, übernimm bestehende Werte wo sinnvoll):
{
  "playing_style": "...",
  "formations": ["..."],
  "key_attributes": ["..."],
  "coach_philosophy": "...",
  "current_coach": "...",
  "club_culture": "...",
  "player_culture_fit": "...",
  "transfer_trends": "...",
  "current_reports": "...",
  "injury_situation": "...",
  "target_positions": ["..."],
  "league": "...",
  "country": "...",
  "realistic_budget": { "min": 0, "max": 0, "average": 0, "currency": "EUR", "notes": "..." }
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: supplementPrompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash'
      });

      clubProfile = parseJson(response);
    } else {
      // Full analysis (no existing profile, force refresh, or new coach)
      const coachIntro = newCoach
        ? `Der Verein "${clubName}" hat einen neuen Trainer: ${newCoach}. Baue das gesamte Vereinsprofil NEU auf basierend auf der bekannten Philosophie, dem Spielstil und den Präferenzen von Trainer ${newCoach}. Nutze aktuelle Informationen aus dem Internet (März 2026).`
        : `Analysiere den Fußballverein "${clubName}" umfassend basierend auf aktuellen Informationen aus dem Internet (März 2026, Saison 2025/2026).`;

      const fullPrompt = `${coachIntro}

1. AKTUELLE SPIELWEISE UND TAKTIK: taktisches System, Spielphilosophie, Formationen
2. TRAINER UND PHILOSOPHIE: ${newCoach ? `Trainer ${newCoach}` : 'aktueller Trainer'}, Spielausrichtung, bevorzugte Spielertypen
3. VEREINSKULTUR: Nachwuchs vs. fertige Spieler, Vereinswerte, typischer Spielercharakter
4. AKTUELLE TRENDS (März 2026): Transfergerüchte, Verletzungssituation, Budget
5. GESUCHTE SPIELERPROFILE: physische, technische, mentale Attribute
6. LIGA UND WETTBEWERBSUMFELD
7. TRANSFERBUDGET: letzte 3-5 Transfers, realistisches Budget in Euro
${positionHintText}

Für das Feld "target_positions": Beschreibe dies als KI-Einschätzung der MÖGLICHEN Prioritätspositionen des Vereins basierend auf aktuellem Kader, Verletzungen und Transferstrategie – keine fixe Liste, sondern eine fundierte Einschätzung.

ANTWORTE NUR mit folgendem JSON:
{
  "playing_style": "...",
  "formations": ["..."],
  "key_attributes": ["..."],
  "coach_philosophy": "...",
  "current_coach": "...",
  "club_culture": "...",
  "player_culture_fit": "...",
  "transfer_trends": "...",
  "current_reports": "...",
  "injury_situation": "...",
  "target_positions": ["..."],
  "league": "...",
  "country": "...",
  "realistic_budget": { "min": 0, "max": 0, "average": 0, "currency": "EUR", "notes": "..." }
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash'
      });

      clubProfile = parseJson(response);
    }

    // Merge positions: AI estimate + request hints (deduplicated)
    const aiPositions = clubProfile.target_positions || [];
    clubProfile.target_positions = [...new Set([...aiPositions, ...allTargetPositions])];

    // --- 4. Save/update ClubProfile in DB ---
    let savedProfileId = existingProfile?.id || null;
    try {
      const profileData = {
        agency_id: user.agency_id,
        club_name: clubName,
        league: clubProfile.league,
        country: clubProfile.country,
        current_coach: clubProfile.current_coach,
        coach_philosophy: clubProfile.coach_philosophy,
        playing_style: clubProfile.playing_style,
        formations: clubProfile.formations,
        key_attributes: clubProfile.key_attributes,
        target_positions: clubProfile.target_positions,
        club_culture: clubProfile.club_culture,
        player_culture_fit: clubProfile.player_culture_fit,
        transfer_trends: clubProfile.transfer_trends,
        transfer_trends_updated_date: new Date().toISOString(),
        injury_situation: clubProfile.injury_situation,
        injury_situation_updated_date: new Date().toISOString(),
        realistic_budget: clubProfile.realistic_budget,
        last_analyzed_date: new Date().toISOString(),
      };

      if (existingProfile) {
        await base44.asServiceRole.entities.ClubProfile.update(existingProfile.id, profileData);
        savedProfileId = existingProfile.id;
        console.log(`Vereinsprofil aktualisiert: ${existingProfile.id}`);
      } else {
        const created = await base44.asServiceRole.entities.ClubProfile.create(profileData);
        savedProfileId = created.id;
        console.log(`Neues Vereinsprofil gespeichert: ${created.id}`);
      }
    } catch (e) {
      console.warn('Could not save ClubProfile:', e.message);
    }

    return Response.json({
      success: true,
      clubProfile,
      matchedRequests: matchedRequests.map(r => ({
        id: r.id,
        club_name: r.club_name,
        position_needed: r.position_needed,
        status: r.status,
        priority: r.priority,
        budget_max: r.budget_max,
        transfer_types: r.transfer_types,
        requirements: r.requirements
      })),
      usedExistingProfile: useExistingAsBase,
      savedProfileId,
    });

  } catch (error) {
    console.error('Club analysis error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

function parseJson(response) {
  if (typeof response === 'string') {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);
      return jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(response);
    } catch (e) {
      console.error('JSON Parse Error:', e);
      return response;
    }
  }
  return response;
}