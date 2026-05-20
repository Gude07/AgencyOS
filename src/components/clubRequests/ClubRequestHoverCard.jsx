import React from "react";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Euro, Users, Calendar, AlertCircle } from "lucide-react";

const priorityColors = {
  niedrig: "bg-emerald-100 text-emerald-800 border-emerald-200",
  mittel: "bg-yellow-100 text-yellow-800 border-yellow-200",
  hoch: "bg-orange-100 text-orange-800 border-orange-200",
  dringend: "bg-red-100 text-red-800 border-red-200",
};

/**
 * Detailed popover content for a ClubRequest.
 * Used in PlayerDetail → Matches tab on hover.
 */
export default function ClubRequestHoverCard({ request }) {
  if (!request) return null;
  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-blue-900" />
          <span className="font-bold text-slate-900 dark:text-white text-sm">{request.club_name}</span>
        </div>
        {(request.league || request.country) && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3 h-3" />
            <span>{[request.league, request.country].filter(Boolean).join(" • ")}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline" className="text-xs border-blue-300 bg-blue-50 text-blue-900">
            {request.position_needed}
          </Badge>
          {request.priority && (
            <Badge variant="secondary" className={`text-xs border ${priorityColors[request.priority]}`}>
              {request.priority}
            </Badge>
          )}
          {request.transfer_period && (
            <Badge variant="outline" className="text-xs">
              📅 {request.transfer_period}
            </Badge>
          )}
        </div>
      </div>

      {/* Transfer-Typen */}
      {request.transfer_types?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Transfer-Art</p>
          <div className="flex flex-wrap gap-1">
            {request.transfer_types.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-blue-800">
                {t === 'kauf' ? '💰 Kauf' : t === 'ablösefrei' ? '🆓 Ablösefrei' : t === 'leihe' ? '🔄 Leihe' : '🔄💰 Leihe+Option'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Finanzen */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {(request.budget_min || request.budget_max) && (
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-slate-500 mb-0.5 flex items-center gap-1"><Euro className="w-3 h-3" />Budget Kauf</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {request.budget_min ? `${(request.budget_min / 1000000).toFixed(1)}M` : '?'} – {request.budget_max ? `${(request.budget_max / 1000000).toFixed(1)}M €` : '?'}
            </p>
          </div>
        )}
        {(request.salary_min || request.salary_max) && (
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-slate-500 mb-0.5">Gehalt ({request.salary_period || 'jährl.'})</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {request.salary_min ? `${Math.round(request.salary_min / 1000)}K` : '?'} – {request.salary_max ? `${Math.round(request.salary_max / 1000)}K €` : '?'}
            </p>
          </div>
        )}
        {(request.age_min || request.age_max) && (
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-slate-500 mb-0.5 flex items-center gap-1"><Users className="w-3 h-3" />Alter</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {request.age_min || '?'} – {request.age_max || '?'} J.
            </p>
          </div>
        )}
        {request.sought_foot && (
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-slate-500 mb-0.5">Gesuchter Fuß</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">🦶 {request.sought_foot}</p>
          </div>
        )}
      </div>

      {/* Anforderungen */}
      {request.requirements && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />Anforderungen
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4">
            {request.requirements}
          </p>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center pt-1 border-t border-slate-100 dark:border-slate-700">
        Hover-Vorschau • Klicken zum Öffnen
      </p>
    </div>
  );
}