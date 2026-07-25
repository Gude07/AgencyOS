import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, Search, ChevronDown, ChevronRight, Star, User, MessageCircle, Inbox, Layers, Expand, Shrink } from "lucide-react";

const priorityDotColors = {
  dringend: "bg-red-500",
  hoch: "bg-orange-500",
  mittel: "bg-yellow-500",
  niedrig: "bg-emerald-500",
};

const priorityBadgeColors = {
  dringend: "bg-red-100 text-red-800 border-red-200",
  hoch: "bg-orange-100 text-orange-800 border-orange-200",
  mittel: "bg-yellow-100 text-yellow-800 border-yellow-200",
  niedrig: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const statusBadgeColors = {
  offen: "bg-slate-100 text-slate-800 border-slate-200",
  in_bearbeitung: "bg-blue-100 text-blue-800 border-blue-200",
  angebote_gesendet: "bg-purple-100 text-purple-800 border-purple-200",
  abgeschlossen: "bg-green-100 text-green-800 border-green-200",
  abgelehnt: "bg-red-100 text-red-800 border-red-200",
};

export default function ClubRequestGroupedView({
  requests,
  allCommunications = [],
  users = [],
  userFavorites = [],
  onOpenRequest,
}) {
  const [clubSearch, setClubSearch] = useState("");
  const [expandedClubs, setExpandedClubs] = useState(() => new Set());

  const grouped = useMemo(() => {
    const map = new Map();
    requests.forEach(r => {
      const key = (r.club_name || "Unbekannt").toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          displayName: r.club_name || "Unbekannt",
          league: r.league,
          country: r.country,
          requests: [],
        });
      }
      map.get(key).requests.push(r);
      const entry = map.get(key);
      if (!entry.league && r.league) entry.league = r.league;
      if (!entry.country && r.country) entry.country = r.country;
    });
    let groups = Array.from(map.values());
    if (clubSearch) {
      groups = groups.filter(g => g.displayName.toLowerCase().includes(clubSearch.toLowerCase()));
    }
    groups.sort((a, b) => b.requests.length - a.requests.length || a.displayName.localeCompare(b.displayName));
    return groups;
  }, [requests, clubSearch]);

  const toggleClub = (name) => {
    setExpandedClubs(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const allExpanded = grouped.length > 0 && grouped.every(g => expandedClubs.has(g.displayName));
  const expandAll = () => setExpandedClubs(new Set(grouped.map(g => g.displayName)));
  const collapseAll = () => setExpandedClubs(new Set());

  return (
    <div className="space-y-4">
      {/* Info-Banner: nichts geht verloren */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-sm">
        <Layers className="w-4 h-4 flex-shrink-0" />
        <span>
          {grouped.length} {grouped.length === 1 ? "Verein" : "Vereine"} • <strong>{requests.length} Anfragen insgesamt</strong> –
          klicke auf einen Verein, um seine Anfragen aufzuklappen. Nichts ist verloren.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Verein suchen…"
            value={clubSearch}
            onChange={(e) => setClubSearch(e.target.value)}
            className="pl-9 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {allExpanded ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
            {allExpanded ? "Alle zuklappen" : "Alle aufklappen"}
          </button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Keine Vereine gefunden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(group => {
            const reqs = group.requests;
            const isOpen = expandedClubs.has(group.displayName);
            const prioCounts = { dringend: 0, hoch: 0, mittel: 0, niedrig: 0 };
            reqs.forEach(r => { if (prioCounts[r.priority] !== undefined) prioCounts[r.priority]++; });
            const openCount = reqs.filter(r => r.status === "offen").length;
            const favCount = reqs.filter(r => userFavorites.includes(r.id)).length;
            const commCount = reqs.reduce((sum, r) => sum + allCommunications.filter(c => c.club_request_id === r.id).length, 0);

            return (
              <div
                key={group.displayName}
                className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900"
              >
                {/* Vereins-Kopf – klickbar zum Aufklappen */}
                <button
                  onClick={() => toggleClub(group.displayName)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    <Building2 className="w-5 h-5 text-blue-900 dark:text-blue-400 flex-shrink-0" />
                    <span className="font-bold text-slate-900 dark:text-white truncate">{group.displayName}</span>
                    {(group.league || group.country) && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                        {[group.league, group.country].filter(Boolean).join(" • ")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border border-blue-200 text-xs">
                      {reqs.length} Anfragen
                    </Badge>
                    {openCount > 0 && (
                      <Badge variant="outline" className="border-slate-200 text-slate-700 dark:text-slate-300 text-xs">
                        {openCount} offen
                      </Badge>
                    )}
                    {favCount > 0 && (
                      <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-800 text-xs">
                        <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" /> {favCount}
                      </Badge>
                    )}
                    {/* Prioritäts-Punkte */}
                    <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-100 dark:border-slate-800">
                      {["dringend", "hoch", "mittel", "niedrig"].map(p => (
                        prioCounts[p] > 0 && (
                          <div key={p} className="flex items-center gap-1" title={`${prioCounts[p]}x ${p}`}>
                            <span className={`w-2 h-2 rounded-full ${priorityDotColors[p]}`} />
                            <span className="text-xs text-slate-600 dark:text-slate-400">{prioCounts[p]}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </button>

                {/* Aufgeklappt: alle Anfragen dieses Vereins sichtbar */}
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {reqs.map(request => {
                      const commCount = allCommunications.filter(c => c.club_request_id === request.id).length;
                      const isFav = userFavorites.includes(request.id);
                      const assignees = (request.assigned_to || []).map(email => {
                        const u = users.find(x => x.email === email);
                        return u ? u.full_name : email.split("@")[0];
                      });

                      return (
                        <div
                          key={request.id}
                          onClick={() => onOpenRequest(request)}
                          className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className={`text-xs border ${priorityBadgeColors[request.priority] || ""}`}>
                                {request.priority}
                              </Badge>
                              <Badge variant="secondary" className={`text-xs border ${statusBadgeColors[request.status] || ""}`}>
                                {request.status.replace(/_/g, " ")}
                              </Badge>
                              <span className="font-semibold text-slate-900 dark:text-white text-sm">{request.position_needed}</span>
                              {request.transfer_period && (
                                <Badge variant="outline" className="text-xs">{request.transfer_period}</Badge>
                              )}
                              {request.transfer_types && request.transfer_types.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {request.transfer_types.map(t => (
                                    <Badge key={t} variant="outline" className="border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300 text-xs">
                                      {t === "kauf" ? "Kauf" : t === "ablösefrei" ? "Ablösefrei" : t === "leihe" ? "Leihe" : "Leihe+Kauf"}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              {isFav && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
                              {commCount > 0 && (
                                <span className="flex items-center gap-0.5 text-red-600">
                                  <MessageCircle className="w-3 h-3" /> {commCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                            <span>Budget: {request.budget_min ? `${(request.budget_min/1000000).toFixed(1).replace(/\.0$/,"")}M` : "?"}–{request.budget_max ? `${(request.budget_max/1000000).toFixed(1).replace(/\.0$/,"")}M €` : "?"}</span>
                            <span>Alter: {request.age_min || "?"}–{request.age_max || "?"}</span>
                            <span>Gehalt: {request.salary_min ? `${request.salary_min.toLocaleString("de-DE")}€` : "?"}–{request.salary_max ? `${request.salary_max.toLocaleString("de-DE")}€` : "?"}</span>
                          </div>
                          {(request.contact_person || assignees.length > 0) && (
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                              {request.contact_person && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" /> {request.contact_person}
                                  {request.contact_email && <span className="hidden sm:inline"> · {request.contact_email}</span>}
                                </span>
                              )}
                              {assignees.length > 0 && (
                                <span>Zuständig: {assignees.slice(0, 2).join(", ")}{assignees.length > 2 && ` +${assignees.length - 2}`}</span>
                              )}
                            </div>
                          )}
                          {request.requirements && (
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{request.requirements}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}