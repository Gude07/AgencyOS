import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AIClubSuggestions({ player }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysiere dieses Spielerprofil und schlage 5 passende Vereine vor:

Spieler: ${player.name}
Position: ${player.position}
Nebenpositionen: ${(player.secondary_positions || []).join(", ")}
Alter: ${player.age}
Nationalität: ${player.nationality}
Aktueller Verein: ${player.current_club}
Marktwert: ${player.market_value ? `${(player.market_value / 1000000).toFixed(2)}M €` : 'unbekannt'}
Stärken: ${player.strengths || 'keine Angaben'}
Präferenzen: ${JSON.stringify(player.preferences || {})}

Berücksichtige:
- Die Position und Spielweise des Spielers
- Sein aktuelles Level und Marktwert
- Vereine, die diese Position suchen könnten
- Spielerpräferenzen (bevorzugte Länder/Ligen)
- Realistische Wechselmöglichkeiten

Gib eine Liste von 5 Vereinen mit jeweils:
- Vereinsname
- Liga und Land
- Warum dieser Verein passt (kurze Begründung)
- Geschätztes Budget (in Millionen Euro)
- Match-Score (0-100)`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  club_name: { type: "string" },
                  league: { type: "string" },
                  country: { type: "string" },
                  reasoning: { type: "string" },
                  estimated_budget: { type: "number" },
                  match_score: { type: "number" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error("Fehler beim Generieren von Vorschlägen:", error);
    } finally {
      setLoading(false);
    }
  };

  const createRequestFromSuggestion = (suggestion) => {
    navigate(createPageUrl("ClubRequests") + "?prefill=" + encodeURIComponent(JSON.stringify({
      club_name: suggestion.club_name,
      league: suggestion.league,
      country: suggestion.country,
      position_needed: player.position,
      budget_max: suggestion.estimated_budget * 1000000,
      age_min: player.age - 3,
      age_max: player.age + 3,
      requirements: suggestion.reasoning
    })));
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg">KI-Vereinsvorschläge</CardTitle>
          </div>
          <Button
            onClick={generateSuggestions}
            disabled={loading}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analysiere...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Vorschläge generieren
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm">
              Lasse die KI passende Vereine für diesen Spieler vorschlagen
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{suggestion.club_name}</h4>
                    <p className="text-sm text-slate-600">{suggestion.league} • {suggestion.country}</p>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                    {suggestion.match_score}% Match
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 mb-3">{suggestion.reasoning}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Budget: ~{suggestion.estimated_budget.toFixed(1)}M €
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createRequestFromSuggestion(suggestion)}
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  >
                    Anfrage erstellen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}