import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Save, Trash2, TrendingUp, Users, Target, Brain } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ClubAnalysis() {
  const [clubName, setClubName] = useState("");
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: savedAnalyses = [] } = useQuery({
    queryKey: ['clubAnalyses', user?.agency_id],
    queryFn: () => base44.entities.ClubAnalysis.filter({ agency_id: user.agency_id }, '-created_date'),
    enabled: !!user?.agency_id,
  });

  const saveAnalysisMutation = useMutation({
    mutationFn: (analysisData) => base44.entities.ClubAnalysis.create(analysisData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubAnalyses'] });
      toast.success('Analyse gespeichert');
    },
  });

  const deleteAnalysisMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubAnalysis.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubAnalyses'] });
      toast.success('Analyse gelöscht');
      setDeleteId(null);
    },
  });

  const handleAnalyze = async () => {
    if (!clubName.trim()) {
      toast.error('Bitte Vereinsname eingeben');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await base44.functions.invoke('analyzeClubAndRecommendPlayers', {
        clubName: clubName.trim()
      });

      if (response.data.success) {
        setCurrentAnalysis({
          club_name: clubName.trim(),
          club_profile: response.data.clubProfile,
          recommended_players: response.data.recommendations,
          analysis_summary: response.data.summary,
          total_players_analyzed: response.data.totalPlayersAnalyzed
        });
        toast.success('Analyse abgeschlossen');
      } else {
        toast.error(response.data.error || 'Analyse fehlgeschlagen');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Fehler bei der Analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAnalysis = () => {
    if (!currentAnalysis) return;

    saveAnalysisMutation.mutate({
      agency_id: user.agency_id,
      ...currentAnalysis
    });
  };

  const loadSavedAnalysis = (analysis) => {
    setCurrentAnalysis({
      club_name: analysis.club_name,
      club_profile: analysis.club_profile,
      recommended_players: analysis.recommended_players,
      analysis_summary: analysis.analysis_summary,
      total_players_analyzed: analysis.total_players_analyzed
    });
    setClubName(analysis.club_name);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">KI-Vereinsanalyse</h1>
            <p className="text-slate-600 dark:text-slate-400">Intelligente Spielerempfehlungen basierend auf Vereinsprofilen</p>
          </div>
        </div>

        {/* Analyse-Tool */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Neue Analyse starten
            </CardTitle>
            <CardDescription>
              Geben Sie einen Vereinsnamen ein. Die KI analysiert den Verein und empfiehlt passende Spieler aus Ihrem Pool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="z.B. FC Bayern München, Manchester United, ..."
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                disabled={isAnalyzing}
              />
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !clubName.trim()}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analysiere...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analysieren
                  </>
                )}
              </Button>
            </div>
            {isAnalyzing && (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Die KI sammelt Informationen aus dem Internet und analysiert Ihren Spielerpool. Dies kann 30-60 Sekunden dauern...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aktuelle Analyse */}
        {currentAnalysis && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Analyse: {currentAnalysis.club_name}
              </h2>
              <Button onClick={handleSaveAnalysis} disabled={saveAnalysisMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Analyse speichern
              </Button>
            </div>

            {/* Vereinsprofil */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Vereinsprofil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Spielweise</h4>
                    <p className="text-slate-600 dark:text-slate-400">{currentAnalysis.club_profile.playing_style}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Formationen</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentAnalysis.club_profile.formations?.map((formation, i) => (
                        <Badge key={i} variant="outline">{formation}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Trainer & Philosophie</h4>
                    <p className="text-slate-600 dark:text-slate-400">
                      <span className="font-medium">{currentAnalysis.club_profile.current_coach || 'N/A'}</span>
                      {currentAnalysis.club_profile.coach_philosophy && (
                        <span className="block mt-1">{currentAnalysis.club_profile.coach_philosophy}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Liga & Land</h4>
                    <p className="text-slate-600 dark:text-slate-400">
                      {currentAnalysis.club_profile.league} ({currentAnalysis.club_profile.country})
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Gesuchte Attribute</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentAnalysis.club_profile.key_attributes?.map((attr, i) => (
                      <Badge key={i} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{attr}</Badge>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-3">
                  {currentAnalysis.club_profile.injury_situation && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Aktuelle Verletzungssituation
                      </h4>
                      <p className="text-red-800 dark:text-red-300">{currentAnalysis.club_profile.injury_situation}</p>
                    </div>
                  )}
                  {currentAnalysis.club_profile.transfer_trends && (
                    <div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Transfertrends & Strategie</h4>
                      <p className="text-slate-600 dark:text-slate-400">{currentAnalysis.club_profile.transfer_trends}</p>
                    </div>
                  )}
                  {currentAnalysis.club_profile.current_reports && (
                    <div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Aktuelle Berichte & News</h4>
                      <p className="text-slate-600 dark:text-slate-400">{currentAnalysis.club_profile.current_reports}</p>
                    </div>
                  )}
                  {currentAnalysis.club_profile.target_positions && currentAnalysis.club_profile.target_positions.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Gesuchte Positionen</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentAnalysis.club_profile.target_positions.map((pos, i) => (
                          <Badge key={i} className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">{pos}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Zusammenfassung */}
            {currentAnalysis.analysis_summary && (
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    KI-Zusammenfassung
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 dark:text-slate-300">{currentAnalysis.analysis_summary}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    {currentAnalysis.total_players_analyzed} Spieler analysiert
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Empfohlene Spieler */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Empfohlene Spieler ({currentAnalysis.recommended_players?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentAnalysis.recommended_players?.map((rec, index) => (
                    <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <Link 
                            to={createPageUrl("PlayerDetail") + `?id=${rec.player_id}`}
                            className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {rec.player_name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Match: {rec.match_score}%
                            </Badge>
                            <span className="text-sm text-slate-500 dark:text-slate-400">#{index + 1}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mb-2">{rec.reasoning}</p>
                      <div className="flex flex-wrap gap-2">
                        {rec.key_strengths?.map((strength, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{strength}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gespeicherte Analysen */}
        {savedAnalyses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Gespeicherte Analysen ({savedAnalyses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {savedAnalyses.map((analysis) => (
                  <div 
                    key={analysis.id}
                    className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <div className="flex-1 cursor-pointer" onClick={() => loadSavedAnalysis(analysis)}>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{analysis.club_name}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {analysis.recommended_players?.length || 0} Empfehlungen • {' '}
                        {new Date(analysis.created_date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(analysis.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Analyse löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAnalysisMutation.mutate(deleteId)}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}