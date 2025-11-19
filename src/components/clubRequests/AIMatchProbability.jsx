import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function AIMatchProbability({ requestData }) {
  const [probability, setProbability] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  useEffect(() => {
    if (requestData.position_needed && players.length > 0) {
      calculateProbability();
    }
  }, [requestData.position_needed, requestData.budget_max, requestData.age_min, requestData.age_max, players]);

  const calculateProbability = async () => {
    setLoading(true);
    try {
      // Einfache Matching-Logik
      const matchingPlayers = players.filter(player => {
        const positionMatch = player.position === requestData.position_needed || 
                             (player.secondary_positions || []).includes(requestData.position_needed);
        const ageMatch = (!requestData.age_min || player.age >= requestData.age_min) &&
                        (!requestData.age_max || player.age <= requestData.age_max);
        const budgetMatch = !requestData.budget_max || !player.market_value || 
                           player.market_value <= requestData.budget_max;
        
        return positionMatch && ageMatch && budgetMatch;
      });

      const matchCount = matchingPlayers.length;
      const totalPlayers = players.filter(p => 
        p.position === requestData.position_needed || 
        (p.secondary_positions || []).includes(requestData.position_needed)
      ).length;

      // KI-Analyse für qualitative Einschätzung
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Bewerte die Match-Wahrscheinlichkeit für diese Vereinsanfrage:

Position: ${requestData.position_needed}
Budget: ${requestData.budget_max ? `${(requestData.budget_max / 1000000).toFixed(2)}M €` : 'unbegrenzt'}
Alter: ${requestData.age_min || 'beliebig'} - ${requestData.age_max || 'beliebig'} Jahre
Liga: ${requestData.league || 'unbekannt'}
Land: ${requestData.country || 'unbekannt'}

Anzahl passender Spieler in Datenbank: ${matchCount}
Gesamtzahl Spieler auf dieser Position: ${totalPlayers}

Gib eine Einschätzung:
- Wahrscheinlichkeit eines erfolgreichen Matches (0-100)
- Kurze Bewertung der Anfrage
- Empfehlungen zur Verbesserung der Erfolgschancen`,
        response_json_schema: {
          type: "object",
          properties: {
            probability: { type: "number" },
            assessment: { type: "string" },
            recommendations: { type: "string" },
            matching_players_count: { type: "number" }
          }
        }
      });

      setProbability({
        ...result,
        matching_players_count: matchCount
      });
    } catch (error) {
      console.error("Fehler bei Wahrscheinlichkeitsberechnung:", error);
      // Fallback zu einfacher Berechnung
      const matchingPlayers = players.filter(player => {
        const positionMatch = player.position === requestData.position_needed;
        return positionMatch;
      });
      
      setProbability({
        probability: Math.min(100, (matchingPlayers.length / players.length) * 100 * 5),
        assessment: "Automatische Einschätzung basierend auf Datenbankabgleich",
        matching_players_count: matchingPlayers.length,
        recommendations: "Erweitern Sie die Suchkriterien für mehr Matches"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!requestData.position_needed) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader className="border-b border-purple-100 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <CardTitle className="text-base">KI-Match-Wahrscheinlichkeit</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        ) : probability ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-semibold text-slate-700">Match-Chance</span>
              </div>
              <Badge 
                variant="secondary" 
                className={`text-lg font-bold ${
                  probability.probability >= 70 ? 'bg-green-100 text-green-800 border-green-200' :
                  probability.probability >= 40 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-red-100 text-red-800 border-red-200'
                }`}
              >
                {Math.round(probability.probability)}%
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Users className="w-4 h-4 text-purple-600" />
              <span>{probability.matching_players_count} passende Spieler in Datenbank</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-purple-100">
              <p className="text-sm text-slate-700 mb-2">{probability.assessment}</p>
              {probability.recommendations && (
                <p className="text-xs text-slate-600 italic mt-2 pt-2 border-t border-slate-100">
                  💡 {probability.recommendations}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}