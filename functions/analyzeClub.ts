import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { clubName } = await req.json();

    if (!clubName) {
      return Response.json({ error: 'Vereinsname fehlt' }, { status: 400 });
    }

    console.log(`Analysiere Verein: ${clubName}`);

    // Vereinsprofil von der KI erstellen mit aktuellen Internet-Daten
    const clubProfilePrompt = `Analysiere den Fußballverein "${clubName}" umfassend basierend auf aktuellen Informationen aus dem Internet (März 2026, Saison 2025/2026). Recherchiere folgende Punkte:

1. AKTUELLE SPIELWEISE UND TAKTIK:
   - Welches taktische System spielt der Verein aktuell?
   - Wie ist die Spielphilosophie (z.B. Ballbesitzfußball, Konterfußball, Pressing)?
   - Welche Formationen werden bevorzugt?

2. TRAINER UND PHILOSOPHIE:
   - Wer ist der aktuelle Trainer?
   - Welche spielerische Ausrichtung hat der Trainer?
   - Welche Spielertypen bevorzugt der Trainer?

3. AKTUELLE TRENDS UND BERICHTE:
   - Aktuelle Transfergerüchte und -ziele (März 2026)
   - Welche Positionen werden verstärkt gesucht?
   - Aktuelle Entwicklungen und Presseberichte zum Verein
   - Transferstrategie und Budget-Situation
   - WICHTIG: Aktuelle Verletzungssituation im Kader - welche Spieler fehlen verletzungsbedingt?

4. GESUCHTE SPIELERPROFILE:
   - Welche körperlichen Attribute sind wichtig (Größe, Schnelligkeit, Stärke)?
   - Welche technischen Fähigkeiten werden gesucht?
   - Welche mentalen/charakterlichen Eigenschaften sind gefragt?

5. LIGA UND WETTBEWERBSUMFELD:
   - In welcher Liga spielt der Verein?
   - Land und Wettbewerbsniveau

Gib ausführliche, aktuelle Informationen zurück, insbesondere zu aktuellen Verletzungen und daraus resultierenden Transferbedarf.

ANTWORTE NUR mit folgendem JSON-Format:
{
  "playing_style": "Detaillierte Beschreibung der Spielweise",
  "formations": ["Formation 1", "Formation 2"],
  "key_attributes": ["Attribut 1", "Attribut 2", "Attribut 3"],
  "coach_philosophy": "Trainerphilosophie",
  "current_coach": "Name des Trainers",
  "transfer_trends": "Aktuelle Transfertrends",
  "current_reports": "Aktuelle Berichte und News",
  "injury_situation": "Verletzungssituation und Auswirkungen",
  "target_positions": ["Position 1", "Position 2"],
  "league": "Liga",
  "country": "Land"
}`;

    const clubProfileResponse = await base44.integrations.Core.InvokeLLM({
      prompt: clubProfilePrompt,
      add_context_from_internet: true,
      model: 'gemini_3_pro'
    });

    console.log('Vereinsanalyse abgeschlossen');

    // Parse Response
    let clubProfile;
    if (typeof clubProfileResponse === 'string') {
      try {
        const jsonMatch = clubProfileResponse.match(/```json\n([\s\S]*?)\n```/) || clubProfileResponse.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          clubProfile = JSON.parse(jsonMatch[1]);
        } else {
          clubProfile = JSON.parse(clubProfileResponse);
        }
      } catch (e) {
        console.error('JSON Parse Error:', e);
        clubProfile = clubProfileResponse;
      }
    } else {
      clubProfile = clubProfileResponse;
    }

    return Response.json({
      success: true,
      clubProfile: clubProfile
    });

  } catch (error) {
    console.error('Club analysis error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Analyse fehlgeschlagen' 
    }, { status: 500 });
  }
});