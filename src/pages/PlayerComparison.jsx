import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Search, Loader2, Save, Globe, Bookmark, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { FullComparisonView } from "@/components/playerComparison/ComparisonDetailView";

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

  // Build comparison object for FullComparisonView
  const comparisonData = result ? {
    player_profile: result.player_profile,
    similar_players: result.similar_players,
    fit_results: result.fit_results,
    club_replacement: result.club_replacement,
    reference_player: playerName,
    reference_club: clubName
  } : null;

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
                <Input placeholder="z.B. Jamal Musiala" value={playerName} onChange={e => setPlayerName(e.target.value)} disabled={loading} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Verein *</label>
                <Input placeholder="z.B. Bayern München" value={clubName} onChange={e => setClubName(e.target.value)} disabled={loading} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Position (optional)</label>
                <Input placeholder="z.B. Attacking Midfielder" value={position} onChange={e => setPosition(e.target.value)} disabled={loading} />
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
            <FullComparisonView comparison={comparisonData} />
          </div>
        )}
      </div>
    </div>
  );
}