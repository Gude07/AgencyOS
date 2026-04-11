import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    const { 
      entityType,
      entityId,
      playerName,
      position,
      league,
      marketValue,
      nationality,
      contractUntil,
      age
    } = await req.json();
    
    let playerData = null;
    
    if (entityType === 'player' && entityId) {
      const players = await base44.entities.Player.list();
      playerData = players.find(p => p.id === entityId);
    }
    
    const name = playerData?.name || playerName;
    const pos = playerData?.position || position;
    const club = playerData?.current_club || league;
    const mv = playerData?.market_value || marketValue;
    const nat = playerData?.nationality || nationality;
    const contract = playerData?.contract_until || contractUntil;
    const playerAge = playerData?.age || age;

    if (!name) {
      return Response.json({ error: 'Nicht genügend Informationen für Marktanalyse' }, { status: 400 });
    }
    
    const prompt = `
Du bist ein professioneller Fußball-Scout und Transfermarkt-Experte. Erstelle eine umfassende, datenbasierte Markttrend-Analyse für folgenden Spieler:

SPIELER-PROFIL:
- Name: ${name}
- Position: ${pos || 'nicht angegeben'}
- Aktueller Verein: ${club || 'nicht angegeben'}
- Aktueller Marktwert: ${mv ? (mv >= 1000000 ? (mv/1000000).toFixed(1) + ' Mio €' : (mv/1000).toFixed(0) + ' Tsd €') : 'unbekannt'}
- Nationalität: ${nat || 'nicht angegeben'}
- Vertragsende: ${contract || 'unbekannt'}
- Alter: ${playerAge || 'unbekannt'}

Recherchiere und analysiere KONKRET mit echten Daten:

1. AKTUELLE NACHRICHTEN & GERÜCHTE: Suche nach aktuellen Transfernachrichten, Gerüchten und Berichten zu diesem Spieler. Gib für jede Nachricht eine konkrete Quelle (Transfermarkt, Sky Sports, Kicker, BILD, etc.) mit der URL an.

2. MARKTTRENDS FÜR POSITION ${pos || ''}: Wie entwickelt sich der Markt für diese Position? Was sind typische Ablösesummen? Welche Ligen zahlen am meisten?

3. VERGLEICHBARE TRANSFERS: Liste 3-5 konkrete, tatsächlich stattgefundene Transfers ähnlicher Spieler aus den letzten 18 Monaten mit echten Ablösesummen.

4. MARKTWERT-ENTWICKLUNG: Analysiere realistische Marktwertentwicklung inkl. Prognose. Berücksichtige Alter, Vertragsende, Form und Marktlage.

5. INTERESSIERTE VEREINE: Welche Vereine könnten konkret Interesse haben? Begründe dies.

6. VERLETZUNGS- & RISIKOANALYSE: Bekannte Verletzungsrisiken, Formkurve, Zuverlässigkeit.

7. OPTIMALER TRANSFER-ZEITPUNKT: Wann ist der beste Zeitpunkt für einen Transfer? Berücksichtige Vertragsende, Transferfenster, Marktzyklus.

8. CHANCEN & RISIKEN: Konkrete Chancen und Risiken für einen Transfer.

9. GESAMTEMPFEHLUNG: Klare, handlungsorientierte Empfehlung für die Agentur.

Sei präzise, faktenbasiert und professionell. Gib IMMER echte Quell-URLs an, wo möglich.
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
              source_url: { type: "string", description: "Vollständige URL zur Quelle" },
              date: { type: "string" },
              relevance: { type: "string", enum: ["hoch", "mittel", "niedrig"] }
            }
          }
        },
        market_trends: {
          type: "object",
          properties: {
            position_demand: { type: "string" },
            average_transfer_fee: { type: "string" },
            trending_direction: { type: "string", enum: ["stark steigend", "steigend", "stabil", "fallend", "stark fallend"] },
            top_paying_leagues: { type: "array", items: { type: "string" } },
            market_overview: { type: "string" }
          }
        },
        comparable_transfers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              player: { type: "string" },
              age_at_transfer: { type: "string" },
              from_club: { type: "string" },
              to_club: { type: "string" },
              fee: { type: "string" },
              date: { type: "string" },
              similarity_reason: { type: "string" }
            }
          }
        },
        market_value_assessment: {
          type: "object",
          properties: {
            current_estimate: { type: "string" },
            low_estimate: { type: "string" },
            high_estimate: { type: "string" },
            trend: { type: "string" },
            trend_12_months: { type: "string" },
            reasoning: { type: "string" },
            contract_impact: { type: "string" }
          }
        },
        interested_clubs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              club: { type: "string" },
              league: { type: "string" },
              likelihood: { type: "string", enum: ["sehr wahrscheinlich", "wahrscheinlich", "möglich", "spekulativ"] },
              reason: { type: "string" }
            }
          }
        },
        risk_analysis: {
          type: "object",
          properties: {
            injury_history: { type: "string" },
            form_assessment: { type: "string" },
            age_factor: { type: "string" },
            contract_risk: { type: "string" }
          }
        },
        transfer_timing: {
          type: "object",
          properties: {
            optimal_window: { type: "string" },
            urgency: { type: "string", enum: ["sofort handeln", "zeitnah", "kein Eile", "abwarten"] },
            reasoning: { type: "string" }
          }
        },
        risks_opportunities: {
          type: "object",
          properties: {
            risks: { type: "array", items: { type: "string" } },
            opportunities: { type: "array", items: { type: "string" } }
          }
        },
        overall_recommendation: { type: "string" },
        confidence_score: { type: "number", description: "Konfidenz der Analyse 0-100" }
      }
    };
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: schema,
      model: 'gemini_3_flash'
    });
    
    return Response.json({
      success: true,
      analysis: result,
      player_context: { name, position: pos, club, marketValue: mv, contract, age: playerAge },
      generated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting market trends:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});