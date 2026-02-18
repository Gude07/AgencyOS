/**
 * PlayerStats Normalizer
 * ----------------------
 * Verantwortlich für:
 * - Standardisierung von Feldnamen (extern → intern)
 * - Datentyp-Konvertierung (Strings → Numbers)
 * - Berechnung abgeleiteter Metriken (Goals/90, etc.)
 * - Saison-Format-Normalisierung
 *
 * Erweiterbar: Für neue Datenquellen einfach ein neues Mapping-Objekt hinzufügen.
 */

/** Feldname-Mapping von soccerstats247 → internes Schema */
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

const NUMERIC_FIELDS = [
  "appearances", "starts", "minutes_played", "goals",
  "assists", "yellow_cards", "red_cards",
];

/** Bekannte Saison-Format-Normalisierung */
export const normalizeSeason = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s.replace("-", "/");
  if (/^\d{2}\/\d{2}$/.test(s)) {
    const [a, b] = s.split("/");
    return `20${a}/20${b}`;
  }
  if (/^\d{4}$/.test(s)) {
    const yr = parseInt(s);
    return `${yr}/${String(yr + 1).slice(2)}`;
  }
  return s;
};

/** Sicheres Parsen von Zahlen */
const parseNumber = (val) => {
  if (val === null || val === undefined || val === "" || val === "-") return null;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
};

/** Berechnet abgeleitete Metriken */
const computeDerivedMetrics = (stats) => {
  const derived = {};
  const mins = stats.minutes_played;
  const goals = stats.goals ?? 0;
  const assists = stats.assists ?? 0;
  if (mins && mins > 0) {
    derived.goals_per_90 = parseFloat(((goals / mins) * 90).toFixed(2));
    derived.assists_per_90 = parseFloat(((assists / mins) * 90).toFixed(2));
    if (goals > 0) derived.minutes_per_goal = Math.round(mins / goals);
  }
  return derived;
};

/**
 * Normalisiert rohe Spielerdaten zu internem Schema.
 * @param {Object} rawData
 * @param {string} source
 * @returns {{ normalized: Object, warnings: string[] }}
 */
export const normalizePlayerStats = (rawData, source = "soccerstats247") => {
  const warnings = [];
  const normalized = {
    source,
    additional_stats: {},
    last_updated: new Date().toISOString(),
  };

  for (const [rawKey, rawValue] of Object.entries(rawData)) {
    const lowerKey = rawKey.toLowerCase().trim();
    const mappedKey = SOCCERSTATS247_FIELD_MAP[lowerKey];
    if (!mappedKey) {
      if (rawKey !== "error" && rawKey !== "source_url") {
        warnings.push(`Unbekanntes Feld ignoriert: "${rawKey}"`);
      }
      continue;
    }
    if (mappedKey.startsWith("additional_stats.")) {
      const subKey = mappedKey.replace("additional_stats.", "");
      normalized.additional_stats[subKey] = parseNumber(rawValue) ?? rawValue;
    } else {
      normalized[mappedKey] = NUMERIC_FIELDS.includes(mappedKey)
        ? (parseNumber(rawValue) ?? 0)
        : String(rawValue ?? "").trim();
    }
  }

  if (normalized.season) normalized.season = normalizeSeason(normalized.season);
  Object.assign(normalized, computeDerivedMetrics(normalized));
  if (Object.keys(normalized.additional_stats).length === 0) delete normalized.additional_stats;

  return { normalized, warnings };
};

/**
 * Validiert normalisierte Daten.
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export const validatePlayerStats = (normalized) => {
  const errors = [];
  const warnings = [];
  if (!normalized.player_name_external) errors.push("Spielername fehlt");
  if (!normalized.season) errors.push("Saison fehlt");
  if (!normalized.competition) errors.push("Wettbewerb/Liga fehlt");
  if (normalized.minutes_played > 5400) warnings.push(`Unrealistische Spielminuten: ${normalized.minutes_played}`);
  if (normalized.goals > normalized.appearances) warnings.push("Mehr Tore als Einsätze – prüfen");
  if (normalized.starts > normalized.appearances) warnings.push("Mehr Starts als Einsätze – prüfen");
  return { valid: errors.length === 0, errors, warnings };
};