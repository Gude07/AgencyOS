import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { saveAnalysisDocument, buildClubMatchingHtml } from "@/utils/saveAnalysisDocument";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Loader2, Save, Trash2, TrendingUp, Users, Target, Brain,
  X, Plus, Building2, ThumbsUp, ThumbsDown, AlertTriangle, BarChart3, GitCompare, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MatchingCriteriaWeights from "@/components/clubAnalysis/MatchingCriteriaWeights";
import AnalysisFolderManager from "@/components/clubAnalysis/AnalysisFolderManager";
import WhatIfScenario from "@/components/clubAnalysis/WhatIfScenario";
import SimilarPlayersSearch from "@/components/clubAnalysis/SimilarPlayersSearch";
import PlayerRadarChart from "@/components/clubAnalysis/PlayerRadarChart";
import { POSITIONS } from "@/components/clubAnalysis/positions";

const DEFAULT_WEIGHTS = {
  position_fit: 5, playing_style: 5, physical: 5, technical: 5,
  mental: 5, age_potential: 5, form: 5, culture_fit: 5
};

export default function ClubAnalysis() {
  const [clubName, setClubName] = useState("");
  const [currentClubProfile, setCurrentClubProfile] = useState(null);
  const [currentRecommendations, setCurrentRecommendations] = useState(null);
  const [matchedRequests, setMatchedRequests] = useState([]);
  const [isAnalyzingClub, setIsAnalyzingClub] = useState(false);
  const [isMatchingPlayers, setIsMatchingPlayers] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [saveFolderId, setSaveFolderId] = useState(null);
  const [manualPositions, setManualPositions] = useState([]);
  const [posInput, setPosInput] = useState("");
  const [criteriaWeights, setCriteriaWeights] = useState(DEFAULT_WEIGHTS);
  const [whatIfActive, setWhatIfActive] = useState(false);
  const [whatIfParams, setWhatIfParams] = useState({});
  const [feedback, setFeedback] = useState({});
  const [activeTab, setActiveTab] = useState("results");
  const [usedExistingProfile, setUsedExistingProfile] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers', user?.agency_id],
    queryFn: () => base44.entities.Player.filter({ agency_id: user.agency_id }),
    enabled: !!user?.agency_id
  });
  const { data: analysisFolders = [] } = useQuery({
    queryKey: ['analysisFolders', user?.agency_id],
    queryFn: () => base44.entities.AnalysisFolder.filter({ agency_id: user.agency_id }),
    enabled: !!user?.agency_id,
  });

  const { data: savedAnalyses = [] } = useQuery({
    queryKey: ['clubAnalyses', user?.agency_id],
    queryFn: () => base44.entities.ClubAnalysis.filter({ agency_id: user.agency_id }, '-created_date'),
    enabled: !!user?.agency_id,
  });

  const saveAnalysisMutation = useMutation({
    mutationFn: (data) => base44.entities.ClubAnalysis.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clubAnalyses'] }); toast.success('Analyse gespeichert'); },
  });
  const deleteAnalysisMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubAnalysis.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clubAnalyses'] }); toast.success('Analyse gelöscht'); setDeleteId(null); },
  });

  const addManualPosition = (pos) => {
    if (pos && !manualPositions.includes(pos)) setManualPositions([...manualPositions, pos]);
    setPosInput("");
  };
  const removeManualPosition = (pos) => setManualPositions(manualPositions.filter(p => p !== pos));

  const handleAnalyzeClub = async () => {
    if (!clubName.trim()) { toast.error('Bitte Vereinsname eingeben'); return; }
    setIsAnalyzingClub(true);
    setCurrentClubProfile(null);
    setCurrentRecommendations(null);
    setMatchedRequests([]);
    setFeedback({});
    setUsedExistingProfile(false);
    try {
      const response = await base44.functions.invoke('analyzeClub', {
        clubName: clubName.trim(),
        manualPositions
      });
      if (response.data.success) {
        setCurrentClubProfile({ club_name: clubName.trim(), ...response.data.clubProfile });
        setMatchedRequests(response.data.matchedRequests || []);
        setUsedExistingProfile(response.data.usedExistingProfile || false);
        queryClient.invalidateQueries({ queryKey: ['clubProfiles'] });
        if ((response.data.matchedRequests || []).length > 0) {
          toast.success(`${response.data.matchedRequests.length} passende Vereinsanfrage(n) gefunden!`);
        } else if (response.data.usedExistingProfile) {
          toast.success('Vereinsprofil aus Datenbank ergänzt & aktualisiert');
        } else {
          toast.success('Vereinsanalyse abgeschlossen & Profil gespeichert');
        }
      } else {
        toast.error(response.data.error || 'Analyse fehlgeschlagen');
      }
    } catch (error) {
      toast.error('Fehler bei der Vereinsanalyse');
    } finally {
      setIsAnalyzingClub(false);
    }
  };

  const handleMatchPlayers = async (overrideParams = {}) => {
    if (!currentClubProfile) { toast.error('Bitte erst Vereinsanalyse durchführen'); return; }
    setIsMatchingPlayers(true);
    setFeedback({});
    try {
      const response = await base44.functions.invoke('matchPlayersToClub', {
        clubName: currentClubProfile.club_name,
        clubProfile: currentClubProfile,
        criteriaWeights,
        whatIfBudget: overrideParams.whatIfBudget || null,
        whatIfPositions: overrideParams.whatIfPositions || []
      });
      if (response.data.success) {
        setCurrentRecommendations(response.data);
        setActiveTab("results");
        toast.success(`${response.data.recommendations.length} Spieler empfohlen`);
        // Auto-save as document on ClubProfile
        try {
          const profiles = await base44.entities.ClubProfile.filter({ agency_id: user?.agency_id });
          const matchedProfile = profiles.find(p =>
            p.club_name?.toLowerCase() === currentClubProfile.club_name?.toLowerCase()
          );
          if (matchedProfile) {
            await saveAnalysisDocument({
              title: `Spieler-Matching ${currentClubProfile.club_name} ${new Date().toLocaleDateString('de-DE')}`,
              analysisType: 'KI-Spieler-Matching',
              entityType: 'ClubProfile',
              entityId: matchedProfile.id,
              htmlBody: buildClubMatchingHtml(
                currentClubProfile.club_name,
                currentClubProfile,
                response.data.recommendations,
                response.data.summary
              )
            });
          }
        } catch (e) { console.warn('Auto-save club matching failed:', e); }
      } else {
        toast.error(response.data.error || 'Matching fehlgeschlagen');
      }
    } catch (error) {
      toast.error('Fehler beim Spieler-Matching');
    } finally {
      setIsMatchingPlayers(false);
    }
  };

  const handleWhatIfApply = (params) => {
    setWhatIfParams(params);
    setWhatIfActive(true);
    handleMatchPlayers(params);
  };

  const handleWhatIfReset = () => {
    setWhatIfParams({});
    setWhatIfActive(false);
    handleMatchPlayers({});
  };

  const handleFeedback = (playerId, value) => {
    setFeedback(prev => ({ ...prev, [playerId]: value }));
    toast.success(value === 'up' ? 'Positives Feedback gespeichert' : 'Negatives Feedback gespeichert');
  };

  const handleSaveAnalysis = () => {
    if (!currentClubProfile || !currentRecommendations) { toast.error('Bitte erst vollständige Analyse durchführen'); return; }
    saveAnalysisMutation.mutate({
      agency_id: user.agency_id,
      club_name: currentClubProfile.club_name,
      folder_id: saveFolderId || undefined,
      club_profile: currentClubProfile,
      recommended_players: currentRecommendations.recommendations,
      analysis_summary: currentRecommendations.summary,
      total_players_analyzed: currentRecommendations.analyzedPlayers
    });
  };

  const loadSavedAnalysis = (analysis) => {
    setCurrentClubProfile({ club_name: analysis.club_name, ...analysis.club_profile });
    setCurrentRecommendations({ recommendations: analysis.recommended_players, summary: analysis.analysis_summary, analyzedPlayers: analysis.total_players_analyzed });
    setClubName(analysis.club_name);
    setMatchedRequests([]);
    setFeedback({});
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
            <p className="text-slate-600 dark:text-slate-400">Intelligente Spielerempfehlungen mit Vereins- und Anfragen-Matching</p>
          </div>
        </div>

        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Neue Analyse starten
            </CardTitle>
            <CardDescription>Verein analysieren. Aktive Vereinsanfragen werden automatisch berücksichtigt.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="z.B. FC Bayern München, SV Darmstadt 98, ..."
                value={clubName}
                onChange={e => setClubName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyzeClub()}
                disabled={isAnalyzingClub}
              />
              <Button onClick={handleAnalyzeClub} disabled={isAnalyzingClub || !clubName.trim()} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                {isAnalyzingClub ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysiere...</> : <><Sparkles className="w-4 h-4 mr-2" />Verein analysieren</>}
              </Button>
            </div>

            {/* Manual Positions */}
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Positionen manuell hinzufügen (optional)</p>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Position eingeben oder auswählen..."
                  value={posInput}
                  onChange={e => setPosInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addManualPosition(posInput)}
                  className="text-sm"
                  list="manual-positions-list"
                />
                <datalist id="manual-positions-list">
                  {POSITIONS.map(p => <option key={p} value={p} />)}
                </datalist>
                <Button size="sm" variant="outline" onClick={() => addManualPosition(posInput)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {manualPositions.map(p => (
                  <Badge key={p} className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 gap-1 cursor-pointer" onClick={() => removeManualPosition(p)}>
                    {p} <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            </div>
            {isAnalyzingClub && <p className="text-sm text-slate-600 dark:text-slate-400">KI analysiert Verein... (30–60 Sekunden)</p>}
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {currentClubProfile && (
          <div className="space-y-6">
            {usedExistingProfile && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-300">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Bestehendes Vereinsprofil aus der Datenbank als Grundlage verwendet — KI hat nur fehlende Informationen ergänzt (spart Credits).</span>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{currentClubProfile.club_name}</h2>
              <div className="flex gap-3 flex-wrap">
                <Button onClick={() => handleMatchPlayers(whatIfActive ? whatIfParams : {})} disabled={isMatchingPlayers} className="bg-green-600 hover:bg-green-700">
                  {isMatchingPlayers ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysiere...</> : <><Users className="w-4 h-4 mr-2" />Spieler-Matching</>}
                </Button>
                {currentRecommendations && (
                  <>
                    <select
                      value={saveFolderId || ''}
                      onChange={e => setSaveFolderId(e.target.value || null)}
                      className="text-sm border rounded px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-600"
                    >
                      <option value="">Kein Ordner</option>
                      {analysisFolders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <Button onClick={handleSaveAnalysis} disabled={saveAnalysisMutation.isPending} variant="outline">
                      <Save className="w-4 h-4 mr-2" />Speichern
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Matched Requests */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="results">Vereinsprofil</TabsTrigger>
                <TabsTrigger value="matching">Matching-Setup</TabsTrigger>
                <TabsTrigger value="recommendations">Empfehlungen</TabsTrigger>
                <TabsTrigger value="similar">Ähnliche Spieler</TabsTrigger>
              </TabsList>

              {/* Club Profile Tab */}
              <TabsContent value="results">
                <Card>
                  <CardContent className="pt-6 space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Spielweise</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{currentClubProfile.playing_style}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Formationen</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentClubProfile.formations?.map((f, i) => <Badge key={i} variant="outline">{f}</Badge>)}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Trainer & Philosophie</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                          <span className="font-medium">{currentClubProfile.current_coach}</span>
                          {currentClubProfile.coach_philosophy && <span className="block mt-1">{currentClubProfile.coach_philosophy}</span>}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Liga & Land</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{currentClubProfile.league} ({currentClubProfile.country})</p>
                      </div>
                    </div>

                    {/* Vereinskultur */}
                    {currentClubProfile.club_culture && (
                      <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                        <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-2">🏛️ Vereinskultur & Philosophie</h4>
                        <p className="text-indigo-800 dark:text-indigo-300 text-sm">{currentClubProfile.club_culture}</p>
                        {currentClubProfile.player_culture_fit && (
                          <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-2 italic">Idealer Spielertyp: {currentClubProfile.player_culture_fit}</p>
                        )}
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Gesuchte Attribute</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentClubProfile.key_attributes?.map((a, i) => (
                          <Badge key={i} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{a}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Gesuchte Positionen</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentClubProfile.target_positions?.map((p, i) => (
                          <Badge key={i} className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">{p}</Badge>
                        ))}
                      </div>
                    </div>

                    {currentClubProfile.injury_situation && (
                      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />Verletzungssituation
                        </h4>
                        <p className="text-red-800 dark:text-red-300 text-sm">{currentClubProfile.injury_situation}</p>
                      </div>
                    )}

                    {currentClubProfile.realistic_budget && (
                      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">💰 Transferbudget</h4>
                        <p className="font-medium text-green-800 dark:text-green-300">
                          {currentClubProfile.realistic_budget.min?.toLocaleString('de-DE')}€ – {currentClubProfile.realistic_budget.max?.toLocaleString('de-DE')}€
                        </p>
                        {currentClubProfile.realistic_budget.notes && <p className="text-sm text-green-700 dark:text-green-400 mt-1">{currentClubProfile.realistic_budget.notes}</p>}
                      </div>
                    )}

                    {currentClubProfile.transfer_trends && (
                      <div>
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Transfertrends</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{currentClubProfile.transfer_trends}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Matching Setup Tab */}
              <TabsContent value="matching" className="space-y-4">
                <MatchingCriteriaWeights weights={criteriaWeights} onChange={setCriteriaWeights} />
                <WhatIfScenario onApply={handleWhatIfApply} onReset={handleWhatIfReset} isActive={whatIfActive} />
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations">
                {currentRecommendations ? (
                  <div className="space-y-4">
                    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
                      <CardContent className="pt-4">
                        {currentRecommendations.isWhatIfScenario && (
                          <Badge className="bg-amber-500 text-white mb-2">Was-wäre-wenn Szenario</Badge>
                        )}
                        <p className="text-slate-700 dark:text-slate-300 text-sm">{currentRecommendations.summary}</p>
                        {currentRecommendations.what_if_note && currentRecommendations.isWhatIfScenario && (
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 italic">{currentRecommendations.what_if_note}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-2">{currentRecommendations.analyzedPlayers} Spieler analysiert</p>
                      </CardContent>
                    </Card>

                    <div className="space-y-3">
                      {currentRecommendations.recommendations?.map((rec, index) => (
                        <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-900">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link to={`${createPageUrl("PlayerDetail")}?id=${rec.player_id}`} className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                  {rec.player_name}
                                </Link>
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  {rec.match_score}% Match
                                </Badge>
                                <span className="text-sm text-slate-400">#{index + 1}</span>
                              </div>
                              {rec.culture_fit && (
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">🏛️ {rec.culture_fit}</p>
                              )}
                            </div>
                            {/* Feedback */}
                            <div className="flex gap-1 ml-3">
                              <Button
                                size="icon"
                                variant={feedback[rec.player_id] === 'up' ? 'default' : 'ghost'}
                                className={`h-8 w-8 ${feedback[rec.player_id] === 'up' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                                onClick={() => handleFeedback(rec.player_id, 'up')}
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant={feedback[rec.player_id] === 'down' ? 'default' : 'ghost'}
                                className={`h-8 w-8 ${feedback[rec.player_id] === 'down' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                                onClick={() => handleFeedback(rec.player_id, 'down')}
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">{rec.reasoning}</p>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {rec.key_strengths?.map((s, i) => <Badge key={i} variant="outline" className="text-xs">{s}</Badge>)}
                            {rec.risk_factors?.map((r, i) => <Badge key={i} variant="outline" className="text-xs text-orange-700 border-orange-300">⚠ {r}</Badge>)}
                          </div>

                          {/* Radar Chart */}
                          {rec.radar_scores && (
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Profil-Visualisierung</span>
                              </div>
                              <PlayerRadarChart radarScores={rec.radar_scores} playerName={rec.player_name} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-slate-500 dark:text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>Noch keine Empfehlungen. Starten Sie das Spieler-Matching.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Similar Players Tab */}
              <TabsContent value="similar">
                <SimilarPlayersSearch players={allPlayers} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Saved Analyses */}
        {savedAnalyses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Gespeicherte Analysen ({savedAnalyses.length})</CardTitle>
              <div className="mt-2">
                <AnalysisFolderManager agencyId={user?.agency_id} selectedFolderId={selectedFolderId} onSelectFolder={setSelectedFolderId} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {savedAnalyses.filter(a => selectedFolderId === null || a.folder_id === selectedFolderId).map(analysis => (
                  <div key={analysis.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900">
                    <div className="flex-1 cursor-pointer" onClick={() => loadSavedAnalysis(analysis)}>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{analysis.club_name}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {analysis.recommended_players?.length || 0} Empfehlungen · {new Date(analysis.created_date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(analysis.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Analyse löschen?</AlertDialogTitle>
            <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAnalysisMutation.mutate(deleteId)}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}