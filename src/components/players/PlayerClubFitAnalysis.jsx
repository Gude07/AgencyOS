import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Loader2, ThumbsUp, ThumbsDown, Target, Building2,
  CheckCircle2, AlertCircle, Info, Plus, X, Globe, Search
} from "lucide-react";
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

const POPULAR_LEAGUES = [
  "Bundesliga", "2. Bundesliga", "Premier League", "La Liga", "Serie A",
  "Ligue 1", "Eredivisie", "Primeira Liga", "Süper Lig", "3. Liga"
];

export default function PlayerClubFitAnalysis({ playerId, playerName }) {
  // Modus: "existing" (nur DB-Profile), "new_clubs" (neue analysieren + vergleichen)
  const [mode, setMode] = useState("existing");

  // Neue Vereine eingeben
  const [clubInput, setClubInput] = useState("");
  const [selectedClubs, setSelectedClubs] = useState([]);

  // Liga-Modus
  const [leagueInput, setLeagueInput] = useState("");
  const [isFetchingLeague, setIsFetchingLeague] = useState(false);
  const [leagueClubs, setLeagueClubs] = useState([]);

  // Analyse-Status
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(""); // Fortschrittstext
  const [idealProfile, setIdealProfile] = useState(null);
  const [clubFitResults, setClubFitResults] = useState([]);
  const [totalClubs, setTotalClubs] = useState(0);
  const [message, setMessage] = useState(null);

  // Clubs hinzufügen
  const addClub = (name) => {
    const trimmed = name.trim();
    if (trimmed && !selectedClubs.includes(trimmed)) {
      setSelectedClubs(prev => [...prev, trimmed]);
    }
    setClubInput("");
  };
  const removeClub = (name) => setSelectedClubs(prev => prev.filter(c => c !== name));

  // Liga abrufen
  const fetchLeague = async () => {
    if (!leagueInput.trim()) return;
    setIsFetchingLeague(true);
    try {
      const res = await base44.functions.invoke('getLeagueClubs', { leagueName: leagueInput.trim() });
      if (res.data.success) {
        setLeagueClubs(res.data.clubs || []);
        setSelectedClubs(res.data.clubs || []);
        toast.success(`${res.data.clubs.length} Vereine aus ${res.data.league_name} geladen`);
      } else {
        toast.error("Liga konnte nicht geladen werden");
      }
    } catch {
      toast.error("Fehler beim Abrufen der Liga");
    } finally {
      setIsFetchingLeague(false);
    }
  };

  // Haupt-Analyse
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setIdealProfile(null);
    setClubFitResults([]);
    setMessage(null);

    try {
      if (mode === "existing") {
        // Nur bestehende DB-Profile vergleichen
        setAnalyzeStep("Erstelle Idealprofil & vergleiche mit gespeicherten Vereinsprofilen...");
        const response = await base44.functions.invoke('generatePlayerClubFit', { playerId });
        if (response.data.success) {
          setIdealProfile(response.data.idealProfile);
          setClubFitResults(response.data.clubFitResults || []);
          setTotalClubs(response.data.totalClubsAnalyzed || 0);
          setMessage(response.data.message || null);
          const count = (response.data.clubFitResults || []).length;
          if (count > 0) toast.success(`${count} Vereine analysiert`);
          else toast.info('Idealprofil erstellt – keine Club-Profile in DB gefunden');
        } else {
          toast.error("Analyse fehlgeschlagen");
        }
      } else {
        // Neue Vereine analysieren: erst alle Club-Profile via analyzeClub erstellen, dann Fit berechnen
        if (selectedClubs.length === 0) {
          toast.error("Bitte mindestens einen Verein eingeben");
          setIsAnalyzing(false);
          return;
        }

        // Schritt 1: Alle Clubs analysieren (sequentiell, um Rate-Limits zu vermeiden)
        const savedProfiles = [];
        for (let i = 0; i < selectedClubs.length; i++) {
          const clubName = selectedClubs[i];
          setAnalyzeStep(`Analysiere Verein ${i + 1}/${selectedClubs.length}: ${clubName}...`);
          try {
            const res = await base44.functions.invoke('analyzeClub', { clubName });
            if (res.data.success) {
              savedProfiles.push({ club_name: clubName, ...res.data.clubProfile });
            }
          } catch {
            // Einzelne Fehler überspringen
          }
        }

        if (savedProfiles.length === 0) {
          toast.error("Keine Vereinsprofile konnten erstellt werden");
          setIsAnalyzing(false);
          return;
        }

        toast.success(`${savedProfiles.length} Vereinsprofile gespeichert – starte Fit-Analyse...`);

        // Schritt 2: Fit-Analyse mit den neu gespeicherten Profilen
        setAnalyzeStep("Erstelle Spieler-Idealprofil & berechne Fit-Scores...");
        const fitRes = await base44.functions.invoke('generatePlayerClubFit', { playerId });
        if (fitRes.data.success) {
          setIdealProfile(fitRes.data.idealProfile);
          // Filtere Ergebnisse auf die neu analysierten Vereine
          const newClubNames = savedProfiles.map(p => p.club_name.toLowerCase());
          const allResults = fitRes.data.clubFitResults || [];
          const relevantResults = allResults.filter(r =>
            newClubNames.some(n => r.club_name.toLowerCase().includes(n) || n.includes(r.club_name.toLowerCase()))
          );
          setClubFitResults(relevantResults.length > 0 ? relevantResults : allResults);
          setTotalClubs(savedProfiles.length);
          toast.success(`Analyse abgeschlossen! ${savedProfiles.length} Vereine profiliert & verglichen.`);
        } else {
          toast.error("Fit-Analyse fehlgeschlagen");
        }
      }
    } catch (error) {
      toast.error("Fehler bei der Analyse");
    } finally {
      setIsAnalyzing(false);
      setAnalyzeStep("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Modus-Auswahl */}
      <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
            <Target className="w-5 h-5" />
            Club-Fit Analyse
          </CardTitle>
          <CardDescription className="text-purple-700 dark:text-purple-400">
            Finde das beste taktische Club-Umfeld für {playerName}. Vergleiche mit gespeicherten Profilen oder analysiere neue Vereine direkt hier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Modus-Toggle */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={mode === "existing" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("existing")}
            >
              <Building2 className="w-4 h-4 mr-1" />
              Gespeicherte Profile
            </Button>
            <Button
              variant={mode === "new_clubs" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("new_clubs")}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Neue Vereine analysieren
            </Button>
          </div>

          {/* Modus: Neue Vereine */}
          {mode === "new_clubs" && (
            <div className="space-y-4 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
              {/* Einzelne Vereine */}
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Vereine eingeben</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Vereinsname eingeben..."
                    value={clubInput}
                    onChange={e => setClubInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addClub(clubInput)}
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => addClub(clubInput)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedClubs.map(club => (
                    <Badge
                      key={club}
                      className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 gap-1 cursor-pointer pr-1"
                      onClick={() => removeClub(club)}
                    >
                      {club} <X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Liga-Import */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Ganze Liga laden
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="z.B. Bundesliga, Premier League, Serie A..."
                    value={leagueInput}
                    onChange={e => setLeagueInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchLeague()}
                    className="text-sm"
                    list="league-suggestions"
                  />
                  <datalist id="league-suggestions">
                    {POPULAR_LEAGUES.map(l => <option key={l} value={l} />)}
                  </datalist>
                  <Button size="sm" variant="outline" onClick={fetchLeague} disabled={isFetchingLeague}>
                    {isFetchingLeague ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Lädt alle Vereine der Liga automatisch in die Liste oben
                </p>
              </div>

              {selectedClubs.length > 0 && (
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                  <span><strong>{selectedClubs.length}</strong> Vereine ausgewählt</span>
                  <Button variant="ghost" size="sm" className="text-red-500 h-7 text-xs" onClick={() => setSelectedClubs([])}>
                    Alle entfernen
                  </Button>
                </div>
              )}

              <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                ⚡ Jeder Verein wird via KI analysiert & als Vereinsprofil gespeichert. Bei vielen Vereinen kann das mehrere Minuten dauern.
              </div>
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {isAnalyzing
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysiere...</>
              : <><Sparkles className="w-4 h-4 mr-2" />Analyse starten</>
            }
          </Button>

          {isAnalyzing && analyzeStep && (
            <p className="text-sm text-purple-600 dark:text-purple-400">{analyzeStep}</p>
          )}
        </CardContent>
      </Card>

      {/* Hinweis: keine Profile */}
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
              Wechsle zu <span className="font-semibold">"Neue Vereine analysieren"</span> oder erstelle Profile über die{" "}
              <Link to={createPageUrl("ClubAnalysis")} className="text-blue-600 underline">KI-Vereinsanalyse</Link>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}