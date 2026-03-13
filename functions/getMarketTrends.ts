import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    const { 
      entityType, // 'player' or 'deal'
      entityId,
      playerName,
      position,
      league,
      marketValue
    } = await req.json();
    
    let searchQuery = '';
    
    if (entityType === 'player' && entityId) {
      const players = await base44.entities.Player.list();
      const player = players.find(p => p.id === entityId);
      
      if (player) {
        searchQuery = `${player.name} Transfer Nachrichten ${player.position} ${player.current_club || ''}`;
      }
    } else if (playerName) {
      searchQuery = `${playerName} Transfer Nachrichten ${position || ''} ${league || ''}`;
    }
    
    if (!searchQuery) {
      return Response.json({ 
        error: 'Nicht genügend Informationen für Marktanalyse' 
      }, { status: 400 });
    }
    
    const prompt = `
Analysiere den aktuellen Transfermarkt und erstelle einen detaillierten Bericht.

SPIELER-KONTEXT:
- Name: ${playerName}
- Position: ${position || 'nicht angegeben'}
- Liga/Verein: ${league || 'nicht angegeben'}
- Aktueller Marktwert: ${marketValue ? marketValue + '€' : 'unbekannt'}

Recherchiere und analysiere:
1. Aktuelle Transfer-Gerüchte und Nachrichten
2. Markttrends für diese Position
3. Vergleichbare Transfers in der letzten Saison
4. Marktwert-Einschätzung und Entwicklung
5. Interessierte Vereine (falls bekannt)
6. Einschätzung des optimalen Transfer-Zeitpunkts
7. Risiken und Chancen

Gib einen strukturierten, professionellen Bericht auf Deutsch.
    `;
    
    const schema = {
      type: "object",
      properties: {
        current_news: {
          type: "array",
          items: {
            type: "object",
            properties: {
              headline: { type: "string" },
              summary: { type: "string" },
              source: { type: "string" },
              relevance: { type: "string" }
            }
          }
        },
        market_trends: {
          type: "object",
          properties: {
            position_demand: { type: "string" },
            average_transfer_fee: { type: "string" },
            trending_direction: { type: "string" }
          }
        },
        comparable_transfers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              player: { type: "string" },
              from_club: { type: "string" },
              to_club: { type: "string" },
              fee: { type: "string" },
              date: { type: "string" }
            }
          }
        },
        market_value_assessment: {
          type: "object",
          properties: {
            current_estimate: { type: "string" },
            trend: { type: "string" },
            reasoning: { type: "string" }
          }
        },
        interested_clubs: {
          type: "array",
          items: { type: "string" }
        },
        transfer_timing: {
          type: "object",
          properties: {
            optimal_window: { type: "string" },
            reasoning: { type: "string" }
          }
        },
        risks_opportunities: {
          type: "object",
          properties: {
            risks: {
              type: "array",
              items: { type: "string" }
            },
            opportunities: {
              type: "array",
              items: { type: "string" }
            }
          }
        },
        overall_recommendation: { type: "string" }
      }
    };
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: schema,
      model: 'gemini_3_pro'
    });
    
    return Response.json({
      success: true,
      analysis: result,
      generated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting market trends:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});