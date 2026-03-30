/**
 * Zentrales Matchmaking-System
 * Liga-Tier-basiertes Matching mit transparenter Score-Aufschlüsselung
 */

// Liga-Tier-Definition (1 = Elite, 4 = Unterklasse)
const LEAGUE_TIERS = {
  // Tier 1 - Europäische Top-5 Ligen + Große Ligen
  1: [
    'bundesliga', '1. bundesliga', 'premier league', 'la liga', 'serie a', 'ligue 1',
    'eredivisie', 'primeira liga', 'pro league', 'süper lig', 'russian premier league',
    'scottish premiership', 'mls'
  ],
  // Tier 2 - Zweite Ligen / Starke Erstligen
  2: [
    '2. bundesliga', 'championship', 'segunda división', 'serie b', 'ligue 2',
    'austrian bundesliga', 'swiss super league', 'czech liga', 'polish ekstraklasa',
    'scottish championship', '2. liga', 'segunda liga', 'super league'
  ],
  // Tier 3 - Dritte Ligen / Mittlere Ligen
  3: [
    '3. liga', 'dritte liga', 'league one', 'segunda b', 'serie c', 'national league',
    'national', 'liga 3', 'division 3', 'belgian first amateur', 'austrian second liga'
  ],
  // Tier 4 - Unterklassen
  4: [
    'regionalliga', 'oberliga', 'landesliga', 'bezirksliga', 'verbandsliga',
    'league two', 'national league north', 'national league south', 'vierte liga'
  ]
};

// Realistischer Marktwert-Bereich pro Tier (in Euro)
const TIER_MARKET_VALUE_RANGE = {
  1: { min: 2_000_000,   max: 200_000_000, typical: 15_000_000 },
  2: { min: 300_000,     max: 15_000_000,  typical: 2_000_000  },
  3: { min: 50_000,      max: 3_000_000,   typical: 300_000    },
  4: { min: 0,           max: 500_000,     typical: 50_000     },
};

export function getLeagueTier(league) {
  if (!league) return null;
  const lower = league.toLowerCase().trim();
  for (const [tier, leagues] of Object.entries(LEAGUE_TIERS)) {
    if (leagues.some(l => lower.includes(l) || l.includes(lower))) {
      return parseInt(tier);
    }
  }
  return null; // Unbekannte Liga
}

export function getTierLabel(tier) {
  const labels = {
    1: 'Top-Liga (Tier 1)',
    2: '2. Liga / Starke Liga (Tier 2)',
    3: '3. Liga / Mittlere Liga (Tier 3)',
    4: 'Unterklasse (Tier 4)',
  };
  return labels[tier] || 'Unbekannte Liga';
}

/**
 * Berechnet den Liga-Tier-Fit-Score für einen Spieler.
 * Prüft ob der Marktwert des Spielers realistisch zur Liga passt.
 * Bei jungen Spielern (< 22 Jahre) wird die Mindest-Schwelle reduziert.
 * @returns { score: 0-1, reason: string }
 */
export function calcLeagueTierFit(playerMarketValue, league, playerAge) {
  const tier = getLeagueTier(league);
  if (!tier || !playerMarketValue) {
    return { score: 0.5, reason: 'Liga oder Marktwert unbekannt – kein Tier-Abgleich möglich', tier: null };
  }

  const range = TIER_MARKET_VALUE_RANGE[tier];
  const mv = playerMarketValue;

  // Alterskorrektur: Sehr junge Spieler (Talente) haben naturgemäß niedrigere Marktwerte
  // Unter 22: Mindest-Schwelle um 70% reduziert, unter 19: um 90% reduziert
  let effectiveMin = range.min;
  if (playerAge && playerAge < 19) effectiveMin = range.min * 0.1;
  else if (playerAge && playerAge < 22) effectiveMin = range.min * 0.3;
  else if (playerAge && playerAge < 25) effectiveMin = range.min * 0.6;

  if (mv > range.max) {
    // Spieler zu wertvoll für die Liga
    const overFactor = mv / range.max;
    if (overFactor > 5) return { score: 0, reason: `❌ Marktwert (${formatMV(mv)}) deutlich zu hoch für ${getTierLabel(tier)} (max. realistisch: ${formatMV(range.max)})`, tier };
    if (overFactor > 2) return { score: 0.2, reason: `⚠️ Marktwert (${formatMV(mv)}) zu hoch für ${getTierLabel(tier)} (max. realistisch: ${formatMV(range.max)})`, tier };
    return { score: 0.6, reason: `⚠️ Marktwert (${formatMV(mv)}) leicht über Liga-Niveau (${getTierLabel(tier)})`, tier };
  } else if (mv >= effectiveMin) {
    // Im realistischen Bereich (ggf. alterskorrigiert)
    const ageNote = (playerAge && playerAge < 22) ? ` (Talent-Bonus: Alterskorrektur für ${playerAge}J. angewendet)` : '';
    return { score: 1, reason: `✅ Marktwert (${formatMV(mv)}) passt zur Liga-Klasse (${getTierLabel(tier)})${ageNote}`, tier };
  } else {
    // Marktwert zu niedrig für die Liga
    const underFactor = effectiveMin / mv;
    if (underFactor > 5) return { score: 0, reason: `❌ Marktwert (${formatMV(mv)}) deutlich zu niedrig für ${getTierLabel(tier)} (mind. realistisch: ${formatMV(effectiveMin)})`, tier };
    if (underFactor > 2) return { score: 0.2, reason: `⚠️ Marktwert (${formatMV(mv)}) zu niedrig für ${getTierLabel(tier)} (Mindest-Niveau: ${formatMV(effectiveMin)})`, tier };
    return { score: 0.6, reason: `⚠️ Marktwert (${formatMV(mv)}) leicht unter Liga-Niveau (${getTierLabel(tier)})`, tier };
  }
}

function formatMV(value) {
  if (!value) return '?';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M €`;
  return `${(value / 1_000).toFixed(0)}K €`;
}

function checkPositionMatch(playerPos, requestedPos) {
  if (!playerPos || !requestedPos) return null;
  if (requestedPos === 'Alle Positionen') return 'main';
  if (playerPos === requestedPos) return 'main';
  if (requestedPos === 'Außenverteidiger' &&
    (playerPos === 'Linker Außenverteidiger' || playerPos === 'Rechter Außenverteidiger')) return 'main';
  if (requestedPos === 'Mittelfeld' &&
    (playerPos === 'Linkes Mittelfeld' || playerPos === 'Rechtes Mittelfeld')) return 'main';
  if (requestedPos === 'Flügelspieler' &&
    (playerPos === 'Linksaußen' || playerPos === 'Rechtsaußen')) return 'main';
  return null;
}

/**
 * Vollständige Match-Score Berechnung mit detaillierter Aufschlüsselung.
 * Verwendet für BEIDE Seiten (Spielerdetail + Vereinsanfrage).
 * 
 * @returns { score: number (0-100), breakdown: Array, disqualified: boolean }
 */
export function calculateDetailedMatchScore(player, request) {
  if (!player || !request) return { score: 0, breakdown: [], disqualified: false };

  const playerAge = player.date_of_birth
    ? Math.floor((new Date() - new Date(player.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const mainPositionMatch = checkPositionMatch(player.position, request.position_needed);
  const secondaryPositionMatch = Array.isArray(player.secondary_positions)
    && player.secondary_positions.some(pos => checkPositionMatch(pos, request.position_needed));

  // Kein Positions-Match → sofort 0
  if (!mainPositionMatch && !secondaryPositionMatch) {
    return { score: 0, breakdown: [], disqualified: false };
  }

  const prefs = player.preferences || {};

  // Spieler hat Verein explizit ausgeschlossen
  if (prefs.excluded_clubs?.length > 0 && prefs.excluded_clubs.includes(request.club_name)) {
    return {
      score: 0, disqualified: true,
      breakdown: [{ name: 'Ausgeschlossener Verein', weight: 100, achieved: 0, status: 'fail', required: true, detail: `${request.club_name} wurde vom Spieler explizit ausgeschlossen` }]
    };
  }

  const breakdown = [];

  // --- 1. POSITION (35 Punkte) ---
  const posScore = mainPositionMatch ? 35 : 17;
  breakdown.push({
    name: 'Position',
    weight: 35,
    achieved: posScore,
    status: mainPositionMatch ? 'success' : 'partial',
    required: true,
    detail: mainPositionMatch
      ? `✅ Hauptposition passt: ${player.position}`
      : `⚠️ Nebenposition passt (${player.secondary_positions?.find(pos => checkPositionMatch(pos, request.position_needed))})`
  });

  // --- 2. ALTER (20 Punkte) ---
  if (request.age_min || request.age_max) {
    const ageMin = request.age_min || 0;
    const ageMax = request.age_max || 99;
    const ageMatch = playerAge && playerAge >= ageMin && playerAge <= ageMax;
    let ageScore = 0;
    let ageDetail = '';
    if (!playerAge) {
      ageDetail = 'Alter unbekannt';
    } else if (ageMatch) {
      ageScore = 20;
      ageDetail = `✅ ${playerAge} Jahre (Anforderung: ${ageMin}-${ageMax})`;
    } else {
      const diff = playerAge < ageMin ? ageMin - playerAge : playerAge - ageMax;
      if (diff <= 2) { ageScore = 8; ageDetail = `⚠️ ${playerAge} Jahre – knapp außerhalb (${ageMin}-${ageMax})`; }
      else { ageScore = 0; ageDetail = `❌ ${playerAge} Jahre – außerhalb Altersanforderung (${ageMin}-${ageMax})`; }
    }
    breakdown.push({ name: 'Alter', weight: 20, achieved: ageScore, status: ageScore === 20 ? 'success' : (ageScore > 0 ? 'partial' : 'fail'), required: false, detail: ageDetail });
  }

  // --- 3. MARKTWERT / BUDGET (15 Punkte) ---
  if (request.budget_max || request.budget_min) {
    const budgetMax = request.budget_max;
    const budgetMin = request.budget_min || 0;
    const mv = player.market_value;
    let mvScore = 0;
    let mvDetail = '';
    if (!mv) {
      mvDetail = 'Marktwert unbekannt';
    } else if (budgetMax && mv > budgetMax) {
      const over = mv / budgetMax;
      if (over > 2) { mvScore = 0; mvDetail = `❌ Marktwert (${formatMV(mv)}) deutlich über Budget (Max: ${formatMV(budgetMax)})`; }
      else { mvScore = 5; mvDetail = `⚠️ Marktwert (${formatMV(mv)}) leicht über Budget (Max: ${formatMV(budgetMax)})`; }
    } else if (mv >= budgetMin) {
      mvScore = 15;
      mvDetail = `✅ Marktwert (${formatMV(mv)}) im Budget (${formatMV(budgetMin)}-${formatMV(budgetMax)})`;
    } else {
      mvScore = 10;
      mvDetail = `✅ Marktwert (${formatMV(mv)}) im Rahmen`;
    }
    breakdown.push({ name: 'Marktwert / Budget', weight: 15, achieved: mvScore, status: mvScore === 15 ? 'success' : (mvScore > 0 ? 'partial' : 'fail'), required: false, detail: mvDetail });
  }

  // --- 4. LIGA-TIER FIT (15 Punkte) ---
  if (request.league) {
    const tierFit = calcLeagueTierFit(player.market_value, request.league, playerAge);
    const tierScore = Math.round(tierFit.score * 15);
    breakdown.push({
      name: 'Liga-Niveau Fit',
      weight: 15,
      achieved: tierScore,
      status: tierFit.score >= 0.8 ? 'success' : (tierFit.score >= 0.4 ? 'partial' : 'fail'),
      required: false,
      detail: tierFit.reason,
      tier: tierFit.tier
    });
  }

  // --- 5. STARKER FUß (5 Punkte, nur wenn gefordert) ---
  if (request.sought_foot) {
    let footScore = 0;
    let footDetail = '';
    const pFoot = player.foot;
    if (!pFoot) {
      footDetail = 'Starker Fuß des Spielers nicht angegeben';
    } else if (pFoot === 'beidfüßig') {
      footScore = 5;
      footDetail = `✅ Beidfüßig (passt immer)`;
    } else if (pFoot === request.sought_foot) {
      footScore = 5;
      footDetail = `✅ ${pFoot} (gefordert: ${request.sought_foot})`;
    } else {
      footScore = 0;
      footDetail = `❌ ${pFoot} (gefordert: ${request.sought_foot})`;
    }
    breakdown.push({ name: 'Starker Fuß', weight: 5, achieved: footScore, status: footScore === 5 ? 'success' : 'fail', required: false, detail: footDetail });
  }

  // --- 6. SPIELERPRÄFERENZEN (10 Punkte) ---
  if (prefs.preferred_leagues?.length > 0 || prefs.preferred_countries?.length > 0) {
    let prefScore = 0;
    const prefDetails = [];
    if (prefs.preferred_leagues?.includes(request.league)) { prefScore += 5; prefDetails.push(`✅ Liga "${request.league}" in Präferenzen`); }
    else if (prefs.preferred_leagues?.length > 0) prefDetails.push(`Liga "${request.league}" nicht in Spielerpräferenzen`);
    if (prefs.preferred_countries?.includes(request.country)) { prefScore += 5; prefDetails.push(`✅ Land "${request.country}" in Präferenzen`); }
    else if (prefs.preferred_countries?.length > 0) prefDetails.push(`Land "${request.country}" nicht in Präferenzen`);

    breakdown.push({
      name: 'Spielerpräferenzen',
      weight: 10,
      achieved: prefScore,
      status: prefScore === 10 ? 'success' : (prefScore > 0 ? 'partial' : 'fail'),
      required: false,
      detail: prefDetails.join(' | ') || 'Keine Präferenz-Übereinstimmung'
    });
  }

  const totalWeight = breakdown.reduce((s, i) => s + i.weight, 0);
  const totalAchieved = breakdown.reduce((s, i) => s + i.achieved, 0);
  const score = totalWeight > 0 ? Math.round((totalAchieved / totalWeight) * 100) : 0;

  return { score, breakdown, disqualified: false };
}