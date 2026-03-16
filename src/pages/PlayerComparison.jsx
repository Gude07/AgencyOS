import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import {
  Search, Loader2, Save, BookOpen, User, Zap, Target, TrendingUp,
  CheckCircle, XCircle, ChevronRight, Trophy, Globe, Bookmark
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function FitScoreBar({ score, color = "blue" }) {
  const bg = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div className={`${bg} h-2 rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-10 text-right">{score}</span>
    </div>
  );
}

function ProfileSection({ profile }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 bg-slate-50 dark:bg-slate-800">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" /> Spielstil
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{profile.playing_style}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-slate-50 dark:bg-slate-800">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" /> Taktische Rolle
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{profile.tactical_role}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-slate-50 dark:bg-slate-800">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Physisches Profil</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{profile.physical_profile}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-slate-50 dark:bg-slate-800">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Technisches Profil</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{profile.technical_profile}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-0 bg-slate-50 dark:bg-slate-800">
        <CardContent className="p-4">
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Taktisches Profil</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">{profile.tactical_profile}</p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" /> Stärken
          </h4>
          <div className="flex flex-wrap gap-2">
            {(profile.strengths || []).map((s, i) => (
              <Badge key={i} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0">{s}</Badge>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" /> Schwächen
          </h4>
          <div className="flex flex-wrap gap-2">
            {(profile.weaknesses || []).map((w, i) => (
              <Badge key={i} className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-0">{w}</Badge>
            ))}
          </div>
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Key Attributes</h4>
        <div className="flex flex-wrap gap-2">
          {(profile.key_attributes || []).map((a, i) => (
            <Badge key={i} variant="outline" className="text-blue-700 border-blue-300 dark:text-blue-300">{a}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function SimilarPlayerCard({ player, fitResult }) {
  return (
    <Card className="border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">{player.name || fitResult?.name}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {player.club || fitResult?.club} · {player.league || ''} {player.age ? `· ${player.age} J.` : ''}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">{player.position || fitResult?.position}</Badge>
        </div>
        {fitResult && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Fit Score</span>
            </div>
            <FitScoreBar score={fitResult.fit_score} />
          </div>
        )}
        {player.estimated_market_value && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            💰 Marktwert: <span className="font-medium">{player.estimated_market_value}</span>
          </p>
        )}
        {fitResult?.comparison_summary && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{fitResult.comparison_summary}</p>
        )}
        {fitResult?.strength_overlap?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {fitResult.strength_overlap.map((s, i) => (
              <span key={i} className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        )}
        {player.similarity_reason && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">{player.similarity_reason}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ReplacementCard({ player, rank }) {
  return (
    <Card className="border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${rank === 1 ? 'bg-yellow-400 text-yellow-900' : rank === 2 ? 'bg-slate-300 text-slate-700' : rank === 3 ? 'bg-orange-300 text-orange-800' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{player.name}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">{player.club} · {player.position}</p>
              </div>
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500">Replacement Score</span>
              </div>
              <FitScoreBar score={player.replacement_score} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{player.tactical_fit_explanation}</p>
            {player.strength_for_club_system?.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">Stärken für den Verein:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {player.strength_for_club_system.map((s, i) => (
                    <span key={i} className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {player.potential_risk?.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-red-500">Risiken:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {player.potential_risk.map((r, i) => (
                    <span key={i} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 px-2 py-0.5 rounded-full">{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlayerComparison() {
  const [playerName, setPlayerName] = useState('');
  const [clubName, setClubName] = useState('');
  const [position, setPosition] = useState('');
  const [enableReplacement, setEnableReplacement] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const steps = [
    'Spielerprofil wird analysiert...',
    'Ähnliche Spieler werden gesucht...',
    'Taktischer Fit wird bewertet...',
    enableReplacement ? 'Vereinsersatz wird analysiert...' : null
  ].filter(Boolean);

  const handleAnalyze = async () => {
    if (!playerName.trim() || !clubName.trim()) {
      toast({ title: 'Bitte Spielername und Verein eingeben', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResult(null);
    let stepIdx = 0;
    setLoadingStep(steps[0]);
    const interval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setLoadingStep(steps[stepIdx]);
    }, enableReplacement ? 15000 : 12000);

    try {
      const res = await base44.functions.invoke('playerProfileMatch', {
        playerName: playerName.trim(),
        clubName: clubName.trim(),
        position: position.trim() || undefined,
        enableClubReplacement: enableReplacement
      });
      setResult(res.data);
    } catch (e) {
      toast({ title: 'Analyse fehlgeschlagen', description: e.message, variant: 'destructive' });
    } finally {
      clearInterval(interval);
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await base44.functions.invoke('saveComparison', {
        reference_player: playerName,
        reference_club: clubName,
        player_profile: result.player_profile,
        similar_players: result.similar_players,
        fit_results: result.fit_results,
        club_replacement: result.club_replacement
      });
      toast({ title: 'Analyse gespeichert!', description: 'Du findest sie unter "Gespeicherte Analysen"' });
    } catch (e) {
      toast({ title: 'Speichern fehlgeschlagen', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Merge similar players with fit results
  const mergedPlayers = result ? (result.similar_players || []).map(sp => ({
    ...sp,
    fitResult: (result.fit_results || []).find(fr =>
      fr.name?.toLowerCase().includes(sp.name?.toLowerCase().split(' ')[0]) ||
      sp.name?.toLowerCase().includes(fr.name?.toLowerCase().split(' ')[0])
    )
  })).sort((a, b) => (b.fitResult?.fit_score || 0) - (a.fitResult?.fit_score || 0)) : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-600" />
              Player Profile Match
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">KI-basiertes Spielerprofil-Vergleichstool mit globaler Spielersuche</p>
          </div>
          <Link to="/SavedComparisons">
            <Button variant="outline" className="gap-2">
              <Bookmark className="w-4 h-4" />
              Gespeicherte Analysen
            </Button>
          </Link>
        </div>

        {/* Input Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" /> Referenzspieler eingeben
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Spielername *</label>
                <Input
                  placeholder="z.B. Jamal Musiala"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Verein *</label>
                <Input
                  placeholder="z.B. Bayern München"
                  value={clubName}
                  onChange={e => setClubName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Position (optional)</label>
                <Input
                  placeholder="z.B. Attacking Midfielder"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <input
                type="checkbox"
                id="replacement"
                checked={enableReplacement}
                onChange={e => setEnableReplacement(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="replacement" className="text-sm text-blue-800 dark:text-blue-200 cursor-pointer">
                <span className="font-semibold">Club Replacement Analysis aktivieren</span>
                <span className="block text-xs opacity-75">Analysiert welche Spieler am besten als Ersatz im Vereinssystem passen (+~15s)</span>
              </label>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={loading || !playerName.trim() || !clubName.trim()}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white gap-2 h-11"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {loadingStep}</>
              ) : (
                <><Search className="w-4 h-4" /> Spielerprofil analysieren</>
              )}
            </Button>
            {loading && (
              <div className="space-y-2">
                {steps.map((s, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs transition-all ${s === loadingStep ? 'text-blue-600 dark:text-blue-400 font-medium' : steps.indexOf(loadingStep) > i ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                    {steps.indexOf(loadingStep) > i ? <CheckCircle className="w-3 h-3" /> : s === loadingStep ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                    {s}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && result.success && (
          <div className="space-y-6">
            {/* Save Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Analyse: {result.player_profile?.player_name || playerName}
                <span className="text-sm font-normal text-slate-500 ml-2">@ {result.player_profile?.club || clubName}</span>
              </h2>
              <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Analyse speichern
              </Button>
            </div>

            <Tabs defaultValue="profile">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="profile" className="gap-1 text-xs md:text-sm">
                  <User className="w-3 h-3" /> Spielerprofil
                </TabsTrigger>
                <TabsTrigger value="similar" className="gap-1 text-xs md:text-sm">
                  <TrendingUp className="w-3 h-3" /> Ähnliche Spieler ({mergedPlayers.length})
                </TabsTrigger>
                {result.club_replacement && (
                  <TabsTrigger value="replacement" className="gap-1 text-xs md:text-sm">
                    <Trophy className="w-3 h-3" /> Vereinsersatz
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="profile" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {result.player_profile?.player_name}
                      <Badge className="ml-2" variant="outline">{result.player_profile?.position}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProfileSection profile={result.player_profile} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="similar" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mergedPlayers.map((player, i) => (
                    <SimilarPlayerCard key={i} player={player} fitResult={player.fitResult} />
                  ))}
                </div>
              </TabsContent>

              {result.club_replacement && (
                <TabsContent value="replacement" className="mt-4">
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Vereinskontext: {clubName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      {result.club_replacement.club_context?.formation && (
                        <div><span className="text-blue-600 dark:text-blue-400 font-medium block">Formation</span>{result.club_replacement.club_context.formation}</div>
                      )}
                      {result.club_replacement.club_context?.playing_style && (
                        <div><span className="text-blue-600 dark:text-blue-400 font-medium block">Spielstil</span>{result.club_replacement.club_context.playing_style}</div>
                      )}
                      {result.club_replacement.club_context?.league && (
                        <div><span className="text-blue-600 dark:text-blue-400 font-medium block">Liga</span>{result.club_replacement.club_context.league}</div>
                      )}
                      {result.club_replacement.club_context?.tactical_philosophy && (
                        <div><span className="text-blue-600 dark:text-blue-400 font-medium block">Philosophie</span>{result.club_replacement.club_context.tactical_philosophy}</div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {(result.club_replacement.club_replacement_analysis || []).map((p, i) => (
                      <ReplacementCard key={i} player={p} rank={i + 1} />
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}