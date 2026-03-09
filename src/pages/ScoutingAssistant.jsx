import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import {
  Sparkles, Loader2, RefreshCw, ChevronRight, CheckCircle2, AlertTriangle,
  TrendingUp, User, Euro, Target, Shield, ThumbsUp, ThumbsDown, GitCompare,
  X, Building2, Search
} from "lucide-react";
import PlayerCompareModal from "@/components/scouting/PlayerCompareModal";

const POSITIONS = [
  { group: "Torwart", items: ["Torwart"] },
  { group: "Verteidigung", items: ["Innenverteidiger", "Außenverteidiger", "Linker Außenverteidiger", "Rechter Außenverteidiger"] },
  { group: "Mittelfeld", items: ["Defensives Mittelfeld", "Zentrales Mittelfeld", "Linkes Mittelfeld", "Rechtes Mittelfeld", "Offensives Mittelfeld"] },
  { group: "Angriff", items: ["Flügelspieler", "Linksaußen", "Rechtsaußen", "Stürmer"] },
];

const recommendationConfig = {
  sehr_empfehlenswert: { label: "Sehr empfehlenswert", color: "bg-green-100 text-green-800 border-green-300", stars: "⭐⭐⭐" },
  empfehlenswert: { label: "Empfehlenswert", color: "bg-blue-100 text-blue-800 border-blue-300", stars: "⭐⭐" },
  bedingt_empfehlenswert: { label: "Bedingt empfehlenswert", color: "bg-yellow-100 text-yellow-800 border-yellow-300", stars: "⭐" },
  beobachten: { label: "Beobachten", color: "bg-slate-100 text-slate-700 border-slate-300", stars: "👁" },
};

const difficultyConfig = {
  einfach: { label: "Einfach", color: "bg-green-100 text-green-800" },
  mittel: { label: "Mittel", color: "bg-yellow-100 text-yellow-800" },
  schwierig: { label: "Schwierig", color: "bg-orange-100 text-orange-800" },
  sehr_schwierig: { label: "Sehr schwierig", color: "bg-red-100 text-red-800" },
};

// Searchable request picker component
function RequestSearchPicker({ clubRequests, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = clubRequests
    .filter(r => r.status === "offen" || r.status === "in_bearbeitung")
    .filter(r =>
      !query ||
      r.club_name?.toLowerCase().includes(query.toLowerCase()) ||
      r.position_needed?.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          placeholder="Verein suchen..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="pl-8 text-sm"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {filtered.map(r => (
            <button
              key={r.id}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
              onMouseDown={() => {
                onSelect(r);
                setQuery("");
                setOpen(false);
              }}
            >
              <p className="text-sm font-semibold text-slate-800">{r.club_name}</p>
              <p className="text-xs text-slate-500">{r.position_needed} • {r.league || r.country || "–"}</p>
            </button>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs text-slate-400 text-center">
          Keine Anfragen gefunden
        </div>
      )}
    </div>
  );
}

export default function ScoutingAssistant() {
  const [profile, setProfile] = useState({
    club_name: "",
    position: "",
    age_min: "",
    age_max: "",
    budget_max: "",
    loan_fee_max: "",
    transfer_type: "kauf",
    preferred_leagues: "",
    special_requirements: "",
    free_context: "",
  });
  const [linkedRequest, setLinkedRequest] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({}); // { playerId: "up" | "down" }
  const [compareIds, setCompareIds] = useState([]); // up to 3 player IDs for comparison
  const [showCompare, setShowCompare] = useState(false);

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: scoutingReports = [] } = useQuery({
    queryKey: ["scoutingReports"],
    queryFn: () => base44.entities.ScoutingReport.list("-report_date", 200),
  });

  const { data: careerStats = [] } = useQuery({
    queryKey: ["careerStats"],
    queryFn: () => base44.entities.PlayerCareerStat.list("-season", 300),
  });

  const { data: clubRequests = [] } = useQuery({
    queryKey: ["clubRequests"],
    queryFn: () => base44.entities.ClubRequest.list(),
  });

  const handleImportRequest = (req) => {
    setLinkedRequest(req);
    setProfile(prev => ({
      ...prev,
      club_name: req.club_name || prev.club_name,
      position: req.position_needed || prev.position,
      age_min: req.age_min?.toString() || prev.age_min,
      age_max: req.age_max?.toString() || prev.age_max,
      budget_max: req.budget_max?.toString() || prev.budget_max,
      loan_fee_max: req.loan_fee_budget?.toString() || prev.loan_fee_max,
      transfer_type: req.transfer_types?.[0] || prev.transfer_type,
      preferred_leagues: req.league ? `${req.league}${req.country ? ", " + req.country : ""}` : prev.preferred_leagues,
      special_requirements: req.requirements || prev.special_requirements,
    }));
  };

  const toggleCompare = (playerId) => {
    setCompareIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : prev.length < 3 ? [...prev, playerId] : prev
    );
  };

  const runScouting = async () => {
    setIsLoading(true);
    setResult(null);
    setFeedback({});
    setCompareIds([]);

    const activePlayers = players.filter(p => !p.archive_id);

    const enrichedPlayers = activePlayers.map(p => {
      const age = p.date_of_birth
        ? Math.floor((new Date() - new Date(p.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
        : p.age;

      const reports = scoutingReports
        .filter(r => r.player_id === p.id)
        .slice(0, 2)
        .map(r => ({
          date: r.report_date,
          scout: r.scout_name,
          overall: r.overall_rating,
          recommendation: r.recommendation,
          strengths: r.strengths,
          weaknesses: r.weaknesses,
          potential: r.potential,
        }));

      const stats = careerStats
        .filter(s => s.player_id === p.id)
        .slice(0, 2)
        .map(s => ({
          season: s.season,
          club: s.club,
          competition: s.competition,
          appearances: s.appearances,
          goals: s.goals,
          assists: s.assists,
          minutes: s.minutes_played,
          clean_sheets: s.clean_sheets,
        }));

      return {
        id: p.id,
        name: p.name,
        age,
        nationality: p.nationality,
        position: p.position,
        secondary_positions: p.secondary_positions || [],
        current_club: p.current_club,
        market_value_eur: p.market_value,
        contract_until: p.contract_until,
        category: p.category,
        status: p.status,
        current_form: p.current_form,
        strengths: p.strengths,
        foot: p.foot,
        height_cm: p.height,
        speed: p.speed_rating,
        strength: p.strength_rating,
        stamina: p.stamina_rating,
        agility: p.agility_rating,
        personality_traits: p.personality_traits || [],
        scouting_reports: reports,
        recent_stats: stats,
      };
    });

    const openRequests = clubRequests
      .filter(r => r.status === "offen" || r.status === "in_bearbeitung")
      .slice(0, 10)
      .map(r => ({
        club: r.club_name,
        position: r.position_needed,
        budget_max: r.budget_max,
        age_range: `${r.age_min || "?"}-${r.age_max || "?"}`,
        transfer_type: (r.transfer_types || []).join(", "),
      }));

    const prompt = `Du bist ein erstklassiger KI-Fußball-Scout und Transferexperte. Analysiere die bereitgestellten Spielerdaten, Scoutingberichte und Karrierestatistiken und erstelle eine detaillierte Transferempfehlung.

SUCHPROFIL:
- Anfragender Verein: ${profile.club_name || "Nicht angegeben"}
- Gesuchte Position: ${profile.position || "Flexibel"}
- Altersbereich: ${profile.age_min || "?"} - ${profile.age_max || "?"} Jahre
- Max. Transferbudget: ${profile.budget_max ? `${(parseFloat(profile.budget_max)/1000000).toFixed(1)}M €` : "Nicht angegeben"}
- Max. Leihgebühr: ${profile.loan_fee_max ? `${(parseFloat(profile.loan_fee_max)/1000).toFixed(0)}k €` : "Nicht angegeben"}
- Transferart: ${profile.transfer_type}
- Bevorzugte Ligen/Länder: ${profile.preferred_leagues || "Keine Präferenz"}
- Spezielle Anforderungen: ${profile.special_requirements || "Keine"}
${profile.free_context ? `\nZUSÄTZLICHER KONTEXT (sehr wichtig, unbedingt berücksichtigen):\n${profile.free_context}` : ""}
${linkedRequest ? `\nVERKNÜPFTE VEREINSANFRAGE (Originalanfrage aus dem System):
- Liga: ${linkedRequest.league || "-"}
- Land: ${linkedRequest.country || "-"}
- Priorität: ${linkedRequest.priority || "-"}
- Anforderungen: ${linkedRequest.requirements || "-"}` : ""}

VERFÜGBARE SPIELER MIT PROFILEN (${enrichedPlayers.length} Spieler):
${JSON.stringify(enrichedPlayers.slice(0, 30), null, 2)}

AKTUELLE OFFENE VEREINSANFRAGEN IM SYSTEM:
${JSON.stringify(openRequests, null, 2)}

Deine Aufgabe:
1. Identifiziere die TOP 6 geeignetsten Spieler für das Suchprofil
2. Berücksichtige Position (Haupt- und Nebenposition), Alter, Marktwert, Scoutingberichte, Karrierestatistiken, aktuelle Form, Persönlichkeitsmerkmale
3. Berechne für jeden Spieler eine realistische finanzielle Gesamtübersicht (Ablöse + geschätztes Jahresgehalt + Gesamtkosten über 3 Jahre)
4. Wenn freier Kontext angegeben wurde, priorisiere diesen bei der Bewertung
5. Gib konkrete, handlungsrelevante Empfehlungen

Antworte ausschließlich im vorgegebenen JSON-Format.`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          market_assessment: { type: "string" },
          market_difficulty: { type: "string", enum: ["einfach", "mittel", "schwierig", "sehr_schwierig"] },
          search_summary: { type: "string" },
          top_targets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                player_id: { type: "string" },
                player_name: { type: "string" },
                current_club: { type: "string" },
                age: { type: "number" },
                position: { type: "string" },
                recommendation: { type: "string", enum: ["sehr_empfehlenswert", "empfehlenswert", "bedingt_empfehlenswert", "beobachten"] },
                fit_score: { type: "number", minimum: 0, maximum: 100 },
                profile_match: {
                  type: "object",
                  properties: {
                    position_fit: { type: "string", enum: ["perfekt", "gut", "akzeptabel"] },
                    age_fit: { type: "string", enum: ["perfekt", "gut", "akzeptabel", "außerhalb"] },
                    budget_fit: { type: "string", enum: ["im_budget", "grenzwertig", "über_budget", "unbekannt"] }
                  }
                },
                why_suitable: { type: "string" },
                key_strengths: { type: "array", items: { type: "string" } },
                concerns: { type: "array", items: { type: "string" } },
                scout_insight: { type: "string" },
                transfer_approach: { type: "string" },
                estimated_fee: { type: "string" },
                estimated_annual_salary: { type: "string", description: "Geschätztes Jahresgehalt (z.B. '350k €/Jahr')" },
                estimated_total_cost_3yr: { type: "string", description: "Gesamtkosten über 3 Jahre (Ablöse + Gehalt)" },
              }
            }
          },
          alternative_approach: { type: "string" },
          scout_recommendations: { type: "array", items: { type: "string" } }
        }
      }
    });

    setResult(aiResult);
    setIsLoading(false);
  };

  const compareTargets = result?.top_targets?.filter(t => compareIds.includes(t.player_id)) || [];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">KI Scouting Assistant</h1>
            <p className="text-slate-500 text-sm">Analysiert Spielerprofile, Scoutingberichte und Statistiken für optimale Transferempfehlungen</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-slate-200 bg-white sticky top-4">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-700" />
                  Suchprofil definieren
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">

                {/* Import from existing request */}
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-purple-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Aus vorhandener Anfrage importieren
                  </p>
                  <RequestSearchPicker clubRequests={clubRequests} onSelect={handleImportRequest} />
                  {linkedRequest && (
                    <div className="flex items-center justify-between bg-white border border-purple-200 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-purple-900">{linkedRequest.club_name}</p>
                        <p className="text-xs text-purple-600">{linkedRequest.position_needed}</p>
                      </div>
                      <button onClick={() => setLinkedRequest(null)} className="text-purple-400 hover:text-purple-700">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Anfragender Verein</Label>
                  <Input
                    placeholder="z.B. FC Augsburg"
                    value={profile.club_name}
                    onChange={e => setProfile({ ...profile, club_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Gesuchte Position <span className="text-red-500">*</span></Label>
                  <Select value={profile.position} onValueChange={v => setProfile({ ...profile, position: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Position wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map(group => (
                        <SelectGroup key={group.group}>
                          <SelectLabel>{group.group}</SelectLabel>
                          {group.items.map(pos => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Alter min.</Label>
                    <Input type="number" placeholder="z.B. 18" value={profile.age_min} onChange={e => setProfile({ ...profile, age_min: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Alter max.</Label>
                    <Input type="number" placeholder="z.B. 28" value={profile.age_max} onChange={e => setProfile({ ...profile, age_max: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Transferart</Label>
                  <Select value={profile.transfer_type} onValueChange={v => setProfile({ ...profile, transfer_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kauf">Kauf</SelectItem>
                      <SelectItem value="leihe">Leihe</SelectItem>
                      <SelectItem value="leihe_mit_kaufoption">Leihe mit Kaufoption</SelectItem>
                      <SelectItem value="ablösefrei">Ablösefrei</SelectItem>
                      <SelectItem value="alle">Alle Optionen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1">
                    <Euro className="w-3 h-3" /> Max. Transferbudget (€)
                  </Label>
                  <Input type="number" placeholder="z.B. 5000000" value={profile.budget_max} onChange={e => setProfile({ ...profile, budget_max: e.target.value })} />
                </div>

                {(profile.transfer_type === "leihe" || profile.transfer_type === "leihe_mit_kaufoption") && (
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Max. Leihgebühr (€)</Label>
                    <Input type="number" placeholder="z.B. 500000" value={profile.loan_fee_max} onChange={e => setProfile({ ...profile, loan_fee_max: e.target.value })} />
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Bevorzugte Ligen / Länder</Label>
                  <Input placeholder="z.B. Bundesliga, 2. Liga, Österreich" value={profile.preferred_leagues} onChange={e => setProfile({ ...profile, preferred_leagues: e.target.value })} />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Spezielle Anforderungen</Label>
                  <Textarea
                    placeholder="z.B. Linksfuß, starke Zweikampfwerte, Führungsspieler, EU-Pass..."
                    value={profile.special_requirements}
                    onChange={e => setProfile({ ...profile, special_requirements: e.target.value })}
                    className="h-16 text-sm"
                  />
                </div>

                {/* Free context field */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                  <Label className="text-xs font-semibold text-amber-800 block flex items-center gap-1.5">
                    ✍️ Freier Zusatz-Kontext (KI berücksichtigt dies bevorzugt)
                  </Label>
                  <Textarea
                    placeholder="z.B. Der Spieler soll taktisch flexibel sein und gut in ein pressingintensives System passen. Erfahrung in englischen Ligen wäre von Vorteil. Wir suchen jemanden mit Ausstrahlung im Umkleideraum..."
                    value={profile.free_context}
                    onChange={e => setProfile({ ...profile, free_context: e.target.value })}
                    className="h-24 text-sm bg-white"
                  />
                  <p className="text-xs text-amber-700">Dieser Text wird zusätzlich zu allen anderen Profilfeldern ausgewertet.</p>
                </div>

                {/* Data summary */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 space-y-1">
                  <p className="font-medium text-slate-700">Datenbasis für Analyse:</p>
                  <p>👤 {players.filter(p => !p.archive_id).length} aktive Spieler</p>
                  <p>📋 {scoutingReports.length} Scoutingberichte</p>
                  <p>📊 {careerStats.length} Karrierestatistiken</p>
                </div>

                <Button
                  onClick={runScouting}
                  disabled={!profile.position || isLoading}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysiere...</>
                  ) : result ? (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Neu analysieren</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> KI-Analyse starten</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2 space-y-4">
            {isLoading && (
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-8 h-8 text-purple-700 animate-spin" />
                  </div>
                  <p className="font-semibold text-slate-800 text-lg">KI analysiert Spielerdaten...</p>
                  <p className="text-slate-500 text-sm mt-2">Scoutingberichte, Karrierestatistiken und Spielerprofile werden ausgewertet</p>
                  <p className="text-slate-400 text-xs mt-1">Das dauert ca. 15–30 Sekunden</p>
                </CardContent>
              </Card>
            )}

            {!result && !isLoading && (
              <Card className="border-dashed border-2 border-slate-200 bg-white">
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="font-semibold text-slate-600">Suchprofil eingeben und KI-Analyse starten</p>
                  <p className="text-slate-400 text-sm mt-2">Die KI analysiert alle Spieler im System und gibt personalisierte Transferempfehlungen</p>
                </CardContent>
              </Card>
            )}

            {result && !isLoading && (
              <>
                {/* Market Overview */}
                <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-indigo-700" />
                          <span className="font-semibold text-slate-800">Markteinschätzung</span>
                          {result.market_difficulty && (
                            <Badge className={`${difficultyConfig[result.market_difficulty]?.color} border-0 text-xs`}>
                              {difficultyConfig[result.market_difficulty]?.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{result.market_assessment}</p>
                        {result.search_summary && (
                          <p className="text-xs text-slate-500 mt-2 italic">{result.search_summary}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Compare bar */}
                {compareIds.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800 font-medium">
                      {compareIds.length} Spieler ausgewählt zum Vergleich
                      {compareIds.length < 2 && <span className="text-purple-500 ml-1">(mindestens 2 wählen)</span>}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCompareIds([])}
                        className="text-xs text-purple-700 border-purple-300"
                      >
                        <X className="w-3 h-3 mr-1" /> Reset
                      </Button>
                      <Button
                        size="sm"
                        disabled={compareIds.length < 2}
                        onClick={() => setShowCompare(true)}
                        className="text-xs bg-purple-700 hover:bg-purple-800 text-white"
                      >
                        <GitCompare className="w-3 h-3 mr-1" /> Vergleichen
                      </Button>
                    </div>
                  </div>
                )}

                {/* Top Targets */}
                <div className="space-y-3">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-700" />
                    Top Transfer-Targets ({result.top_targets?.length})
                    <span className="text-xs font-normal text-slate-400 ml-1">— bis zu 3 für Vergleich auswählen</span>
                  </h2>

                  {result.top_targets?.map((target, idx) => {
                    const cfg = recommendationConfig[target.recommendation] || recommendationConfig.empfehlenswert;
                    const budgetColor = {
                      im_budget: "text-green-700 bg-green-50",
                      grenzwertig: "text-yellow-700 bg-yellow-50",
                      über_budget: "text-red-700 bg-red-50",
                      unbekannt: "text-slate-500 bg-slate-50"
                    }[target.profile_match?.budget_fit] || "text-slate-500 bg-slate-50";

                    const isCompared = compareIds.includes(target.player_id);
                    const myFeedback = feedback[target.player_id];

                    return (
                      <Card
                        key={target.player_id || idx}
                        className={`border-slate-200 bg-white overflow-hidden transition-all ${isCompared ? "ring-2 ring-purple-400" : ""}`}
                      >
                        <CardContent className="p-0">
                          <div className="flex items-stretch">
                            {/* Rank strip */}
                            <div className="w-14 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col items-center justify-center shrink-0 py-4 gap-1">
                              <span className="text-white font-black text-xl leading-none">{idx + 1}</span>
                              <span className="text-slate-400 text-xs">{target.fit_score}%</span>
                            </div>

                            <div className="flex-1 p-4 space-y-3">
                              {/* Header */}
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-slate-900 text-lg">{target.player_name}</h3>
                                    <Badge className={`${cfg.color} border text-xs`}>
                                      {cfg.stars} {cfg.label}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-500 mt-0.5">
                                    {target.position} • {target.current_club} • {target.age} Jahre
                                  </p>
                                </div>
                                {/* Actions: compare + feedback */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => toggleCompare(target.player_id)}
                                    title="Zum Vergleich hinzufügen"
                                    className={`p-1.5 rounded-lg border transition-colors ${isCompared ? "bg-purple-100 border-purple-300 text-purple-700" : "border-slate-200 text-slate-400 hover:border-purple-300 hover:text-purple-600"}`}
                                  >
                                    <GitCompare className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setFeedback(f => ({ ...f, [target.player_id]: f[target.player_id] === "up" ? null : "up" }))}
                                    className={`p-1.5 rounded-lg border transition-colors ${myFeedback === "up" ? "bg-green-100 border-green-300 text-green-700" : "border-slate-200 text-slate-400 hover:text-green-600"}`}
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setFeedback(f => ({ ...f, [target.player_id]: f[target.player_id] === "down" ? null : "down" }))}
                                    className={`p-1.5 rounded-lg border transition-colors ${myFeedback === "down" ? "bg-red-100 border-red-300 text-red-700" : "border-slate-200 text-slate-400 hover:text-red-600"}`}
                                  >
                                    <ThumbsDown className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Profile match badges */}
                              {target.profile_match && (
                                <div className="flex flex-wrap gap-2">
                                  {target.profile_match.position_fit && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${target.profile_match.position_fit === "perfekt" ? "bg-green-50 text-green-700" : target.profile_match.position_fit === "gut" ? "bg-blue-50 text-blue-700" : "bg-yellow-50 text-yellow-700"}`}>
                                      📍 Position: {target.profile_match.position_fit}
                                    </span>
                                  )}
                                  {target.profile_match.age_fit && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${target.profile_match.age_fit === "perfekt" ? "bg-green-50 text-green-700" : target.profile_match.age_fit === "gut" ? "bg-blue-50 text-blue-700" : "bg-yellow-50 text-yellow-700"}`}>
                                      👤 Alter: {target.profile_match.age_fit}
                                    </span>
                                  )}
                                  {target.profile_match.budget_fit && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${budgetColor}`}>
                                      💶 Budget: {target.profile_match.budget_fit.replace("_", " ")}
                                    </span>
                                  )}
                                </div>
                              )}

                              <p className="text-sm text-slate-700 leading-relaxed">{target.why_suitable}</p>

                              {/* Strengths & Concerns */}
                              <div className="grid md:grid-cols-2 gap-3">
                                {target.key_strengths?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Stärken
                                    </p>
                                    <ul className="space-y-1">
                                      {target.key_strengths.map((s, i) => (
                                        <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                          <span className="text-green-500 mt-0.5 shrink-0">✓</span> {s}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {target.concerns?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5" /> Bedenken
                                    </p>
                                    <ul className="space-y-1">
                                      {target.concerns.map((c, i) => (
                                        <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                          <span className="text-red-400 mt-0.5 shrink-0">!</span> {c}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>

                              {/* Financial overview */}
                              {(target.estimated_fee || target.estimated_annual_salary || target.estimated_total_cost_3yr) && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                                    <Euro className="w-3 h-3" /> Finanzielle Gesamtübersicht
                                  </p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {target.estimated_fee && (
                                      <div className="text-center">
                                        <p className="text-xs text-slate-500">Ablöse</p>
                                        <p className="text-xs font-bold text-slate-800">{target.estimated_fee}</p>
                                      </div>
                                    )}
                                    {target.estimated_annual_salary && (
                                      <div className="text-center">
                                        <p className="text-xs text-slate-500">Jahresgehalt</p>
                                        <p className="text-xs font-bold text-slate-800">{target.estimated_annual_salary}</p>
                                      </div>
                                    )}
                                    {target.estimated_total_cost_3yr && (
                                      <div className="text-center bg-purple-50 rounded-lg p-1.5">
                                        <p className="text-xs text-purple-600">Gesamt (3 J.)</p>
                                        <p className="text-xs font-bold text-purple-800">{target.estimated_total_cost_3yr}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Scout Insight */}
                              {target.scout_insight && (
                                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                                  <p className="text-xs text-blue-800 flex items-start gap-1.5">
                                    <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
                                    <span><strong>Scout-Insight:</strong> {target.scout_insight}</span>
                                  </p>
                                </div>
                              )}

                              {/* Transfer approach */}
                              {target.transfer_approach && (
                                <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                                  <p className="text-xs text-purple-800 flex items-start gap-1.5">
                                    <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span><strong>Empfohlenes Vorgehen:</strong> {target.transfer_approach}</span>
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

                {/* Alternative Approach */}
                {result.alternative_approach && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                      <p className="text-sm text-amber-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <span><strong>Alternativer Ansatz:</strong> {result.alternative_approach}</span>
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Scout Recommendations */}
                {result.scout_recommendations?.length > 0 && (
                  <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-600" />
                        Strategische Empfehlungen für den Scouting-Prozess
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <ul className="space-y-2">
                        {result.scout_recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                            <span className="font-bold text-purple-700 shrink-0">{i + 1}.</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Compare Modal */}
      {showCompare && compareTargets.length >= 2 && (
        <PlayerCompareModal
          targets={compareTargets}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}