/**
 * PlayerStats Pipeline – Haupt-Orchestrator
 * ------------------------------------------
 * Modulare 6-Stufen-Pipeline:
 *   1. FETCH     – LLM+Internet-Scraping von soccerstats247.com
 *   2. PARSE     – Datenextraktion aus LLM-Antwort
 *   3. NORMALIZE – Feldnamen & Typen standardisieren
 *   4. VALIDATE  – Pflichtfelder & Plausibilität prüfen
 *   5. MATCH     – Externe → interne Player-Entity
 *   6. PERSIST   – Erstellen / inkrementelles Update
 *
 * Erweiterbar für neue Quellen: Neuen `fetcherFn` implementieren, 
 * Rest der Pipeline bleibt unverändert.
 */

import { base44 } from "@/api/base44Client";
import { normalizePlayerStats, validatePlayerStats } from "./playerStatsNormalizer";
import { matchPlayerToInternal, checkForDuplicate } from "./playerStatsMatcher";

const SOURCE_ID = "soccerstats247";

const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const seasonStart = month >= 7 ? year : year - 1;
  return `${seasonStart}/${String(seasonStart + 1).slice(2)}`;
};

// ── LOGGING ─────────────────────────────────────────────────────────────────

const pipelineLog = async (level, stage, message, details = {}) => {
  try {
    await base44.entities.PlayerStatsLog.create({
      level,
      stage,
      message,
      player_name: details.playerName || null,
      player_id: details.playerId || null,
      source_url: details.sourceUrl || null,
      details: JSON.stringify(details),
    });
  } catch (e) {
    console.warn("Log-Fehler:", e);
  }
  console[level === "error" ? "error" : level === "warning" ? "warn" : "log"](
    `[StatsP][${stage}] ${message}`, details
  );
};

// ── STAGE 1: FETCH via InvokeLLM + Internet ──────────────────────────────────

const fetchPlayerStatsFromSource = async (playerName, clubName, targetSeason) => {
  const prompt = `
Search soccerstats247.com for player statistics.

Player to find:
- Name: "${playerName}"
- Club: "${clubName || "unknown"}"
- Season: "${targetSeason}"

Instructions:
1. Search https://www.soccerstats247.com for this player
2. Find their player profile/statistics page
3. Extract ALL available statistics for the season ${targetSeason}

Return a JSON object with these fields (use null if not available):
{
  "full_name": "exact player name from site",
  "club": "team name",
  "competition": "league/competition name",
  "season": "season string",
  "position": "player position",
  "appearances": number,
  "starts": number,
  "minutes_played": number,
  "goals": number,
  "assists": number,
  "yellow_cards": number,
  "red_cards": number,
  "shots": number,
  "shots_on_target": number,
  "pass_accuracy": number,
  "clean_sheets": number,
  "tackles": number,
  "interceptions": number,
  "source_url": "exact URL of player page"
}

If player not found, return: {"error": "player_not_found"}
`;

  return base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        error: { type: "string" },
        full_name: { type: "string" },
        club: { type: "string" },
        competition: { type: "string" },
        season: { type: "string" },
        position: { type: "string" },
        appearances: { type: "number" },
        starts: { type: "number" },
        minutes_played: { type: "number" },
        goals: { type: "number" },
        assists: { type: "number" },
        yellow_cards: { type: "number" },
        red_cards: { type: "number" },
        shots: { type: "number" },
        shots_on_target: { type: "number" },
        pass_accuracy: { type: "number" },
        clean_sheets: { type: "number" },
        tackles: { type: "number" },
        interceptions: { type: "number" },
        source_url: { type: "string" },
      },
    },
  });
};

// ── HAUPT-PIPELINE: EINZELNER SPIELER ────────────────────────────────────────

/**
 * Führt die vollständige Pipeline für einen Spieler durch.
 * @param {{ playerName, clubName?, season?, internalPlayerId? }} params
 * @returns {Promise<PipelineResult>}
 */
export const syncSinglePlayer = async ({
  playerName,
  clubName = "",
  season = null,
  internalPlayerId = null,
}) => {
  const targetSeason = season || getCurrentSeason();
  const result = {
    success: false,
    stage: "init",
    playerName,
    playerStatsId: null,
    matchedPlayerId: null,
    matchConfidence: 0,
    skipped: false,
    warnings: [],
    errors: [],
  };

  try {
    // ── 1. FETCH ──────────────────────────────────────────
    result.stage = "fetch";
    const rawData = await fetchPlayerStatsFromSource(playerName, clubName, targetSeason);

    if (rawData?.error) {
      result.errors.push(`Spieler nicht gefunden auf soccerstats247: "${playerName}"`);
      await pipelineLog("warning", "fetch", `Nicht gefunden: ${playerName}`, { playerName });
      return result;
    }

    const sourceUrl = rawData.source_url || "https://www.soccerstats247.com";
    await pipelineLog("info", "fetch", `Daten abgerufen: ${playerName}`, { playerName, sourceUrl });

    // ── 2+3. PARSE + NORMALIZE ────────────────────────────
    result.stage = "normalize";
    const { normalized, warnings: normWarnings } = normalizePlayerStats(rawData, SOURCE_ID);
    normalized.source_url = sourceUrl;
    normalized.raw_data = JSON.stringify(rawData);
    result.warnings.push(...normWarnings);

    // ── 4. VALIDATE ───────────────────────────────────────
    result.stage = "validate";
    const { valid, errors: valErrors, warnings: valWarnings } = validatePlayerStats(normalized);
    result.warnings.push(...valWarnings);

    if (!valid) {
      result.errors.push(...valErrors);
      await pipelineLog("error", "validate", `Validierung fehlgeschlagen: ${playerName}`, {
        playerName, errors: valErrors,
      });
      return result;
    }

    // ── 5. MATCH ──────────────────────────────────────────
    result.stage = "match";
    let matchedId = internalPlayerId;
    let confidence = internalPlayerId ? 100 : 0;
    let matchStatus = internalPlayerId ? "confirmed" : "unmatched";

    if (!internalPlayerId) {
      const allPlayers = await base44.entities.Player.list();
      const matchResult = matchPlayerToInternal(normalized, allPlayers);
      matchedId = matchResult.player_id;
      confidence = matchResult.confidence;
      matchStatus = matchResult.match_status;

      if (matchStatus === "unmatched") {
        await pipelineLog("warning", "match", `Kein Match: ${playerName}`, {
          playerName, extClub: normalized.club, candidates: matchResult.candidates,
        });
      } else if (matchStatus === "needs_review") {
        await pipelineLog("warning", "match", `Unsicheres Matching (${confidence}%): ${playerName}`, {
          playerName, matchedId, confidence, candidates: matchResult.candidates,
        });
      }
    }

    normalized.player_id = matchedId || null;
    normalized.match_confidence = confidence;
    normalized.match_status = matchStatus;
    result.matchedPlayerId = matchedId;
    result.matchConfidence = confidence;

    // ── 6. PERSIST ────────────────────────────────────────
    result.stage = "persist";
    const existingStats = await base44.entities.PlayerStats.list();
    const { exists, existingId, needsUpdate } = checkForDuplicate(normalized, existingStats);

    if (exists && !needsUpdate) {
      result.playerStatsId = existingId;
      result.success = true;
      result.skipped = true;
      await pipelineLog("info", "persist", `Kein Update nötig: ${playerName}`, { playerName, existingId });
      return result;
    }

    if (exists && needsUpdate) {
      await base44.entities.PlayerStats.update(existingId, {
        ...normalized,
        last_updated: new Date().toISOString(),
      });
      result.playerStatsId = existingId;
      await pipelineLog("info", "persist", `Aktualisiert: ${playerName}`, { playerName, existingId });
    } else {
      const created = await base44.entities.PlayerStats.create(normalized);
      result.playerStatsId = created.id;
      await pipelineLog("info", "persist", `Neu erstellt: ${playerName}`, { playerName, id: created.id });
    }

    result.success = true;
    return result;

  } catch (err) {
    result.errors.push(err.message || "Unbekannter Fehler");
    await pipelineLog("error", result.stage, `Pipeline-Fehler (${playerName}): ${err.message}`, {
      playerName, stage: result.stage,
    });
    return result;
  }
};

// ── BATCH-PIPELINE ────────────────────────────────────────────────────────────

/**
 * Verarbeitet eine Liste von Spielern sequentiell (cron-fähig).
 * @param {Array} playerList
 * @param {Function} [onProgress] - (completed, total, result) => void
 * @returns {Promise<BatchResult>}
 */
export const runImportPipeline = async (playerList, onProgress = null) => {
  const batch = {
    total: playerList.length,
    successful: 0,
    skipped: 0,
    failed: 0,
    needsReview: 0,
    results: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  await pipelineLog("info", "fetch", `Batch gestartet: ${playerList.length} Spieler`, {});

  for (let i = 0; i < playerList.length; i++) {
    const res = await syncSinglePlayer(playerList[i]);
    batch.results.push(res);

    if (res.success) {
      res.skipped ? batch.skipped++ : batch.successful++;
    } else {
      batch.failed++;
    }
    if (res.matchConfidence > 0 && res.matchConfidence < 80) batch.needsReview++;

    if (onProgress) onProgress(i + 1, playerList.length, res);

    // Rate-Limiting
    if (i < playerList.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  batch.completedAt = new Date().toISOString();
  await pipelineLog("info", "persist",
    `Batch fertig: ${batch.successful} OK, ${batch.failed} Fehler, ${batch.needsReview} Review`, batch
  );

  return batch;
};

// ── SYNC ALLE AKTIVEN SPIELER ─────────────────────────────────────────────────

/**
 * Synchronisiert alle aktiven (nicht-archivierten) Spieler im System.
 * @param {string} [season]
 * @param {Function} [onProgress]
 */
export const syncAllPlayers = async (season = null, onProgress = null) => {
  const allPlayers = await base44.entities.Player.list();
  const active = allPlayers.filter((p) => !p.archive_id && p.status !== "abgeschlossen");

  const playerList = active.map((p) => ({
    playerName: p.name,
    clubName: p.current_club || "",
    season: season || getCurrentSeason(),
    internalPlayerId: p.id,
  }));

  return runImportPipeline(playerList, onProgress);
};