import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { clubName, manualPositions = [] } = await req.json();
    if (!clubName) return Response.json({ error: 'Vereinsname fehlt' }, { status: 400 });

    console.log(`Analysiere Verein: ${clubName}`);

    // Load active (non-archived) ClubRequests for the agency
    let matchedRequests = [];
    try {
      const allRequests = await base44.asServiceRole.entities.ClubRequest.filter({ agency_id: user.agency_id });
      const activeRequests = allRequests.filter(r => !r.archive_id && r.status !== 'abgeschlossen' && r.status !== 'abgelehnt');

      // Fuzzy name matching
      const normalize = (str) => str.toLowerCase()
        .replace(/^(fc|sv|sc|vfb|bsc|tsg|rb|rw|vfl|fsv|sg|tus|fk|sk|ac|as|ss|cf|cd|rc|atletico|atlético|real|inter|ssc)\s+/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      const clubNormalized = normalize(clubName);
      const clubParts = clubNormalized.split(' ').filter(p => p.length > 2);

      matchedRequests = activeRequests.filter(r => {
        if (!r.club_name) return false;
        const reqNormalized = normalize(r.club_name);
        if (reqNormalized.includes(clubNormalized) || clubNormalized.includes(reqNormalized)) return true;
        // Check if any significant part matches
        return clubParts.some(part => reqNormalized.includes(part) && part.length > 3);
      });

      console.log(`Gefundene passende Vereinsanfragen: ${matchedRequests.length}`);
    } catch (e) {
      console.warn('Could not load ClubRequests:', e.message);
    }

    // Collect positions from matched requests
    const requestPositions = [...new Set(
      matchedRequests
        .map(r => r.position_needed)
        .filter(p => p && p !== 'Alle Positionen')
    )];

    const allTargetPositions = [...new Set([...requestPositions, ...manualPositions])];

    const clubProfilePrompt = `Analysiere den Fußballverein "${clubName}" umfassend basierend auf aktuellen Informationen aus dem Internet (März 2026, Saison 2025/2026).

1. AKTUELLE SPIELWEISE UND TAKTIK:
   - Welches taktische System spielt der Verein aktuell?
   - Spielphilosophie (Ballbesitz, Konter, Pressing, High-Line etc.)
   - Bevorzugte Formationen

2. TRAINER UND PHILOSOPHIE:
   - Aktueller Trainer und seine spielerische Ausrichtung
   - Bevorzugte Spielertypen

3. VEREINSKULTUR & PHILOSOPHIE:
   - Ist der Verein bekannt für Nachwuchsförderung oder kauft er fertige Spieler?
   - Internationaler Fokus oder lokale Identität?
   - Vereinswerte und Spielerkultur (z.B. Teamgeist, Disziplin, Kreativität)
   - Typisches Durchschnittsalter des Kaders und Entwicklungsstrategie
   - Bekannte Charaktertypen die beim Verein florieren

4. AKTUELLE TRENDS UND BERICHTE (März 2026):
   - Transfergerüchte und -ziele
   - Gesuchte Positionen
   - Verletzungssituation im Kader
   - Transferstrategie und Budget-Situation

5. GESUCHTE SPIELERPROFILE:
   - Körperliche Attribute, technische Fähigkeiten, mentale Eigenschaften

6. LIGA UND WETTBEWERBSUMFELD

7. TRANSFERBUDGET UND FINANZIELLE REALITÄT:
   - Letzte 3-5 Transfers analysieren
   - Realistisches Budget in Euro

${allTargetPositions.length > 0 ? `\nHINWEIS: Folgende Positionen werden speziell gesucht (aus aktiven Anfragen/manuell): ${allTargetPositions.join(', ')}` : ''}

ANTWORTE NUR mit folgendem JSON:
{
  "playing_style": "...",
  "formations": ["..."],
  "key_attributes": ["..."],
  "coach_philosophy": "...",
  "current_coach": "...",
  "club_culture": "Detaillierte Vereinskultur - Nachwuchs/erfahrene Spieler, internationale/lokale Ausrichtung, Werte",
  "player_culture_fit": "Welcher Spielertyp passt kulturell zu diesem Verein",
  "transfer_trends": "...",
  "current_reports": "...",
  "injury_situation": "...",
  "target_positions": ["..."],
  "league": "...",
  "country": "...",
  "realistic_budget": {
    "min": 0,
    "max": 0,
    "average": 0,
    "currency": "EUR",
    "notes": "..."
  }
}`;

    const clubProfileResponse = await base44.integrations.Core.InvokeLLM({
      prompt: clubProfilePrompt,
      add_context_from_internet: true,
      model: 'gemini_3_pro'
    });

    let clubProfile;
    if (typeof clubProfileResponse === 'string') {
      try {
        const jsonMatch = clubProfileResponse.match(/```json\n([\s\S]*?)\n```/) || clubProfileResponse.match(/```\n([\s\S]*?)\n```/);
        clubProfile = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(clubProfileResponse);
      } catch (e) {
        console.error('JSON Parse Error:', e);
        clubProfile = clubProfileResponse;
      }
    } else {
      clubProfile = clubProfileResponse;
    }

    // Merge positions: AI + requests + manual (unique)
    const aiPositions = clubProfile.target_positions || [];
    const mergedPositions = [...new Set([...aiPositions, ...allTargetPositions])];
    clubProfile.target_positions = mergedPositions;

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
      }))
    });

  } catch (error) {
    console.error('Club analysis error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});