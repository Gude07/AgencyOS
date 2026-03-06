import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, Loader2 } from "lucide-react";

const recommendationConfig = {
  sehr_empfehlenswert: { label: "Sehr empfehlenswert", color: "bg-green-100 text-green-800 border-green-300", icon: "⭐⭐⭐" },
  empfehlenswert: { label: "Empfehlenswert", color: "bg-blue-100 text-blue-800 border-blue-300", icon: "⭐⭐" },
  bedingt_empfehlenswert: { label: "Bedingt empfehlenswert", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "⭐" },
  nicht_empfehlenswert: { label: "Nicht empfehlenswert", color: "bg-red-100 text-red-800 border-red-300", icon: "❌" },
};

export default function AIMatchingAnalysis({ request, matchingPlayers }) {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = async () => {
    setIsLoading(true);

    // Take top 20 matching players for the prompt (avoid too large input)
    const topPlayers = matchingPlayers.slice(0, 20).map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      secondary_positions: p.secondary_positions || [],
      age: p.age || (p.date_of_birth ? Math.floor((new Date() - new Date(p.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : null),
      nationality: p.nationality,
      current_club: p.current_club,
      market_value: p.market_value,
      contract_until: p.contract_until,
      matchScore: p.matchScore,
      current_form: p.current_form,
      strengths: p.strengths,
      speed_rating: p.speed_rating,
      strength_rating: p.strength_rating,
      stamina_rating: p.stamina_rating,
      agility_rating: p.agility_rating,
      personality_traits: p.personality_traits || [],
      category: p.category,
      status: p.status,
    }));

    const prompt = `Du bist ein erfahrener Fußball-Transferberater einer Spieleragentur. Analysiere folgende Vereinsanfrage und erstelle eine KI-basierte Empfehlungsliste.

VEREINSANFRAGE:
- Verein: ${request.club_name}
- Liga: ${request.league || "unbekannt"}
- Land: ${request.country || "unbekannt"}
- Gesuchte Position: ${request.position_needed}
- Transferart: ${(request.transfer_types || []).join(", ")}
- Budget (Kauf): ${request.budget_min ? `${(request.budget_min/1000000).toFixed(1)}M` : "?"} - ${request.budget_max ? `${(request.budget_max/1000000).toFixed(1)}M €` : "?"}
- Leihgebühr Budget: ${request.loan_fee_budget ? `${(request.loan_fee_budget/1000).toFixed(0)}k €` : "keine Angabe"}
- Alter: ${request.age_min || "?"} - ${request.age_max || "?"} Jahre
- Gehalt (${request.salary_period || "jährlich"}): ${request.salary_min ? `${(request.salary_min/1000).toFixed(0)}k` : "?"} - ${request.salary_max ? `${(request.salary_max/1000).toFixed(0)}k €` : "?"}
- Transferperiode: ${request.transfer_period || "unbekannt"}
- Anforderungen: ${request.requirements || "keine spezifischen Anforderungen"}

VERFÜGBARE SPIELER (bereits nach regelbasiertem Score vorsortiert):
${JSON.stringify(topPlayers, null, 2)}

Erstelle eine detaillierte Analyse mit:
1. Den TOP 5 empfohlenen Spielern (aus der Liste oben) mit Begründung
2. Einer Gesamteinschätzung der Anfrage
3. Wichtigen Hinweisen für den Transferberater

Antworte ausschließlich im vorgegebenen JSON-Schema.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_assessment: { type: "string", description: "Gesamteinschätzung der Anfrage und des Spielermarkts dafür (2-3 Sätze)" },
          market_difficulty: { type: "string", enum: ["einfach", "mittel", "schwierig", "sehr_schwierig"] },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                player_id: { type: "string" },
                player_name: { type: "string" },
                recommendation: { type: "string", enum: ["sehr_empfehlenswert", "empfehlenswert", "bedingt_empfehlenswert", "nicht_empfehlenswert"] },
                ai_score: { type: "number", minimum: 0, maximum: 100 },
                reasoning: { type: "string", description: "Detaillierte Begründung (2-4 Sätze)" },
                strengths: { type: "array", items: { type: "string" }, description: "3-4 konkrete Stärken für diesen Transfer" },
                risks: { type: "array", items: { type: "string" }, description: "1-3 Risiken oder Bedenken" },
                transfer_tip: { type: "string", description: "Konkreter Tipp für den Transferberater" }
              }
            }
          },
          advisor_notes: { type: "array", items: { type: "string" }, description: "3-5 wichtige Hinweise für den Transferberater" }
        }
      }
    });

    setAnalysis(result);
    setIsLoading(false);
  };

  const difficultyConfig = {
    einfach: { label: "Einfach", color: "bg-green-100 text-green-800" },
    mittel: { label: "Mittel", color: "bg-yellow-100 text-yellow-800" },
    schwierig: { label: "Schwierig", color: "bg-orange-100 text-orange-800" },
    sehr_schwierig: { label: "Sehr schwierig", color: "bg-red-100 text-red-800" },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">KI-Matching Analyse</h3>
                <p className="text-sm text-slate-600">
                  {matchingPlayers.length} Spieler werden analysiert — KI bewertet Passung, Risiken und gibt Handlungsempfehlungen
                </p>
              </div>
            </div>
            <Button
              onClick={runAnalysis}
              disabled={isLoading || matchingPlayers.length === 0}
              className="bg-purple-700 hover:bg-purple-800 text-white shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analysiere...
                </>
              ) : analysis ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Neu analysieren
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  KI-Analyse starten
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-10 text-center">
            <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-700 font-medium">KI analysiert {Math.min(matchingPlayers.length, 20)} Spielerprofile...</p>
            <p className="text-sm text-slate-500 mt-1">Das dauert etwa 10–20 Sekunden</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {analysis && !isLoading && (
        <>
          {/* Overall Assessment */}
          <Card className="border-indigo-200 bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Gesamteinschätzung
                </CardTitle>
                {analysis.market_difficulty && (
                  <Badge className={`${difficultyConfig[analysis.market_difficulty]?.color} border-0`}>
                    Markt: {difficultyConfig[analysis.market_difficulty]?.label}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-slate-700 leading-relaxed">{analysis.overall_assessment}</p>
            </CardContent>
          </Card>

          {/* Top Recommendations */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              KI-Empfehlungen (Top {analysis.recommendations?.length})
            </h3>
            {analysis.recommendations?.map((rec, idx) => {
              const cfg = recommendationConfig[rec.recommendation] || recommendationConfig.empfehlenswert;
              return (
                <Card key={rec.player_id || idx} className="border-slate-200 bg-white overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      {/* Rank */}
                      <div className="w-12 bg-gradient-to-b from-slate-700 to-slate-800 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-lg">{idx + 1}</span>
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h4 className="font-bold text-slate-900">{rec.player_name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`${cfg.color} border text-xs`}>
                                {cfg.icon} {cfg.label}
                              </Badge>
                              <span className="text-xs text-slate-500">KI-Score: <strong className="text-purple-700">{rec.ai_score}%</strong></span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-3 leading-relaxed">{rec.reasoning}</p>
                        <div className="grid md:grid-cols-2 gap-3">
                          {rec.strengths?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Vorteile
                              </p>
                              <ul className="space-y-1">
                                {rec.strengths.map((s, i) => (
                                  <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                    <span className="text-green-500 mt-0.5">✓</span> {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {rec.risks?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Risiken
                              </p>
                              <ul className="space-y-1">
                                {rec.risks.map((r, i) => (
                                  <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                    <span className="text-red-400 mt-0.5">!</span> {r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        {rec.transfer_tip && (
                          <div className="mt-3 p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-xs text-purple-800 flex items-start gap-1.5">
                              <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span><strong>Tipp:</strong> {rec.transfer_tip}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Advisor Notes */}
          {analysis.advisor_notes?.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Hinweise für den Transferberater
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-2">
                  {analysis.advisor_notes.map((note, i) => (
                    <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                      <span className="font-bold mt-0.5">{i + 1}.</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!analysis && !isLoading && matchingPlayers.length === 0 && (
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-8 text-center">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Keine Spieler für die KI-Analyse verfügbar.</p>
            <p className="text-sm text-slate-500 mt-1">Stellen Sie sicher, dass passende Spieler für diese Position im System sind.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}