import React from "react";
import { Badge } from "@/components/ui/badge";
import { format, differenceInYears } from "date-fns";

/**
 * Detailed popover content for a Player.
 * Used in ClubRequestDetail → Matches tab on hover.
 */
export default function PlayerHoverCard({ player }) {
  if (!player) return null;

  const age = player.date_of_birth
    ? differenceInYears(new Date(), new Date(player.date_of_birth))
    : player.age;

  const categoryColors = {
    "Wintertransferperiode": "bg-blue-100 text-blue-800 border-blue-200",
    "Sommertransferperiode": "bg-orange-100 text-orange-800 border-orange-200",
    "Zukunft": "bg-purple-100 text-purple-800 border-purple-200",
    "Beobachtungsliste": "bg-slate-100 text-slate-800 border-slate-200",
    "Top-Priorität": "bg-red-100 text-red-800 border-red-200",
    "Vertragsende": "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{player.name}</h4>
        {player.current_club && (
          <p className="text-xs text-slate-500">{player.current_club}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline" className="text-xs border-blue-300 bg-blue-50 text-blue-900">{player.position}</Badge>
          {player.secondary_positions?.slice(0, 2).map(pos => (
            <Badge key={pos} variant="outline" className="text-xs border-slate-200">{pos}</Badge>
          ))}
          {player.category && (
            <Badge variant="secondary" className={`text-xs border ${categoryColors[player.category] || ''}`}>
              {player.category}
            </Badge>
          )}
        </div>
      </div>

      {/* Daten */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {age && (
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-slate-500 mb-0.5">Alter</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{age} J.</p>
          </div>
        )}
        {player.nationality && (
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-slate-500 mb-0.5">Nationalität</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{player.nationality}</p>
          </div>
        )}
        {player.market_value && (
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-slate-500 mb-0.5">Marktwert</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {(player.market_value / 1000000).toFixed(1)}M €
            </p>
          </div>
        )}
        {player.contract_until && (
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-slate-500 mb-0.5">Vertrag bis</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {format(new Date(player.contract_until), "MM/yyyy")}
            </p>
          </div>
        )}
        {player.foot && (
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-slate-500 mb-0.5">Fuß</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">🦶 {player.foot}</p>
          </div>
        )}
        {player.height && (
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-slate-500 mb-0.5">Größe</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{player.height} cm</p>
          </div>
        )}
      </div>

      {/* Physische Attribute */}
      {(player.speed_rating || player.strength_rating || player.stamina_rating || player.agility_rating) && (
        <div className="flex flex-wrap gap-1">
          {player.speed_rating > 0 && <span className="text-xs px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-amber-800">⚡ {player.speed_rating}/10</span>}
          {player.strength_rating > 0 && <span className="text-xs px-2 py-0.5 bg-red-50 border border-red-200 rounded-full text-red-800">💪 {player.strength_rating}/10</span>}
          {player.stamina_rating > 0 && <span className="text-xs px-2 py-0.5 bg-green-50 border border-green-200 rounded-full text-green-800">🏃 {player.stamina_rating}/10</span>}
          {player.agility_rating > 0 && <span className="text-xs px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-full text-purple-800">🤸 {player.agility_rating}/10</span>}
        </div>
      )}

      {/* Stärken */}
      {player.strengths && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Stärken</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
            {player.strengths}
          </p>
        </div>
      )}

      {/* Notizen */}
      {player.notes && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notizen</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
            {player.notes}
          </p>
        </div>
      )}

      {/* Persönlichkeit */}
      {player.personality_traits?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {player.personality_traits.slice(0, 4).map(trait => (
            <span key={trait} className="text-xs px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700">
              👤 {trait}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center pt-1 border-t border-slate-100 dark:border-slate-700">
        Hover-Vorschau • Klicken zum Öffnen
      </p>
    </div>
  );
}