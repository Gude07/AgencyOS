import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ThumbsUp, ThumbsDown, Target, Building2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const matchLevelColors = {
  "Sehr gut": "bg-green-100 text-green-800 border-green-300",
  "Gut": "bg-blue-100 text-blue-800 border-blue-300",
  "Mittel": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Gering": "bg-red-100 text-red-800 border-red-300",
};

const fitScoreColor = (score) => {
  if (score >= 80) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-200";
  if (score >= 40) return "text-yellow-700 bg-yellow-50 border-yellow-200";
  return "text-red-700 bg-red-50 border-red-200";
};

export default function PlayerClubFitAnalysis({ playerId, playerName }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [idealProfile, setIdealProfile] = useState(null);
  const [clubFitResults, setClubFitResults] = useState([]);
  const [totalClubs, setTotalClubs] = useState(0);
  const [message, setMessage] = useState(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setIdealProfile(null);
    setClubFitResults([]);
    setMessage(null);
    try {
      const response = await base44.functions.invoke('generatePlayerClubFit', { playerId });
      if (response.data.success) {
        setIdealProfile(response.data.idealProfile);
        setClubFitResults(response.data.clubFitResults || []);
        setTotalClubs(response.data.totalClubsAnalyzed || 0);
        setMessage(response.data.message || null);
        if ((response.data.clubFitResults || []).length > 0) {
          toast.success(`${response.data.clubFitResults.length} Vereine analysiert`);
        } else {
          toast.info('Idealprofil erstellt – keine Club-Profile zum Abgleichen gefunden');
        }
      } else {
        toast.error('Analyse fehlgeschlagen');
      }
    } catch (error) {
      toast.error('Fehler bei der Analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Start */}
      <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
            <Target className="w-5 h-5" />
            Club-Fit Analyse
          </CardTitle>
          <CardDescription className="text-purple-700 dark:text-purple-400">
            Die KI analysiert alle Spielerdaten und erstellt ein "Ideales Club-Profil" für {playerName}. 
            Anschließend werden vorhandene Vereinsprofile abgeglichen. <span className="font-semibold">Sehr geringer Credit-Verbrauch.</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {isAnalyzing
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysiere...</>
              : <><Sparkles className="w-4 h-4 mr-2" />Club-Fit Analyse starten</>
            }
          </Button>
          {isAnalyzing && (
            <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">
              Schritt 1: Ideales Club-Profil wird generiert... dann Abgleich mit {totalClubs > 0 ? `${totalClubs} Vereinsprofilen` : 'vorhandenen Vereinsprofilen'}...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Kein Club-Profil gefunden */}
      {message && !idealProfile && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="pt-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 dark:text-amber-300 text-sm">{message}</p>
              <Link to={createPageUrl("ClubAnalysis")} className="text-sm text-amber-700 dark:text-amber-400 underline mt-1 inline-block">
                → Zur KI-Vereinsanalyse (Club-Profile erstellen)
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ideales Club-Profil */}
      {idealProfile && (
        <Card className="border-indigo-200 dark:border-indigo-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 text-lg">
              <Sparkles className="w-5 h-5" />
              Ideales Club-Profil für {playerName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {idealProfile.player_summary && (
              <p className="text-slate-700 dark:text-slate-300 text-sm italic border-l-4 border-indigo-300 pl-3">
                {idealProfile.player_summary}
              </p>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              {idealProfile.tactical_role && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">🎯 Taktische Rolle</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{idealProfile.tactical_role}</p>
                </div>
              )}
              {idealProfile.ideal_playing_style && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">⚽ Idealer Spielstil</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{idealProfile.ideal_playing_style}</p>
                </div>
              )}
              {idealProfile.ideal_league_level && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">🏆 Ideales Liganiveau</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{idealProfile.ideal_league_level}</p>
                </div>
              )}
              {idealProfile.development_environment && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">🌱 Entwicklungsumgebung</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{idealProfile.development_environment}</p>
                </div>
              )}
            </div>
            {idealProfile.ideal_formations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Ideale Formationen</h4>
                <div className="flex flex-wrap gap-2">
                  {idealProfile.ideal_formations.map((f, i) => (
                    <Badge key={i} variant="outline" className="border-indigo-300 text-indigo-700">{f}</Badge>
                  ))}
                </div>
              </div>
            )}
            {idealProfile.ideal_club_attributes?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Ideale Vereinsattribute</h4>
                <div className="flex flex-wrap gap-2">
                  {idealProfile.ideal_club_attributes.map((a, i) => (
                    <Badge key={i} className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">{a}</Badge>
                  ))}
                </div>
              </div>
            )}
            {idealProfile.key_requirements?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Schlüsselanforderungen</h4>
                <div className="flex flex-wrap gap-2">
                  {idealProfile.key_requirements.map((r, i) => (
                    <Badge key={i} className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">{r}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Club-Fit Ergebnisse */}
      {clubFitResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-500" />
            Abgleich mit {totalClubs} Vereinsprofilen
          </h3>
          {message && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <Info className="w-4 h-4 flex-shrink-0" />
              {message}
            </div>
          )}
          {clubFitResults.map((result, i) => (
            <Card key={result.club_id || i} className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl font-bold px-3 py-1.5 rounded-lg border ${fitScoreColor(result.fit_score)}`}>
                      {result.fit_score}%
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        #{i + 1} {result.club_name}
                      </h4>
                      <Badge variant="outline" className={matchLevelColors[result.match_level] || ""}>
                        {result.match_level}
                      </Badge>
                    </div>
                  </div>
                </div>

                {result.summary && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{result.summary}</p>
                )}

                <div className="grid md:grid-cols-2 gap-3">
                  {result.reasons_for?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <ThumbsUp className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">Spricht dafür</span>
                      </div>
                      <ul className="space-y-1">
                        {result.reasons_for.map((r, j) => (
                          <li key={j} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.reasons_against?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <ThumbsDown className="w-3.5 h-3.5 text-red-600" />
                        <span className="text-xs font-semibold text-red-700">Spricht dagegen</span>
                      </div>
                      <ul className="space-y-1">
                        {result.reasons_against.map((r, j) => (
                          <li key={j} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Keine Ergebnisse nach Analyse */}
      {idealProfile && clubFitResults.length === 0 && (
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6 text-center text-slate-500 dark:text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Keine Club-Profile zum Abgleichen</p>
            <p className="text-sm mt-1">
              Erstellen Sie zuerst Vereinsprofile über die{" "}
              <Link to={createPageUrl("ClubAnalysis")} className="text-blue-600 underline">KI-Vereinsanalyse</Link>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}