import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, DoorOpen, Target, UserX, Users as UsersIcon, Building2, ArrowRight, Inbox } from "lucide-react";
import { format, differenceInYears, differenceInMonths } from "date-fns";

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  return differenceInYears(new Date(), new Date(dateOfBirth));
};

const isContractExpiringSoon = (contractUntil) => {
  if (!contractUntil) return false;
  const months = differenceInMonths(new Date(contractUntil), new Date());
  return months >= 0 && months <= 6;
};

const categoryColors = {
  "Wintertransferperiode": "bg-blue-100 text-blue-800 border-blue-200",
  "Sommertransferperiode": "bg-orange-100 text-orange-800 border-orange-200",
  "Zukunft": "bg-purple-100 text-purple-800 border-purple-200",
  "Beobachtungsliste": "bg-slate-100 text-slate-800 border-slate-200",
  "Top-Priorität": "bg-red-100 text-red-800 border-red-200",
  "Vertragsende": "bg-green-100 text-green-800 border-green-200",
};

const categoryAccentColors = {
  "Wintertransferperiode": "#3b82f6",
  "Sommertransferperiode": "#f97316",
  "Zukunft": "#a855f7",
  "Beobachtungsliste": "#94a3b8",
  "Top-Priorität": "#ef4444",
  "Vertragsende": "#22c55e",
};

const getTypeInfo = (player) => {
  if (player.player_type === 'transfer_list') return { label: "Abgangsliste", view: "transfer_list", icon: DoorOpen, cls: "bg-orange-100 text-orange-700 border-orange-300" };
  if (player.player_type === 'acquisition' || player.is_acquisition_target) return { label: "Akquise", view: "acquisition", icon: Target, cls: "bg-purple-100 text-purple-700 border-purple-300" };
  if (player.player_type === 'free_agent') return { label: "Vereinslos", view: "free_agent", icon: UserX, cls: "bg-teal-100 text-teal-700 border-teal-300" };
  return { label: "Standard", view: "players", icon: UsersIcon, cls: "bg-blue-100 text-blue-700 border-blue-300" };
};

export default function GlobalPlayerSearchResults({ players, searchTerm, onOpenPlayer, onJumpToCategory }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-slate-400" />
            Suchergebnisse für „{searchTerm}"
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {players.length} {players.length === 1 ? "Spieler" : "Spieler"} in allen Kategorien gefunden
          </p>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Keine Spieler gefunden</p>
          <p className="text-slate-400 text-sm mt-1">Versuche es mit einem anderen Namen oder Verein.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {players.map(player => {
            const typeInfo = getTypeInfo(player);
            const TypeIcon = typeInfo.icon;
            return (
              <Card
                key={player.id}
                className="hover:shadow-xl transition-all duration-200 bg-white dark:bg-slate-900 relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer group"
                onClick={() => onOpenPlayer(player.id)}
              >
                <div className="h-1 w-full" style={{ backgroundColor: categoryAccentColors[player.category] || '#e2e8f0' }} />
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="pr-2">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{player.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      {player.current_club || <span className="italic">Kein Verein</span>}
                      {player.transfermarkt_url && (
                        <a href={player.transfermarkt_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-blue-600 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onJumpToCategory(typeInfo.view); }}
                      title={`Zur Kategorie ${typeInfo.label} wechseln`}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${typeInfo.cls} hover:opacity-80 transition-opacity`}
                    >
                      <TypeIcon className="w-3 h-3" />
                      {typeInfo.label}
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                    {Array.isArray(player.club_placements) && player.club_placements.length > 0 && (
                      <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> Platziert bei {player.club_placements[player.club_placements.length - 1].club_name}
                      </Badge>
                    )}
                    {player.category && (
                      <Badge variant="secondary" className={categoryColors[player.category] + " border text-xs"}>{player.category}</Badge>
                    )}
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800 font-semibold text-xs">{player.position}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 pb-3 px-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-slate-100 dark:border-slate-800 pt-2.5">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Alter</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{calculateAge(player.date_of_birth) || '–'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Nationalität</span>
                      <span className="font-semibold text-slate-800 dark:text-white truncate">{player.nationality || '–'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Marktwert</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{player.market_value ? `${(player.market_value / 1000000).toFixed(1).replace(/\.0$/, '')}M €` : '–'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Vertrag bis</span>
                      <span className={`font-semibold ${isContractExpiringSoon(player.contract_until) ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>
                        {player.contract_until ? format(new Date(player.contract_until), "MM/yyyy") : '–'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}