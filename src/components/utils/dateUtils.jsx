import { format as dateFnsFormat } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { de } from "date-fns/locale";

const TIMEZONE = "Europe/Berlin";

/**
 * Formatiert ein Datum in deutscher Zeitzone
 * @param {Date|string} date - Das zu formatierende Datum
 * @param {string} formatStr - Das Format (date-fns Format-String)
 * @returns {string} - Das formatierte Datum in deutscher Zeit
 */
export const formatInGermanTime = (date, formatStr = "dd.MM.yyyy HH:mm") => {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const zonedDate = utcToZonedTime(dateObj, TIMEZONE);
  return dateFnsFormat(zonedDate, formatStr, { locale: de });
};

/**
 * Gibt das aktuelle Datum in deutscher Zeitzone zurück
 * @returns {Date} - Aktuelles Datum in deutscher Zeitzone
 */
export const getCurrentGermanTime = () => {
  return utcToZonedTime(new Date(), TIMEZONE);
};