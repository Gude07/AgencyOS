/**
 * PlayerStats Pipeline – Modularer Multi-Source-Orchestrator
 * -----------------------------------------------------------
 * 6-Stufen-Pipeline mit Plugin-fähigem Quellen-System:
 *   1. FETCH     – Über registrierte fetcherFn abrufen (inkl. Fallback & Multi-Source)
 *   2. PARSE     – Datenextraktion aus Fetcher-Antwort
 *   3. NORMALIZE – Feldnamen & Typen standardisieren (quellen-spezifisches Mapping)
 *   4. VALIDATE  – Pflichtfelder & Plausibilität prüfen
 *   5. MATCH     – Externe → interne Player-Entity
 *   6. PERSIST   – Erstellen / inkrementelles Update
 *
 * Neue Quelle hinzufügen:
 *   import { registerSource } from "./playerStatsSourceRegistry";
 *   registerSource({ id: "whoscored", label: "WhoScored", fetcherFn, fieldMap, priority: 2 });
 */

import { base44 } from "@/api/base44Client";
import { normalizePlayerStats, validatePlayerStats } from "./playerStatsNormalizer";
import { matchPlayerToInternal, checkForDuplicate } from "./playerStatsMatcher";
import {
  getAllSources,
  getSource,
  resolveSourcesForPlayer,
  mergeStats,
  compareStats,
  getGlobalConfig,
} from "./playerStatsSourceRegistry";

// ── HILFSFUNKTIONEN ───────────────────────────────────────────────────────────

export const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const seasonStart = month >= 6 ? year : year - 1;
  return `${seasonStart}/${String(seasonStart + 1).slice(2)}`;
};

// ── LOGGING ───────────────────────────────────────────────────────────────────

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

// ── STAGE 1: FETCH (multi-source-fähig) ───────────────────────────────────────

/**
 * Ruft Daten von einer einzelnen Quelle ab.
 * @returns {{ rawData, source, fieldMap } | null}
 */
const fetchFromSource = async (sourceId, playerName, clubName, season) => {
  const src = getSource(sourceId);
  if (!src) {
    await pipelineLog("warning", "fetch", `Unbekannte Quelle: ${sourceId}`, { playerName });
    return null;
  }
  const rawData = await src.fetcherFn(playerName, clubName, season);
  if (rawData?.error) return null;
  return { rawData, source: sourceId, fieldMap: src.fieldMap };
};

/**
 * Haupt-Fetch-Strategie: primär, mit optionalem Fallback und Multi-Source.
 * @param {string[]} sourceIds
 * @param {string} aggregationMode
 * @param {{ playerName, clubName, season }}
 * @returns {Promise<{ fetchedItems: Array, usedSources: string[] }>}
 */
const fetchFromSources = async (sourceIds, aggregationMode, { playerName, clubName, season }) => {
  const fetchedItems = [];

  if (aggregationMode === "primary" || aggregationMode === "compare") {
    // Sequentiell: primäre Quelle zuerst, Fallback wenn gewünscht
    const cfg = getGlobalConfig();
    for (const sourceId of sourceIds) {
      const result = await fetchFromSource(sourceId, playerName, clubName, season);
      if (result) {
        fetchedItems.push(result);
        // Im Primär-Modus: nur erste erfolgreiche Quelle, außer autoFallback ist aktiv
        if (aggregationMode === "primary" && !cfg.autoFallback) break;
        if (aggregationMode === "primary" && fetchedItems.length >= 1) break;
      } else if (cfg.autoFallback && aggregationMode === "primary") {
        await pipelineLog("info", "fetch",
          `Quelle ${sourceId} fehlgeschlagen, Fallback aktiv`, { playerName });
      }
    }
  } else if (aggregationMode === "merge") {
    // Parallel: alle Quellen gleichzeitig abrufen
    const results = await Promise.all(
      sourceIds.map((sid) => fetchFromSource(sid, playerName, clubName, season))
    );
    fetchedItems.push(...results.filter(Boolean));
  }

  return {
    fetchedItems,
    usedSources: fetchedItems.map((f) => f.source),
  };
};

// ── HAUPT-PIPELINE: EINZELNER SPIELER ────────────────────────────────────────

/**
 * Führt die vollständige Pipeline für einen Spieler durch.
 * @param {{
 *   playerName: string,
 *   clubName?: string,
 *   season?: string,
 *   internalPlayerId?: string,
 *   sourceOverride?: string | string[],  // Überschreibt globale/Spieler-Config
 *   aggregationModeOverride?: string,
 * }} params
 * @returns {Promise<PipelineResult>}
 */
export const syncSinglePlayer = async ({
  playerName,
  clubName = "",
  season = null,
  internalPlayerId = null,
  sourceOverride = null,
  aggregationModeOverride = null,
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
    usedSources: [],
    aggregationMode: null,
  };

  try {
    // Quellen-Konfiguration auflösen
    const { sources, aggregationMode } = sourceOverride
      ? {
          sources: Array.isArray(sourceOverride) ? sourceOverride : [sourceOverride],
          aggregationMode: aggregationModeOverride || getGlobalConfig().aggregationMode,
        }
      : resolveSourcesForPlayer(internalPlayerId);

    result.aggregationMode = aggregationModeOverride || aggregationMode;

    // ── 1. FETCH ──────────────────────────────────────────
    result.stage = "fetch";
    const { fetchedItems, usedSources } = await fetchFromSources(
      sources,
      result.aggregationMode,
      { playerName, clubName, season: targetSeason }
    );

    result.usedSources = usedSources;

    if (!fetchedItems.length) {
      result.errors.push(`Spieler nicht gefunden in Quellen [${sources.join(", ")}]: "${playerName}"`);
      await pipelineLog("warning", "fetch", `Nicht gefunden: ${playerName}`, {
        playerName, sources,
      });
      return result;
    }

    await pipelineLog("info", "fetch",
      `Daten abgerufen von [${usedSources.join(", ")}]: ${playerName}`,
      { playerName, usedSources }
    );

    // ── 2+3. PARSE + NORMALIZE ────────────────────────────
    result.stage = "normalize";

    const normalizedItems = fetchedItems.map(({ rawData, source, fieldMap }) => {
      const { normalized, warnings: normWarnings } = normalizePlayerStats(rawData, source, fieldMap);
      normalized.source_url = rawData.source_url || "";
      normalized.raw_data = JSON.stringify(rawData);
      result.warnings.push(...normWarnings);
      return normalized;
    });

    // ── AGGREGATION ───────────────────────────────────────
    let finalNormalized;

    if (result.aggregationMode === "merge" && normalizedItems.length > 1) {
      finalNormalized = mergeStats(normalizedItems);
      await pipelineLog("info", "normalize",
        `Merge von ${normalizedItems.length} Quellen: ${playerName}`, { playerName, usedSources });

    } else if (result.aggregationMode === "compare" && normalizedItems.length > 1) {
      finalNormalized = normalizedItems[0]; // Primärdaten
      const { diffs, hasDifferences } = compareStats(normalizedItems[0], normalizedItems[1]);
      if (hasDifferences) {
        result.warnings.push(`Unterschiede zwischen Quellen: ${diffs.map(d => d.field).join(", ")}`);
        await pipelineLog("warning", "normalize",
          `Quelldaten weichen ab (${diffs.length} Felder): ${playerName}`,
          { playerName, diffs }
        );
      }
    } else {
      finalNormalized = normalizedItems[0];
    }

    // ── 4. VALIDATE ───────────────────────────────────────
    result.stage = "validate";
    const { valid, errors: valErrors, warnings: valWarnings } = validatePlayerStats(finalNormalized);
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
      const matchResult = matchPlayerToInternal(finalNormalized, allPlayers);
      matchedId = matchResult.player_id;
      confidence = matchResult.confidence;
      matchStatus = matchResult.match_status;

      if (matchStatus === "unmatched") {
        await pipelineLog("warning", "match", `Kein Match: ${playerName}`, {
          playerName, extClub: finalNormalized.club, candidates: matchResult.candidates,
        });
      } else if (matchStatus === "needs_review") {
        await pipelineLog("warning", "match",
          `Unsicheres Matching (${confidence}%): ${playerName}`,
          { playerName, matchedId, confidence, candidates: matchResult.candidates }
        );
      }
    }

    finalNormalized.player_id = matchedId || null;
    finalNormalized.match_confidence = confidence;
    finalNormalized.match_status = matchStatus;
    result.matchedPlayerId = matchedId;
    result.matchConfidence = confidence;

    // ── 6. PERSIST ────────────────────────────────────────
    result.stage = "persist";
    const existingStats = await base44.entities.PlayerStats.list();
    const { exists, existingId, needsUpdate } = checkForDuplicate(finalNormalized, existingStats);

    if (exists && !needsUpdate) {
      result.playerStatsId = existingId;
      result.success = true;
      result.skipped = true;
      await pipelineLog("info", "persist", `Kein Update nötig: ${playerName}`, { playerName, existingId });
      return result;
    }

    if (exists && needsUpdate) {
      await base44.entities.PlayerStats.update(existingId, {
        ...finalNormalized,
        last_updated: new Date().toISOString(),
      });
      result.playerStatsId = existingId;
      await pipelineLog("info", "persist", `Aktualisiert: ${playerName}`, { playerName, existingId });
    } else {
      const created = await base44.entities.PlayerStats.create(finalNormalized);
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
 * Verarbeitet eine Liste von Spielern sequentiell.
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
 * Synchronisiert alle aktiven Spieler im System.
 * @param {string} [season]
 * @param {Function} [onProgress]
 * @param {{ sourceOverride?, aggregationModeOverride? }} [options]
 */
export const syncAllPlayers = async (season = null, onProgress = null, options = {}) => {
  const allPlayers = await base44.entities.Player.list();
  const active = allPlayers.filter((p) => !p.archive_id && p.status !== "abgeschlossen");

  const playerList = active.map((p) => ({
    playerName: p.name,
    clubName: p.current_club || "",
    season: season || getCurrentSeason(),
    internalPlayerId: p.id,
    ...options,
  }));

  return runImportPipeline(playerList, onProgress);
};

// ── HILFSFUNKTIONEN FÜR UI ────────────────────────────────────────────────────

/** Gibt alle verfügbaren Quellen für die UI zurück */
export const getAvailableSources = () =>
  getAllSources().map(({ id, label, priority }) => ({ id, label, priority }));