import { base44 } from "@/api/base44Client";

export function normalizeClub(name) {
  return (name || "").trim().toLowerCase();
}

// Den aktuell bekannten Transfermarkt-Link für einen Verein ermitteln.
// Priorität: Vereinsprofil > Vereinsnetzwerk > jüngste vorhandene Vereinsanfrage.
export function findTransfermarktUrlForClub(clubName, profiles, requests, networks) {
  const norm = normalizeClub(clubName);
  if (!norm) return "";

  const profilesList = profiles || [];
  const requestsList = requests || [];
  const networksList = networks || [];

  const profileMatch = profilesList.find(
    p => normalizeClub(p.club_name) === norm && p.transfermarkt_url
  );
  if (profileMatch?.transfermarkt_url) return profileMatch.transfermarkt_url;

  const networkMatch = networksList.find(
    n => normalizeClub(n.club_name) === norm && n.transfermarkt_url
  );
  if (networkMatch?.transfermarkt_url) return networkMatch.transfermarkt_url;

  const reqMatch = requestsList
    .filter(r => normalizeClub(r.club_name) === norm && r.transfermarkt_url)
    .sort(
      (a, b) =>
        new Date(b.updated_date || b.created_date || 0) -
        new Date(a.updated_date || a.created_date || 0)
    )[0];
  return reqMatch?.transfermarkt_url || "";
}

// Einen Transfermarkt-Link an ALLE bestehenden Datensätze (Vereinsprofile,
// Vereinsanfragen, Vereinsnetzwerk) desselben Vereins weitergeben. Wenn skipId
// angegeben ist, wird dieser Datensatz ausgelassen (z. B. der gerade
// gespeicherte Datensatz selbst).
export async function propagateTransfermarktUrl(clubName, url, { profiles = [], requests = [], networks = [], skipIds = [] } = {}) {
  const norm = normalizeClub(clubName);
  if (!norm || !url) return { updated: 0 };
  const skip = new Set(skipIds.map(String));

  const tasks = [];

  const profileIds = profiles
    .filter(p => normalizeClub(p.club_name) === norm && p.transfermarkt_url !== url && !skip.has(String(p.id)))
    .map(p => p.id);
  if (profileIds.length) {
    tasks.push(base44.entities.ClubProfile.bulkUpdate(profileIds.map(id => ({ id, transfermarkt_url: url }))));
  }

  const requestIds = requests
    .filter(r => normalizeClub(r.club_name) === norm && r.transfermarkt_url !== url && !skip.has(String(r.id)))
    .map(r => r.id);
  if (requestIds.length) {
    tasks.push(base44.entities.ClubRequest.bulkUpdate(requestIds.map(id => ({ id, transfermarkt_url: url }))));
  }

  const networkIds = networks
    .filter(n => normalizeClub(n.club_name) === norm && n.transfermarkt_url !== url && !skip.has(String(n.id)))
    .map(n => n.id);
  if (networkIds.length) {
    tasks.push(base44.entities.ClubNetwork.bulkUpdate(networkIds.map(id => ({ id, transfermarkt_url: url }))));
  }

  const results = await Promise.allSettled(tasks);
  const updated = results.filter(r => r.status === "fulfilled").length;
  return { updated };
}