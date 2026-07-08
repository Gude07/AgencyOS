import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, DoorOpen, UserX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const categoryInfo = {
  transfer_list: { label: "Abgangsliste", icon: DoorOpen, color: "text-orange-700 bg-orange-50 border-orange-200" },
  acquisition: { label: "Akquise-Pipeline", icon: Target, color: "text-purple-700 bg-purple-50 border-purple-200" },
  free_agent: { label: "Vereinslos", icon: UserX, color: "text-teal-700 bg-teal-50 border-teal-200" },
};

export default function CrossCategoryMatchHint({ matches, onNavigateToCategory }) {
  const navigate = useNavigate();

  if (matches.length === 0) return null;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-4 space-y-2">
        <p className="text-sm font-semibold text-blue-900">
          Kein Treffer bei den Standard-Spielern – aber gefunden in anderer Kategorie:
        </p>
        {matches.map(player => {
          const type = player.player_type === 'acquisition' || player.is_acquisition_target ? 'acquisition' : player.player_type;
          const info = categoryInfo[type] || categoryInfo.acquisition;
          const Icon = info.icon;
          return (
            <button
              key={player.id}
              onClick={() => onNavigateToCategory(type)}
              className={`w-full flex items-center justify-between gap-2 p-2 rounded-lg border ${info.color} hover:opacity-80 transition-opacity text-left`}
            >
              <div>
                <span className="font-medium">{player.name}</span>
                <span className="text-xs ml-2">{player.current_club}</span>
              </div>
              <span className="text-xs font-semibold flex items-center gap-1">
                <Icon className="w-3.5 h-3.5" />
                {info.label}
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}