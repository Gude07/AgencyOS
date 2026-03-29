import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { jsPDF } from "jspdf";
import { saveAnalysisDocument, buildClubFitHtml } from "@/utils/saveAnalysisDocument";
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

  // Filter für gespeicherte Profile
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [filteredClubIds, setFilteredClubIds] = useState([]); // leer = alle
  const [leagueFilter, setLeagueFilter] = useState("");
  const [clubSearchFilter, setClubSearchFilter] = useState("");

  // Neue Vereine eingeben
  const [clubInput, setClubInput] = useState("");
  const [selectedClubs, setSelectedClubs] = useState([]);

  // Liga-Modus (neue Vereine)
  const [leagueInput, setLeagueInput] = useState("");
  const [isFetchingLeague, setIsFetchingLeague] = useState(false);
  const [leagueClubs, setLeagueClubs] = useState([]);

  // Analyse-Ergebnisse
  const [idealProfile, setIdealProfile] = useState(null);
  const [clubFitResults, setClubFitResults] = useState([]);
  const [totalClubs, setTotalClubs] = useState(0);
  const [message, setMessage] = useState(null);

  // Analyse-Status
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(""); // Fortschrittstext

  // Gespeicherte Profile laden
  React.useEffect(() => {
    base44.entities.ClubProfile.list().then(profiles => {
      setSavedProfiles(Array.isArray(profiles) ? profiles : []);
    }).catch(() => {});
  }, []);

  // Eindeutige Ligen aus gespeicherten Profilen
  const availableLeagues = React.useMemo(() => {
    const leagues = savedProfiles.map(p => p.league).filter(Boolean);
    return [...new Set(leagues)].sort();
  }, [savedProfiles]);

  // Gefilterte Profile für Anzeige
  const displayedSavedProfiles = React.useMemo(() => {
    return savedProfiles.filter(p => {
      const leagueMatch = !leagueFilter || p.league === leagueFilter;
      const nameMatch = !clubSearchFilter || p.club_name?.toLowerCase().includes(clubSearchFilter.toLowerCase());
      return leagueMatch && nameMatch;
    });
  }, [savedProfiles, leagueFilter, clubSearchFilter]);

  const toggleClubFilter = (id) => {
    setFilteredClubIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllDisplayed = () => setFilteredClubIds(displayedSavedProfiles.map(p => p.id));
  const clearSelection = () => setFilteredClubIds([]);

  // Clubs hinzufügen
  const addClub = (name) => {
    const trimmed = name.trim();
    if (trimmed && !selectedClubs.includes(trimmed)) {
      setSelectedClubs(prev => [...prev, trimmed]);
    }
    setClubInput("");
  };
  const removeClub = (name) => setSelectedClubs(prev => prev.filter(c => c !== name));

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = 20;

    const checkPage = (needed = 10) => {
      if (y + needed > 280) { doc.addPage(); y = 20; }
    };

    // Header
    doc.setFillColor(88, 28, 220);
    doc.rect(0, 0, pageW, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Club-Fit Analyse: ${playerName}`, margin, 25);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')} | ${totalClubs} Vereine analysiert`, margin, 34);
    y = 55;
    doc.setTextColor(0, 0, 0);

    // Ideal Profile
    if (idealProfile) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(63, 63, 63);
      doc.text('Ideales Club-Profil', margin, y); y += 7;
      doc.setDrawColor(88, 28, 220);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + contentW, y); y += 5;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      if (idealProfile.player_summary) {
        const lines = doc.splitTextToSize(idealProfile.player_summary, contentW);
        checkPage(lines.length * 5);
        doc.text(lines, margin, y); y += lines.length * 5 + 4;
      }
      const fields = [
        ['Taktische Rolle', idealProfile.tactical_role],
        ['Idealer Spielstil', idealProfile.ideal_playing_style],
        ['Liganiveau', idealProfile.ideal_league_level],
        ['Entwicklungsumgebung', idealProfile.development_environment],
      ];
      fields.forEach(([label, val]) => {
        if (!val) return;
        checkPage(12);
        doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(val, contentW - 40);
        doc.text(lines, margin + 42, y); y += Math.max(lines.length * 5, 6) + 2;
      });
      y += 6;
    }

    // Club Fit Results
    clubFitResults.forEach((result, i) => {
      checkPage(30);
      const score = result.fit_score;
      const scoreColor = score >= 80 ? [34,197,94] : score >= 60 ? [59,130,246] : score >= 40 ? [234,179,8] : [239,68,68];

      // Club header bar
      doc.setFillColor(245, 245, 250);
      doc.rect(margin, y - 4, contentW, 14, 'F');
      doc.setFillColor(...scoreColor);
      doc.rect(margin, y - 4, 18, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${score}%`, margin + 1, y + 5);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.text(`#${i + 1}  ${result.club_name}`, margin + 22, y + 5);
      if (result.match_level) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(result.match_level, pageW - margin - doc.getTextWidth(result.match_level), y + 5);
      }
      y += 14;

      if (result.summary) {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(70, 70, 70);
        const lines = doc.splitTextToSize(result.summary, contentW);
        checkPage(lines.length * 5);
        doc.text(lines, margin, y); y += lines.length * 5 + 3;
      }

      const colW = (contentW - 5) / 2;
      const forItems = result.reasons_for || [];
      const againstItems = result.reasons_against || [];
      const maxRows = Math.max(forItems.length, againstItems.length);

      if (maxRows > 0) {
        checkPage(maxRows * 5 + 8);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(22, 163, 74);
        doc.text('+ Spricht dafür', margin, y);
        doc.setTextColor(220, 38, 38);
        doc.text('− Spricht dagegen', margin + colW + 5, y); y += 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
        forItems.forEach(r => {
          const lines = doc.splitTextToSize(`• ${r}`, colW);
          doc.text(lines, margin, y); y += lines.length * 4.5;
        });
        y -= forItems.length * 4.5;
        againstItems.forEach(r => {
          const lines = doc.splitTextToSize(`• ${r}`, colW);
          doc.text(lines, margin + colW + 5, y); y += lines.length * 4.5;
        });
        y += 4;
      }
      y += 6;
    });

    doc.save(`Club-Fit_${playerName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.pdf`);
  };

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
        const selectedCount = filteredClubIds.length;
        setAnalyzeStep(`KI erstellt Spieler-Idealprofil & vergleicht mit ${selectedCount > 0 ? selectedCount + ' ausgewählten' : 'allen gespeicherten'} Vereinsprofilen... (kann 1-2 Min. dauern)`);
        const response = await base44.functions.invoke('generatePlayerClubFit', {
          playerId,
          selectedClubIds: filteredClubIds.length > 0 ? filteredClubIds : undefined
        });
        const resData = response?.data || response;
        if (resData.success) {
          setIdealProfile(resData.idealProfile);
          const results = resData.clubFitResults || [];
          setClubFitResults(results);
          setTotalClubs(resData.totalClubsAnalyzed || results.length);
          setMessage(resData.message || null);
          const count = results.length;
          if (count > 0) {
            toast.success(`${count} Vereine analysiert`);
            try {
              await saveAnalysisDocument({
                title: `Club-Fit Analyse ${playerName} ${new Date().toLocaleDateString('de-DE')}`,
                analysisType: 'Club-Fit Analyse',
                entityType: 'Player',
                entityId: playerId,
                htmlBody: buildClubFitHtml(resData.idealProfile, results, playerName)
              });
            } catch (e) { console.warn('Auto-save failed:', e); }
          } else {
            toast.info('Idealprofil erstellt – keine Club-Profile in DB gefunden');
          }
        } else {
          toast.error("Analyse fehlgeschlagen: " + (resData.error || "Unbekannter Fehler"));
        }
        setIsAnalyzing(false);
        setAnalyzeStep("");
        return;
      }

      // Neue Vereine: Falls Liga eingegeben aber noch nicht geladen, jetzt laden
      let clubsToAnalyze = [...selectedClubs];
      if (clubsToAnalyze.length === 0 && leagueInput.trim()) {
        setAnalyzeStep(`Lade Vereine aus ${leagueInput.trim()}...`);
        try {
          const res = await base44.functions.invoke('getLeagueClubs', { leagueName: leagueInput.trim() });
          if (res.data.success && res.data.clubs?.length > 0) {
            clubsToAnalyze = res.data.clubs;
            setSelectedClubs(res.data.clubs);
            setLeagueClubs(res.data.clubs);
            toast.success(`${res.data.clubs.length} Vereine aus ${res.data.league_name || leagueInput} geladen`);
          } else {
            toast.error("Liga konnte nicht geladen werden");
            setIsAnalyzing(false);
            setAnalyzeStep("");
            return;
          }
        } catch {
          toast.error("Fehler beim Abrufen der Liga");
          setIsAnalyzing(false);
          setAnalyzeStep("");
          return;
        }
      }

      if (clubsToAnalyze.length === 0) {
        toast.error("Bitte mindestens einen Verein eingeben oder eine Liga laden");
        setIsAnalyzing(false);
        return;
      }

        // Schritt 1: Alle Clubs analysieren (sequentiell, um Rate-Limits zu vermeiden)
        const newlyCreated = [];
        for (let i = 0; i < clubsToAnalyze.length; i++) {
          const clubName = clubsToAnalyze[i];
          setAnalyzeStep(`Analysiere Verein ${i + 1}/${clubsToAnalyze.length}: ${clubName}...`);
          try {
            const res = await base44.functions.invoke('analyzeClub', { clubName });
            if (res.data.success) {
              newlyCreated.push({ club_name: clubName, ...res.data.clubProfile });
            }
          } catch {
            // Einzelne Fehler überspringen
          }
        }

        if (newlyCreated.length === 0) {
          toast.error("Keine Vereinsprofile konnten erstellt werden");
          setIsAnalyzing(false);
          return;
        }

        // Schritt 2: Fit-Analyse – alle gespeicherten Profile berücksichtigen (inkl. neue)
        setAnalyzeStep("Erstelle Spieler-Idealprofil & berechne Fit-Scores...");
        const fitRes = await base44.functions.invoke('generatePlayerClubFit', { playerId });
        if (fitRes.data.success) {
          setIdealProfile(fitRes.data.idealProfile);
          const allResults = fitRes.data.clubFitResults || [];
          setClubFitResults(allResults);
          setTotalClubs(allResults.length);
          toast.success(`Analyse abgeschlossen! ${newlyCreated.length} Vereine profiliert & verglichen.`);
          // Auto-save as document on player
          try {
            await saveAnalysisDocument({
              title: `Club-Fit Analyse ${playerName} ${new Date().toLocaleDateString('de-DE')}`,
              analysisType: 'Club-Fit Analyse',
              entityType: 'Player',
              entityId: playerId,
              htmlBody: buildClubFitHtml(fitRes.data.idealProfile, allResults, playerName)
            });
          } catch (e) { console.warn('Auto-save failed:', e); }
        } else {
          toast.error("Fit-Analyse fehlgeschlagen");
        }
    } catch (error) {
      console.error('handleAnalyze error:', error);
      toast.error("Fehler bei der Analyse: " + (error?.message || String(error)));
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

          {/* Modus: Gespeicherte Profile - Filter */}
          {mode === "existing" && savedProfiles.length > 0 && (
            <div className="space-y-3 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Clubs filtern <span className="font-normal text-slate-500">({filteredClubIds.length > 0 ? `${filteredClubIds.length} ausgewählt` : `alle ${savedProfiles.length} werden analysiert`})</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <Input
                    placeholder="Vereinsname suchen..."
                    value={clubSearchFilter}
                    onChange={e => setClubSearchFilter(e.target.value)}
                    className="text-sm h-8"
                  />
                </div>
                <select
                  value={leagueFilter}
                  onChange={e => setLeagueFilter(e.target.value)}
                  className="text-sm border border-slate-200 dark:border-slate-700 rounded-md px-2 h-8 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                >
                  <option value="">Alle Ligen</option>
                  {availableLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              {displayedSavedProfiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button onClick={selectAllDisplayed} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Alle anzeigten auswählen</button>
                    {filteredClubIds.length > 0 && <><span className="text-slate-300">|</span><button onClick={clearSelection} className="text-xs text-red-500 hover:underline">Auswahl löschen</button></>}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {displayedSavedProfiles.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={filteredClubIds.includes(p.id)}
                          onChange={() => toggleClubFilter(p.id)}
                          className="rounded"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{p.club_name}</span>
                        {p.league && <span className="text-xs text-slate-400 ml-1">{p.league}</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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

          {isAnalyzing && (
            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">Analyse läuft…</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">{analyzeStep}</p>
              </div>
            </div>
          )}

          {idealProfile && clubFitResults.length > 0 && (
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 rounded-lg px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
            >
              📄 Als PDF exportieren
            </button>
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