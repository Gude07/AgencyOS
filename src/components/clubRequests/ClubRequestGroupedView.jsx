import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Building2, Search, ChevronRight, Star, User, MessageCircle, Inbox, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [selectedClub, setSelectedClub] = useState(null);

  // Gruppierung nach Vereinsname (case-insensitive)
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
      // Fülle Liga/Land nach, falls leer
      const entry = map.get(key);
      if (!entry.league && r.league) entry.league = r.league;
      if (!entry.country && r.country) entry.country = r.country;
    });
    let groups = Array.from(map.values());
    if (clubSearch) {
      groups = groups.filter(g => g.displayName.toLowerCase().includes(clubSearch.toLowerCase()));
    }
    // Sortieren: meiste Anfragen zuerst, dann alphabetisch
    groups.sort((a, b) => b.requests.length - a.requests.length || a.displayName.localeCompare(b.displayName));
    return groups;
  }, [requests, clubSearch]);

  return (
    <div className="space-y-4">
      {/* Quick-Suche für Vereine */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          placeholder="Verein suchen…"
          value={clubSearch}
          onChange={(e) => setClubSearch(e.target.value)}
          className="pl-9 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        {grouped.length} {grouped.length === 1 ? "Verein" : "Vereine"} • {requests.length} Anfragen insgesamt
      </p>

      {grouped.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Keine Vereine gefunden</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {grouped.map(group => {
              const reqs = group.requests;
              const prioCounts = { dringend: 0, hoch: 0, mittel: 0, niedrig: 0 };
              reqs.forEach(r => { if (prioCounts[r.priority] !== undefined) prioCounts[r.priority]++; });
              const openCount = reqs.filter(r => r.status === "offen").length;
              const favCount = reqs.filter(r => userFavorites.includes(r.id)).length;
              const commCount = reqs.reduce((sum, r) => sum + allCommunications.filter(c => c.club_request_id === r.id).length, 0);

              return (
                <motion.div
                  key={group.displayName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card
                    className="hover:shadow-md transition-all cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    onClick={() => setSelectedClub(group)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-5 h-5 text-blue-900 dark:text-blue-400 flex-shrink-0" />
                          <h3 className="font-bold text-slate-900 dark:text-white truncate">{group.displayName}</h3>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      </div>
                      {(group.league || group.country) && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {[group.league, group.country].filter(Boolean).join(" • ")}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border border-blue-200 text-xs">
                          <Layers className="w-3 h-3 mr-1" /> {reqs.length} Anfragen
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
                        {commCount > 0 && (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 text-xs">
                            <MessageCircle className="w-3 h-3 mr-1" /> {commCount}
                          </Badge>
                        )}
                      </div>

                      {/* Prioritäts-Indikatoren */}
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {["dringend", "hoch", "mittel", "niedrig"].map(p => (
                          prioCounts[p] > 0 && (
                            <div key={p} className="flex items-center gap-1" title={`${prioCounts[p]}x ${p}`}>
                              <span className={`w-2 h-2 rounded-full ${priorityDotColors[p]}`} />
                              <span className="text-xs text-slate-600 dark:text-slate-400">{prioCounts[p]}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Sheet mit den Anfragen des gewählten Vereins */}
      <Sheet open={!!selectedClub} onOpenChange={() => setSelectedClub(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0 dark:bg-slate-900">
          {selectedClub && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                <SheetTitle className="flex items-center gap-2 text-xl">
                  <Building2 className="w-5 h-5 text-blue-900 dark:text-blue-400" />
                  {selectedClub.displayName}
                </SheetTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedClub.requests.length} Anfragen
                  {[selectedClub.league, selectedClub.country].filter(Boolean).length > 0 && (
                    <> • {[selectedClub.league, selectedClub.country].filter(Boolean).join(" • ")}</>
                  )}
                </p>
              </SheetHeader>
              <div className="p-4 space-y-3">
                {selectedClub.requests.map(request => {
                  const commCount = allCommunications.filter(c => c.club_request_id === request.id).length;
                  const isFav = userFavorites.includes(request.id);
                  return (
                    <Card
                      key={request.id}
                      className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      onClick={() => onOpenRequest(request)}
                    >
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className={`text-xs border ${priorityBadgeColors[request.priority] || ""}`}>
                            {request.priority}
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            {isFav && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
                            {commCount > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-red-600">
                                <MessageCircle className="w-3 h-3" /> {commCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className={`text-xs border ${statusBadgeColors[request.status] || ""}`}>
                          {request.status.replace(/_/g, " ")}
                        </Badge>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Gesuchte Position</p>
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">{request.position_needed}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Budget:</span>{" "}
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {request.budget_min ? `${(request.budget_min / 1000000).toFixed(1).replace(/\.0$/, "")}M` : "?"} – {request.budget_max ? `${(request.budget_max / 1000000).toFixed(1).replace(/\.0$/, "")}M €` : "?"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Alter:</span>{" "}
                            <span className="font-medium text-slate-800 dark:text-slate-200">{request.age_min || "?"} – {request.age_max || "?"}</span>
                          </div>
                        </div>
                        {request.transfer_period && (
                          <Badge variant="outline" className="text-xs">{request.transfer_period}</Badge>
                        )}
                        {request.contact_person && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <User className="w-3 h-3" /> {request.contact_person}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}