import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { saveAnalysisDocument, buildPlayerAnalysisHtml } from "@/utils/saveAnalysisDocument";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Loader2, TrendingUp, AlertTriangle, CheckCircle2, Target, Lightbulb } from "lucide-react";
import AnalysisDocumentSaver from "../analysis/AnalysisDocumentSaver";

export default function PlayerAIAnalysis({ playerId, playerName }) {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('analyzePlayer', { player_id: playerId });
      const analysisData = result.data.analysis;
      setAnalysis(analysisData);
      // Auto-save as document on player
      try {
        await saveAnalysisDocument({
          title: `KI-Analyse ${playerName} ${new Date().toLocaleDateString('de-DE')}`,
          analysisType: 'KI-Spieleranalyse',
          entityType: 'Player',
          entityId: playerId,
          htmlBody: buildPlayerAnalysisHtml(analysisData, playerName)
        });
      } catch (e) {
        console.warn('Auto-save document failed:', e);
      }
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const trendColors = {
    steigend: "bg-green-100 text-green-800",
    stabil: "bg-blue-100 text-blue-800",
    fallend: "bg-red-100 text-red-800"
  };

  const timingColors = {
    sofort: "bg-red-100 text-red-800",
    winter_2025_26: "bg-blue-100 text-blue-800",
    sommer_2026: "bg-orange-100 text-orange-800",
    später: "bg-slate-100 text-slate-800"
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
                <h3 className="font-bold text-slate-900">KI-Spieleranalyse</h3>
                <p className="text-sm text-slate-600">
                  Umfassende Bewertung basierend auf allen verfügbaren Daten: Karrierestatistiken, Scouting-Berichte, Präferenzen, Matches und mehr
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {analysis && (
                <AnalysisDocumentSaver
                  analysisContent={JSON.stringify(analysis, null, 2)}
                  analysisType="KI-Spieleranalyse"
                  entityType="Player"
                  entityId={playerId}
                  defaultFileName={`KI_Analyse_${playerName}_${new Date().toISOString().split('T')[0]}`}
                />
              )}
              <Button
                onClick={runAnalysis}
                disabled={isLoading}
                className="bg-purple-700 hover:bg-purple-800 text-white"
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
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-10 text-center">
            <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-700 font-medium">KI analysiert Spielerprofil von {playerName}...</p>
            <p className="text-sm text-slate-500 mt-1">Das dauert etwa 10–20 Sekunden</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {analysis && !isLoading && (
        <>
          {/* Summary & Rating */}
          <Card className="border-indigo-200 bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Gesamtbewertung
                </CardTitle>
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg">
                  <span className="text-2xl font-bold">{analysis.overall_rating}</span>
                  <span className="text-sm">/10</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-slate-700 leading-relaxed">{analysis.summary}</p>
            </CardContent>
          </Card>

          {/* Strengths & Weaknesses */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-green-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="w-4 h-4" />
                  Stärken
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-2">
                  {analysis.strengths?.map((strength, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="w-4 h-4" />
                  Entwicklungsbereiche
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-2">
                  {analysis.weaknesses?.map((weakness, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">!</span>
                      {weakness}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Playing Style & Tactical Fit */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base">Spielstil & Taktische Eignung</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Spielstil:</p>
                <p className="text-slate-600 leading-relaxed">{analysis.playing_style}</p>
              </div>
              {analysis.tactical_fit?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Passt zu:</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.tactical_fit.map((system, i) => (
                      <Badge key={i} variant="outline" className="border-blue-300 bg-blue-50 text-blue-900">
                        {system}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market Value & Timing */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Marktwert-Einschätzung</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {analysis.market_value_assessment && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Geschätzter Wert:</span>
                      <span className="font-bold text-slate-900">{analysis.market_value_assessment.estimated_value}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Trend:</span>
                      <Badge className={trendColors[analysis.market_value_assessment.trend]}>
                        {analysis.market_value_assessment.trend}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Aktueller Wert fair:</span>
                      <span className="font-semibold">
                        {analysis.market_value_assessment.current_value_fair ? '✓ Ja' : '✗ Nein'}
                      </span>
                    </div>
                    {analysis.market_value_assessment.reasoning && (
                      <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                        {analysis.market_value_assessment.reasoning}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Transfer-Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {analysis.transfer_timing && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-600 mb-2">Bester Zeitpunkt:</p>
                    <Badge className={`${timingColors[analysis.transfer_timing]} text-sm py-1.5 px-3`}>
                      {analysis.transfer_timing.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                )}
                {analysis.suitable_clubs?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-600 mb-2">Passende Vereine:</p>
                    <div className="space-y-2">
                      {analysis.suitable_clubs.map((club, i) => (
                        <div key={i} className="text-xs bg-slate-50 p-2 rounded border border-slate-200">
                          <p className="font-semibold text-slate-800">{club.league_type}</p>
                          <p className="text-slate-600 mt-0.5">{club.club_profile}</p>
                          {club.reasoning && (
                            <p className="text-slate-500 mt-1 text-xs italic">{club.reasoning}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Risks & Opportunities */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risiken
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-1.5">
                  {analysis.risks?.map((risk, i) => (
                    <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Chancen
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-1.5">
                  {analysis.opportunities?.map((opp, i) => (
                    <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      {opp}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Next Steps */}
          {analysis.next_steps?.length > 0 && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-purple-900 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Handlungsempfehlungen für die Agentur
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ol className="space-y-2">
                  {analysis.next_steps.map((step, i) => (
                    <li key={i} className="text-sm text-purple-900 flex items-start gap-2">
                      <span className="font-bold mt-0.5">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}