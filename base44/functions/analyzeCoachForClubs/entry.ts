import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { coachId, targetLeagues } = await req.json();

    const coaches = await base44.asServiceRole.entities.Coach.list();
    const coach = coaches.find(c => c.id === coachId);
    if (!coach) return Response.json({ error: 'Trainer nicht gefunden' }, { status: 404 });

    const clubProfiles = await base44.asServiceRole.entities.ClubProfile.list();
    const relevantClubs = targetLeagues && targetLeagues.length > 0
      ? clubProfiles.filter(c => targetLeagues.some(l => c.league?.toLowerCase().includes(l.toLowerCase())))
      : clubProfiles;

    const coachInfo = `
Trainer: ${coach.name}
Spezialisierung: ${coach.specialization || '-'}
Bevorzugte Formation: ${coach.preferred_formation || '-'}
Trainerphilosophie: ${coach.coaching_philosophy || '-'}
Erfahrung: ${coach.experience_years ? coach.experience_years + ' Jahre' : '-'}
Lizenzen: ${coach.licenses || '-'}
Nationalität: ${coach.nationality || '-'}
Sprachen: ${(coach.languages || []).join(', ') || '-'}
Gehaltsvorstellung: ${coach.salary_expectation ? Math.round(coach.salary_expectation / 1000) + 'k €/Jahr' : '-'}
Erfolge: ${coach.achievements || '-'}
Aktuelle Situation: ${coach.status || '-'}
`;

    const clubsInfo = relevantClubs.slice(0, 30).map(c => `
- Verein: ${c.club_name} | Liga: ${c.league || '-'} | Land: ${c.country || '-'}
  Spielstil: ${c.playing_style || '-'}
  Formation: ${(c.formations || []).join(', ') || '-'}
  Trainer-Philosophie: ${c.coach_philosophy || '-'}
  Gesuchte Attribute: ${(c.key_attributes || []).join(', ') || '-'}
  Vereinskultur: ${c.club_culture || '-'}
`).join('');

    const prompt = `Du bist ein erfahrener Fußball-Analyst spezialisiert auf Trainer-Transfers. 
Analysiere detailliert, ob und wie gut der folgende Trainer zu den aufgelisteten Vereinen passt.

=== TRAINER-PROFIL ===
${coachInfo}

=== VEREINSPROFILE (Ziel-Ligen: ${targetLeagues?.join(', ') || 'alle'}) ===
${clubsInfo || 'Keine Vereinsprofile für diese Ligen vorhanden.'}

Erstelle eine detaillierte Analyse mit:
1. Einer Gesamtbewertung des Trainers (Stärken, Schwächen, Spielsystem-Analyse)
2. Top-3 bis Top-5 am besten passende Vereine (falls vorhanden) mit Match-Score (0-100) und ausführlicher Begründung
3. Empfehlungen für Ligen/Vereinstypen die generell gut zum Trainer passen würden
4. Konkrete Handlungsempfehlungen für die Agentur

Antworte auf Deutsch und sei so spezifisch und fundiert wie möglich.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          trainer_bewertung: {
            type: 'object',
            properties: {
              staerken: { type: 'array', items: { type: 'string' } },
              schwaechen: { type: 'array', items: { type: 'string' } },
              spielsystem_analyse: { type: 'string' },
              gesamtbewertung: { type: 'string' }
            }
          },
          top_vereine: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                verein: { type: 'string' },
                liga: { type: 'string' },
                match_score: { type: 'number' },
                begruendung: { type: 'string' },
                vorteile: { type: 'array', items: { type: 'string' } },
                risiken: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          liga_empfehlungen: { type: 'array', items: { type: 'string' } },
          handlungsempfehlungen: { type: 'array', items: { type: 'string' } },
          analysiert_am: { type: 'string' }
        }
      }
    });

    result.analysiert_am = new Date().toISOString();
    result.trainer_name = coach.name;
    result.ziel_ligen = targetLeagues || [];

    return Response.json({ analysis: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});