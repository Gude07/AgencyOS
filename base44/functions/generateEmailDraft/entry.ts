import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    const { 
      type, // 'club_request', 'player_offer', 'deal_update', 'general'
      entityId, 
      recipientName,
      context,
      tone = 'professional' // 'professional', 'friendly', 'formal'
    } = await req.json();
    
    let emailContext = context || '';
    let subject = '';
    
    // Kontext basierend auf Typ laden
    if (type === 'club_request' && entityId) {
      const requests = await base44.entities.ClubRequest.list();
      const request = requests.find(r => r.id === entityId);
      
      if (request) {
        emailContext = `
Vereinsanfrage Details:
- Verein: ${request.club_name}
- Position gesucht: ${request.position_needed}
- Liga: ${request.league}
- Budget: ${request.budget_min} - ${request.budget_max}€
- Anforderungen: ${request.requirements}
        `;
        subject = `Spielervorschlag für ${request.position_needed} - ${request.club_name}`;
      }
    } else if (type === 'deal_update' && entityId) {
      const deals = await base44.entities.Deal.list();
      const deal = deals.find(d => d.id === entityId);
      
      if (deal) {
        emailContext = `
Deal Details:
- Titel: ${deal.title}
- Spieler: ${deal.player_name}
- Aufnehmender Verein: ${deal.receiving_club}
- Status: ${deal.status}
- Transfer-Art: ${deal.transfer_type}
        `;
        subject = `Update: ${deal.title}`;
      }
    }
    
    const prompt = `
Erstelle einen professionellen E-Mail-Entwurf auf Deutsch.

WICHTIG: Du schreibst diese E-Mail AUS SICHT EINES SPIELERBERATERS von der Agentur "STS Sports".
Du vertrittst die Interessen von Spielern und vermittelst sie an Vereine.

KONTEXT:
${emailContext}

EMPFÄNGER: ${recipientName || 'Sehr geehrte Damen und Herren'}
TON: ${tone === 'friendly' ? 'freundlich und persönlich' : tone === 'formal' ? 'sehr förmlich' : 'professionell'}
ABSENDER: ${user.full_name}, Spielerberater bei STS Sports

Die E-Mail soll:
- Aus Sicht eines Spielerberaters geschrieben sein (nicht aus Spieler-Sicht!)
- Eine passende Anrede enthalten
- Den Hauptinhalt klar strukturiert darstellen (z.B. Spielervorschlag mit Qualifikationen)
- Einen professionellen Abschluss haben mit Kontaktdaten
- Handlungsaufforderungen (Call-to-Action) wo sinnvoll enthalten

Formatiere die E-Mail mit HTML für bessere Lesbarkeit.
    `;
    
    const schema = {
      type: "object",
      properties: {
        subject: { type: "string" },
        body_html: { type: "string" },
        body_plain: { type: "string" },
        suggested_attachments: {
          type: "array",
          items: { type: "string" }
        }
      }
    };
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
      model: 'gpt_5'
    });
    
    return Response.json({
      success: true,
      draft: {
        subject: result.subject || subject,
        body_html: result.body_html,
        body_plain: result.body_plain,
        suggested_attachments: result.suggested_attachments || []
      }
    });
    
  } catch (error) {
    console.error('Error generating email draft:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});