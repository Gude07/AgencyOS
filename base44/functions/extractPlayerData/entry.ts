import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    const { text, fileUrl } = await req.json();
    
    if (!text && !fileUrl) {
      return Response.json({ 
        error: 'Bitte Text oder Datei-URL angeben' 
      }, { status: 400 });
    }
    
    let content = text;
    
    // Wenn Datei-URL, Inhalt extrahieren
    if (fileUrl) {
      try {
        const fileResponse = await fetch(fileUrl);
        content = await fileResponse.text();
      } catch (error) {
        return Response.json({ 
          error: 'Datei konnte nicht geladen werden' 
        }, { status: 400 });
      }
    }
    
    // Schema für Spielerdaten
    const playerSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
        date_of_birth: { type: "string" },
        nationality: { type: "string" },
        position: { type: "string" },
        secondary_positions: { 
          type: "array",
          items: { type: "string" }
        },
        current_club: { type: "string" },
        market_value: { type: "number" },
        contract_until: { type: "string" },
        height: { type: "number" },
        foot: { type: "string" },
        strengths: { type: "string" },
        notes: { type: "string" }
      }
    };
    
    const prompt = `
Analysiere den folgenden Text und extrahiere alle verfügbaren Spielerinformationen.
Falls mehrere Spieler erwähnt werden, extrahiere Daten für den Hauptspieler.

WICHTIG für Positionen:
- Verwende ausschließlich diese deutschen Positionsnamen:
  Torwart, Innenverteidiger, Außenverteidiger, Linker Außenverteidiger, 
  Rechter Außenverteidiger, Defensives Mittelfeld, Mittelfeld, Linkes Mittelfeld, 
  Zentrales Mittelfeld, Rechtes Mittelfeld, Offensives Mittelfeld, Flügelspieler, 
  Linksaußen, Rechtsaußen, Stürmer

- Für "Fuß" verwende nur: links, rechts, oder beidfüßig

Text:
${content}

Extrahiere so viele Informationen wie möglich. Wenn eine Information nicht verfügbar ist, lasse das Feld weg.
    `;
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: playerSchema
    });
    
    return Response.json({
      success: true,
      extractedData: result
    });
    
  } catch (error) {
    console.error('Error extracting player data:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});