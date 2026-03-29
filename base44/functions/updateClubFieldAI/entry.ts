import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { profileId, field } = await req.json();
    if (!profileId || !field) return Response.json({ error: 'profileId und field erforderlich' }, { status: 400 });
    if (!['transfer_trends', 'injury_situation'].includes(field)) {
      return Response.json({ error: 'Ungültiges Feld. Erlaubt: transfer_trends, injury_situation' }, { status: 400 });
    }

    const profiles = await base44.asServiceRole.entities.ClubProfile.filter({ agency_id: user.agency_id });
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return Response.json({ error: 'Vereinsprofil nicht gefunden' }, { status: 404 });

    const fieldLabel = field === 'transfer_trends' ? 'Transfertrends' : 'Verletzungssituation';
    const prompt = field === 'transfer_trends'
      ? `Analysiere die aktuellen Transfertrends von "${profile.club_name}" (${profile.league || ''}, ${profile.country || ''}) basierend auf den neuesten Informationen aus dem Internet (März 2026, Saison 2025/26).

Beschreibe: aktuelle Transfergerüchte, Abgänge/Zugänge, Transferstrategie, ob der Verein kaufen/leihen möchte, Budgethinweise.

Bestehende Information (Stand: ${profile.transfer_trends_updated_date || 'unbekannt'}):
${profile.transfer_trends || '(keine)'}

Antworte NUR mit einem zusammenfassenden Text (2-4 Sätze, Deutsch).`
      : `Analysiere die aktuelle Verletzungssituation bei "${profile.club_name}" (${profile.league || ''}, ${profile.country || ''}) basierend auf den neuesten Informationen aus dem Internet (März 2026, Saison 2025/26).

Beschreibe: welche Spieler verletzt sind, wie lange diese ausfallen, ob es eine Häufung an Verletzungen gibt und welche Positionen dadurch besonders betroffen sind.

Bestehende Information (Stand: ${profile.injury_situation_updated_date || 'unbekannt'}):
${profile.injury_situation || '(keine)'}

Antworte NUR mit einem zusammenfassenden Text (2-4 Sätze, Deutsch).`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash'
    });

    const updatedText = typeof response === 'string' ? response.trim() : JSON.stringify(response);
    const now = new Date().toISOString();
    const updateData = {
      [field]: updatedText,
      [`${field}_updated_date`]: now,
    };

    await base44.asServiceRole.entities.ClubProfile.update(profileId, updateData);

    return Response.json({ success: true, value: updatedText, updated_date: now });
  } catch (error) {
    console.error('updateClubFieldAI error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});