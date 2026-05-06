import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Check if a player matches the criteria of a club request
function matchesRequest(player, req) {
  const reasons = [];
  const mismatches = [];

  // Position match (required)
  const positionMatch = req.position_needed === 'Alle Positionen' ||
    player.position === req.position_needed ||
    (player.secondary_positions || []).includes(req.position_needed);
  if (!positionMatch) return null;

  // Age check
  if (req.age_min && player.age && player.age < req.age_min) return null;
  if (req.age_max && player.age && player.age > req.age_max) return null;
  if (player.age) reasons.push(`Alter ${player.age} J.`);

  // Foot check
  if (req.sought_foot && player.foot && player.foot !== req.sought_foot && player.foot !== 'beidfüßig') {
    mismatches.push(`Fuß (${player.foot} statt ${req.sought_foot})`);
  } else if (req.sought_foot && player.foot) {
    reasons.push(`Starker Fuß: ${player.foot}`);
  }

  // Budget check (market value vs buy budget)
  if (req.transfer_types?.includes('kauf') && req.budget_max && player.market_value) {
    if (player.market_value > req.budget_max * 1.5) return null; // clearly out of budget
    if (player.market_value <= req.budget_max) reasons.push(`Marktwert im Budget`);
  }

  // Free transfer: contract ending soon
  if (req.transfer_types?.includes('ablösefrei') && player.contract_until) {
    const contractDate = new Date(player.contract_until);
    const now = new Date();
    const monthsLeft = (contractDate - now) / (1000 * 60 * 60 * 24 * 30);
    if (monthsLeft <= 12) reasons.push(`Vertrag läuft aus (${player.contract_until})`);
  }

  // Score: how well does the player match?
  let score = 10; // base score for position match
  if (player.age && req.age_min && req.age_max) {
    const midAge = (req.age_min + req.age_max) / 2;
    score += Math.max(0, 5 - Math.abs(player.age - midAge));
  }
  if (req.sought_foot && player.foot === req.sought_foot) score += 3;
  if (req.budget_max && player.market_value && player.market_value <= req.budget_max) score += 2;
  score -= mismatches.length * 2;

  return { score, reasons, mismatches };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestIds } = await req.json();
    if (!requestIds || requestIds.length === 0) {
      return Response.json({ error: 'Keine Anfragen angegeben' }, { status: 400 });
    }

    const [allRequests, allPlayers] = await Promise.all([
      base44.entities.ClubRequest.list(),
      base44.entities.Player.list(),
    ]);

    const selectedRequests = allRequests.filter(r => requestIds.includes(r.id));
    if (selectedRequests.length === 0) {
      return Response.json({ error: 'Keine passenden Anfragen gefunden' }, { status: 404 });
    }

    // Build per-request data with real matching
    const requestSummaries = selectedRequests.map(clubReq => {
      const shortlistedIds = new Set(clubReq.shortlist || []);

      // Shortlist players
      const shortlistedPlayers = allPlayers
        .filter(p => shortlistedIds.has(p.id))
        .map(p => ({
          name: p.name,
          position: p.position,
          age: p.age,
          foot: p.foot,
          nationality: p.nationality,
          currentClub: p.current_club,
          marketValue: p.market_value ? `${(p.market_value / 1000000).toFixed(2).replace(/\.?0+$/, '')}M €` : null,
          contractUntil: p.contract_until,
          strengths: p.strengths,
          status: 'Shortlist',
        }));

      // Real criteria-based matching for ALL non-shortlisted players
      const criteriaMatches = allPlayers
        .filter(p => !shortlistedIds.has(p.id))
        .map(p => {
          const match = matchesRequest(p, clubReq);
          if (!match) return null;
          return {
            player: p,
            score: match.score,
            reasons: match.reasons,
            mismatches: match.mismatches,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5) // top 5 best-matching players
        .map(m => ({
          name: m.player.name,
          position: m.player.position,
          age: m.player.age,
          foot: m.player.foot,
          nationality: m.player.nationality,
          currentClub: m.player.current_club,
          marketValue: m.player.market_value ? `${(m.player.market_value / 1000000).toFixed(2).replace(/\.?0+$/, '')}M €` : null,
          contractUntil: m.player.contract_until,
          strengths: m.player.strengths,
          matchReasons: m.reasons,
          matchWarnings: m.mismatches,
          status: 'KI-Empfehlung',
        }));

      return {
        club: clubReq.club_name,
        league: clubReq.league || 'k.A.',
        country: clubReq.country || 'k.A.',
        position: clubReq.position_needed,
        soughtFoot: clubReq.sought_foot || 'keine Vorgabe',
        transferTypes: clubReq.transfer_types?.join(', ') || 'k.A.',
        budgetKauf: clubReq.budget_max ? `bis ${(clubReq.budget_max / 1000000).toFixed(2).replace(/\.?0+$/, '')}M €` : null,
        salaryMax: clubReq.salary_max ? `bis ${(clubReq.salary_max / 1000).toFixed(0)}k € / ${clubReq.salary_period || 'Jahr'}` : null,
        ageRange: (clubReq.age_min || clubReq.age_max) ? `${clubReq.age_min || '?'}-${clubReq.age_max || '?'} Jahre` : 'k.A.',
        transferPeriod: clubReq.transfer_period || 'k.A.',
        priority: clubReq.priority,
        requirements: clubReq.requirements,
        shortlistedPlayers,
        criteriaMatches,
      };
    });

    const prompt = `Du bist ein erfahrener Fußball-Scout und Berater einer Spieleragentur. Erstelle eine professionelle, strukturierte und optisch übersichtliche Spieler-Zusammenfassung für ${selectedRequests.length} Vereinsanfrage(n).

DATEN (Vereinsanfragen + passende Spieler):
${JSON.stringify(requestSummaries, null, 2)}

ANWEISUNGEN:
Erstelle eine gut strukturierte Zusammenfassung auf DEUTSCH mit folgenden Abschnitten:

---

## 📋 Überblick
Kurze Einleitung (2-3 Sätze) über die analysierten Anfragen und wichtigsten Erkenntnisse.

---

## 🏟️ [Vereinsname] – [Position]
Wiederhole diesen Abschnitt für JEDEN Verein.

**Anforderungen:** Position | Alter | Budget | Fuß | Transferart | Periode

### ⭐ Shortlist-Spieler
(nur wenn vorhanden, sonst weglassen)
Für jeden Spieler:
- **[Name]** | [Alter] J. | [Nationalität] | [aktueller Verein] | MV: [Marktwert]
  - Vertrag bis: [Datum] | Fuß: [Fuß]
  - Stärken: [Stärken]
  - ✅ Passt weil: Position, Alter und Budget erfüllt

### 🤖 KI-Empfehlungen (Kriterien-Matching)
(Top-Spieler die wirklich passen – nur wenn criteriaMatches vorhanden)
Für jeden Spieler:
- **[Name]** | [Alter] J. | [Nationalität] | [aktueller Verein] | MV: [Marktwert]
  - Vertrag bis: [Datum] | Fuß: [Fuß]
  - ✅ [matchReasons als Aufzählung]
  - ⚠️ [matchWarnings falls vorhanden]

Falls KEINE Spieler (weder Shortlist noch KI-Empfehlungen) vorhanden sind: Schreibe "Aktuell keine passenden Spieler im Portfolio gefunden."

---

## 🔄 Spieler mit Mehrfach-Potenzial
Nenne explizit alle Spieler, die zu MEHR ALS EINER Anfrage passen – das ist besonders wertvoll.
Falls keiner: Diesen Abschnitt weglassen.

---

## 📌 Handlungsempfehlungen
3-4 konkrete nächste Schritte basierend auf den Daten.

---

WICHTIG: 
- Sei präzise und professionell
- Nutze die exakten Spielerdaten (keine Erfindungen)
- Markiere fehlende Werte mit "k.A."
- Das Dokument soll direkt an Vereinsverantwortliche weitergeleitet werden können`;

    const summary = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
    });

    return Response.json({ summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});