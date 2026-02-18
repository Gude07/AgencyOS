/**
 * PlayerStats Matcher
 * -------------------
 * Matching-Engine: Verknüpft externe Statistiken mit internen Spielerprofilen.
 *
 * Scoring (0–100):
 *  Exakter Name + exakter Verein  → ~90–100 → auto_matched
 *  Exakter Name + Verein ähnlich  → ~80–85  → auto_matched
 *  Ähnlicher Name + exakter Verein→ ~75–80  → auto_matched
 *  Nur exakter Name               → ~50–55  → needs_review
 *  Nur ähnlicher Name             → ~35–40  → unmatched
 *
 * Threshold: >=80 auto_matched | >=50 needs_review | <50 unmatched
 */

/** Normalisiert Namen für Fuzzy-Vergleich (Akzente, Sonderzeichen, Case) */
const normalizeName = (name) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const namesMatch = (a, b, exact = false) => {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (exact) return na === nb;
  return na === nb || na.includes(nb) || nb.includes(na);
};

const clubsMatch = (external, internal) => {
  if (!external || !internal) return false;
  const ne = normalizeName(external);
  const ni = normalizeName(internal);
  if (ne === ni) return true;
  // Entfernt gängige Club-Präfixe/-Suffixe
  const strip = (s) => s.replace(/\b(fc|sc|sv|fsv|bv|vfb|vfl|ac|cf|ss|as|rb|rc|if|fk|sk|1)\b/g, "").trim();
  return strip(ne) === strip(ni);
};

/**
 * Findet besten internen Player-Match für externe Stats.
 * @param {Object} normalizedStats
 * @param {Array}  internalPlayers - Player[] aus DB
 * @returns {{ player_id, confidence, match_status, candidates }}
 */
export const matchPlayerToInternal = (normalizedStats, internalPlayers) => {
  const extName = normalizedStats.player_name_external;
  const extClub = normalizedStats.club;
  const extLeague = normalizedStats.competition;
  const candidates = [];

  for (const player of internalPlayers) {
    const exactName = namesMatch(extName, player.name, true);
    const fuzzyName = !exactName && namesMatch(extName, player.name, false);
    if (!exactName && !fuzzyName) continue;

    let score = exactName ? 50 : 35;
    const reasons = [exactName ? "Exakter Name" : "Ähnlicher Name"];

    const exactClub = clubsMatch(extClub, player.current_club);
    if (exactClub) {
      score += 40;
      reasons.push("Exakter Verein");
    } else if (extClub && player.current_club) {
      score += 10;
      reasons.push("Verein ähnlich");
    }

    // Liga-Bonus
    const leagueHint = extLeague && player.preferences?.preferred_leagues?.some(
      (l) => normalizeName(l).includes(normalizeName(extLeague))
    );
    if (leagueHint) { score += 10; reasons.push("Liga passt"); }

    candidates.push({
      player_id: player.id,
      player_name: player.name,
      current_club: player.current_club,
      score: Math.min(score, 100),
      reasons,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return { player_id: null, confidence: 0, match_status: "unmatched", candidates: [] };
  }

  const best = candidates[0];
  const hasTie = candidates.length > 1 && candidates[1].score === best.score;
  const confidence = hasTie ? Math.min(best.score - 15, 50) : best.score;
  const match_status = confidence >= 80 ? "auto_matched" : confidence >= 50 ? "needs_review" : "unmatched";

  return { player_id: best.player_id, confidence, match_status, candidates: candidates.slice(0, 3) };
};

/**
 * Prüft ob ein Eintrag bereits existiert (Duplikat-Check).
 * @returns {{ exists, existingId, needsUpdate }}
 */
export const checkForDuplicate = (normalizedStats, existingStats) => {
  const norm = (s) => normalizeName(s || "");

  const existing = existingStats.find(
    (s) =>
      norm(s.player_name_external) === norm(normalizedStats.player_name_external) &&
      s.season === normalizedStats.season &&
      norm(s.competition) === norm(normalizedStats.competition) &&
      s.source === normalizedStats.source
  );

  if (!existing) return { exists: false, existingId: null, needsUpdate: false };

  const changed =
    existing.goals !== normalizedStats.goals ||
    existing.assists !== normalizedStats.assists ||
    existing.appearances !== normalizedStats.appearances ||
    existing.minutes_played !== normalizedStats.minutes_played;

  return { exists: true, existingId: existing.id, needsUpdate: changed };
};