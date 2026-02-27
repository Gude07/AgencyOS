/**
 * PlayerStats Source Registry
 * ----------------------------
 * Plugin-System für Statistik-Datenquellen.
 *
 * Eine Quelle besteht aus:
 *  - id:          Eindeutiger Bezeichner (z.B. "soccerstats247")
 *  - label:       Anzeigename
 *  - fetcherFn:   async (playerName, clubName, season) => rawData | { error }
 *  - fieldMap:    Mapping von Roh-Feldern → internes Schema
 *  - priority:    Sortierung bei Aggregation (niedrig = höhere Priorität)
 *
 * Neue Quelle hinzufügen:
 *   import { registerSource } from "@/components/stats/playerStatsSourceRegistry";
 *   registerSource({ id: "whoscored", label: "WhoScored", fetcherFn, fieldMap, priority: 2 });
 */

import { base44 } from "@/api/base44Client";

// ── INTERNE REGISTRY ──────────────────────────────────────────────────────────

const registry = new Map();

/**
 * Registriert eine neue Datenquelle.
 * @param {{ id, label, fetcherFn, fieldMap, priority? }} source
 */
export const registerSource = (source) => {
  if (!source.id || !source.fetcherFn || !source.fieldMap) {
    throw new Error(`Source "${source.id}" ist unvollständig (id, fetcherFn, fieldMap erforderlich)`);
  }
  registry.set(source.id, { priority: 99, ...source });
};

/** Gibt eine registrierte Quelle zurück */
export const getSource = (id) => registry.get(id);

/** Alle registrierten Quellen, sortiert nach Priorität */
export const getAllSources = () =>
  [...registry.values()].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

/** Alle Quellen-IDs */
export const getSourceIds = () => [...registry.keys()];

// ── GLOBALE STANDARD-KONFIGURATION ───────────────────────────────────────────

let globalConfig = {
  defaultSource: "soccerstats247",
  aggregationMode: "primary",       // "primary" | "merge" | "compare"
  autoFallback: true,               // Falls primäre Quelle fehlschlägt, nächste versuchen
  playerOverrides: {},              // { [playerId]: { preferredSource, sources[] } }
};

export const setGlobalConfig = (patch) => {
  globalConfig = { ...globalConfig, ...patch };
};

export const getGlobalConfig = () => ({ ...globalConfig });

/**
 * Setzt eine quellen-spezifische Konfiguration für einen einzelnen Spieler.
 * @param {string} playerId  - interne Player-ID
 * @param {{ preferredSource?, sources?, aggregationMode? }} config
 */
export const setPlayerSourceConfig = (playerId, config) => {
  globalConfig.playerOverrides[playerId] = {
    ...(globalConfig.playerOverrides[playerId] || {}),
    ...config,
  };
};

export const getPlayerSourceConfig = (playerId) =>
  globalConfig.playerOverrides[playerId] || null;

/**
 * Ermittelt die effektive Quellen-Liste für einen Spieler.
 * @returns {{ sources: string[], aggregationMode: string }}
 */
export const resolveSourcesForPlayer = (playerId) => {
  const override = playerId ? getPlayerSourceConfig(playerId) : null;
  if (override?.sources?.length) {
    return {
      sources: override.sources,
      aggregationMode: override.aggregationMode || globalConfig.aggregationMode,
    };
  }
  if (override?.preferredSource) {
    return {
      sources: [override.preferredSource],
      aggregationMode: override.aggregationMode || globalConfig.aggregationMode,
    };
  }
  return {
    sources: [globalConfig.defaultSource],
    aggregationMode: globalConfig.aggregationMode,
  };
};

// ── AGGREGATIONS-LOGIK ───────────────────────────────────────────────────────

/**
 * Vergleichsmodus: Hebt Abweichungen zwischen zwei Datensätzen hervor.
 * @returns {{ merged, diffs: Array<{field, values}> }}
 */
export const compareStats = (statsA, statsB) => {
  const COMPARABLE = ["goals", "assists", "appearances", "starts", "minutes_played", "yellow_cards", "red_cards"];
  const diffs = [];
  for (const field of COMPARABLE) {
    const a = statsA[field];
    const b = statsB[field];
    if (a != null && b != null && a !== b) {
      diffs.push({ field, values: { [statsA.source]: a, [statsB.source]: b } });
    }
  }
  return { diffs, hasDifferences: diffs.length > 0 };
};

/**
 * Merge-Modus: Kombiniert Daten aus mehreren Quellen.
 * Primäre Quelle hat Vorrang; fehlende Felder werden aus Sekundärquellen ergänzt.
 * @param {Object[]} statsArray - Array normalisierter Stats, sortiert nach Quellenpriorität
 * @returns {Object} mergedStats
 */
export const mergeStats = (statsArray) => {
  if (!statsArray.length) return null;
  const primary = { ...statsArray[0] };
  primary.source = statsArray.map((s) => s.source).join("+");
  primary.merged_sources = statsArray.map((s) => s.source);

  for (let i = 1; i < statsArray.length; i++) {
    const secondary = statsArray[i];
    for (const [key, val] of Object.entries(secondary)) {
      if (primary[key] == null && val != null) {
        primary[key] = val;
      }
    }
    // Zusatzstats aus Sekundärquellen einpflegen
    if (secondary.additional_stats) {
      primary.additional_stats = {
        ...(secondary.additional_stats || {}),
        ...(primary.additional_stats || {}), // Primär hat Vorrang
      };
    }
  }
  return primary;
};

// ── BUILT-IN: SOCCERSTATS247 ──────────────────────────────────────────────────

const SOCCERSTATS247_FIELD_MAP = {
  "name": "player_name_external",
  "full name": "player_name_external",
  "full_name": "player_name_external",
  "player": "player_name_external",
  "club": "club",
  "team": "club",
  "league": "competition",
  "competition": "competition",
  "season": "season",
  "position": "position",
  "pos": "position",
  "appearances": "appearances",
  "apps": "appearances",
  "matches": "appearances",
  "starts": "starts",
  "started": "starts",
  "minutes": "minutes_played",
  "minutes_played": "minutes_played",
  "mins": "minutes_played",
  "goals": "goals",
  "assists": "assists",
  "yellow_cards": "yellow_cards",
  "yellow cards": "yellow_cards",
  "yellows": "yellow_cards",
  "red_cards": "red_cards",
  "red cards": "red_cards",
  "reds": "red_cards",
  "shots": "additional_stats.shots",
  "shots_on_target": "additional_stats.shots_on_target",
  "shots on target": "additional_stats.shots_on_target",
  "pass_accuracy": "additional_stats.pass_accuracy",
  "pass accuracy": "additional_stats.pass_accuracy",
  "clean_sheets": "additional_stats.clean_sheets",
  "clean sheets": "additional_stats.clean_sheets",
  "tackles": "additional_stats.tackles",
  "interceptions": "additional_stats.interceptions",
  "dribbles": "additional_stats.dribbles",
  "fouls_committed": "additional_stats.fouls_committed",
  "fouls committed": "additional_stats.fouls_committed",
  "fouls_drawn": "additional_stats.fouls_drawn",
  "fouls drawn": "additional_stats.fouls_drawn",
};

const buildLLMFetcher = (siteUrl, siteName, extraInstructions = "") =>
  async (playerName, clubName, season) => {
    const prompt = `
Search ${siteName} for player statistics.

Player to find:
- Name: "${playerName}"
- Club: "${clubName || "unknown"}"
- Season: "${season}"

Instructions:
1. Search ${siteUrl} for this player
2. Find their player profile/statistics page
3. Extract ALL available statistics for the season ${season}
${extraInstructions}

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

// Soccerstats247 als Standard-Quelle registrieren
registerSource({
  id: "soccerstats247",
  label: "SoccerStats247",
  fetcherFn: buildLLMFetcher(
    "https://www.soccerstats247.com",
    "soccerstats247.com"
  ),
  fieldMap: SOCCERSTATS247_FIELD_MAP,
  priority: 1,
});

// ── BUILT-IN: WHOSCORED ───────────────────────────────────────────────────────

const WHOSCORED_FIELD_MAP = {
  ...SOCCERSTATS247_FIELD_MAP,
  // WhoScored-spezifische Felder
  "rating": "additional_stats.rating",
  "whoscored_rating": "additional_stats.rating",
  "player_rating": "additional_stats.rating",
  "key_passes": "additional_stats.key_passes",
  "key passes": "additional_stats.key_passes",
  "dribbles_won": "additional_stats.dribbles",
  "successful_dribbles": "additional_stats.dribbles",
  "aerials_won": "additional_stats.aerials_won",
  "aerials won": "additional_stats.aerials_won",
  "dispossessed": "additional_stats.dispossessed",
  "was_fouled": "additional_stats.fouls_drawn",
  "offsides": "additional_stats.offsides",
  "big_chances_created": "additional_stats.big_chances_created",
  "big chances created": "additional_stats.big_chances_created",
  "through_balls": "additional_stats.through_balls",
  "crosses": "additional_stats.crosses",
  "long_balls": "additional_stats.long_balls",
  "tackles_won": "additional_stats.tackles",
  "clearances": "additional_stats.clearances",
  "blocked": "additional_stats.blocked_shots",
};

const WHOSCORED_EXTRA_INSTRUCTIONS = `
Focus on extracting the WhoScored player rating (1-10 scale) as well as advanced metrics like:
key passes, successful dribbles, aerial duels won, big chances created, clearances, and crosses.
Also extract the standard stats: appearances, goals, assists, cards, minutes.
Look for the player's season statistics table on their profile page.
`;

registerSource({
  id: "whoscored",
  label: "WhoScored",
  fetcherFn: async (playerName, clubName, season) => {
    const prompt = `
Search WhoScored.com for player statistics.

Player to find:
- Name: "${playerName}"
- Club: "${clubName || "unknown"}"
- Season: "${season}"

Instructions:
1. Search https://www.whoscored.com for this player
2. Find their player profile/statistics page
3. Extract ALL available statistics for the season ${season}
${WHOSCORED_EXTRA_INSTRUCTIONS}

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
  "rating": number,
  "shots": number,
  "shots_on_target": number,
  "key_passes": number,
  "dribbles_won": number,
  "aerials_won": number,
  "tackles_won": number,
  "interceptions": number,
  "clearances": number,
  "crosses": number,
  "big_chances_created": number,
  "pass_accuracy": number,
  "clean_sheets": number,
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
          rating: { type: "number" },
          shots: { type: "number" },
          shots_on_target: { type: "number" },
          key_passes: { type: "number" },
          dribbles_won: { type: "number" },
          aerials_won: { type: "number" },
          tackles_won: { type: "number" },
          interceptions: { type: "number" },
          clearances: { type: "number" },
          crosses: { type: "number" },
          big_chances_created: { type: "number" },
          pass_accuracy: { type: "number" },
          clean_sheets: { type: "number" },
          source_url: { type: "string" },
        },
      },
    });
  },
  fieldMap: WHOSCORED_FIELD_MAP,
  priority: 2,
});

// ── BEISPIEL: SOFASCORE (auskommentiert, als Vorlage) ──────────────────────────
//
// registerSource({
//   id: "sofascore",
//   label: "SofaScore",
//   fetcherFn: buildLLMFetcher(
//     "https://www.sofascore.com",
//     "SofaScore.com"
//   ),
//   fieldMap: SOCCERSTATS247_FIELD_MAP,
//   priority: 3,
// });

export { buildLLMFetcher };