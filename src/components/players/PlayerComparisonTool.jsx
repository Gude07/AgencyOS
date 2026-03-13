import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  X, 
  Sparkles, 
  Users, 
  TrendingUp, 
  Calendar,
  DollarSign,
  MapPin,
  Activity,
  MessageSquare,
  FileText,
  Heart,
  Target,
  Award,
  User,
  Loader2
} from "lucide-react";
import { format, differenceInYears } from "date-fns";

export default function PlayerComparisonTool({ open, onOpenChange, initialPlayerIds = [] }) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(initialPlayerIds);
  const [requirement, setRequirement] = useState("");
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: playerStats = [] } = useQuery({
    queryKey: ['playerStats'],
    queryFn: () => base44.entities.PlayerStats.list(),
  });

  const { data: scoutingReports = [] } = useQuery({
    queryKey: ['scoutingReports'],
    queryFn: () => base44.entities.ScoutingReport.list(),
  });

  const { data: playerComments = [] } = useQuery({
    queryKey: ['playerComments'],
    queryFn: () => base44.entities.PlayerComment.list(),
  });

  const selectedPlayers = allPlayers.filter(p => selectedPlayerIds.includes(p.id));
  const availablePlayers = allPlayers.filter(p => !selectedPlayerIds.includes(p.id) && !p.archive_id);

  const addPlayer = (playerId) => {
    if (selectedPlayerIds.length < 5 && playerId) {
      setSelectedPlayerIds([...selectedPlayerIds, playerId]);
    }
  };

  const removePlayer = (playerId) => {
    setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== playerId));
    setAiRecommendation(null);
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    return differenceInYears(new Date(), new Date(dateOfBirth));
  };

  const getPlayerStats = (playerId) => {
    return playerStats.filter(s => s.player_id === playerId && s.source === 'api_football');
  };

  const getPlayerScoutingReports = (playerId) => {
    return scoutingReports.filter(s => s.player_id === playerId);
  };

  const getPlayerComments = (playerId) => {
    return playerComments.filter(c => c.player_id === playerId);
  };

  const generateAIRecommendation = async () => {
    if (selectedPlayers.length < 2) return;
    
    setIsGeneratingAI(true);
    try {
      const playersData = selectedPlayers.map(player => {
        const stats = getPlayerStats(player.id);
        const reports = getPlayerScoutingReports(player.id);
        const comments = getPlayerComments(player.id);
        
        return {
          name: player.name,
          age: calculateAge(player.date_of_birth),
          position: player.position,
          secondary_positions: player.secondary_positions || [],
          current_club: player.current_club,
          market_value: player.market_value,
          nationality: player.nationality,
          height: player.height,
          foot: player.foot,
          strengths: player.strengths,
          speed_rating: player.speed_rating,
          strength_rating: player.strength_rating,
          stamina_rating: player.stamina_rating,
          agility_rating: player.agility_rating,
          personality_traits: player.personality_traits || [],
          current_form: player.current_form,
          form_description: player.form_description,
          notes: player.notes,
          preferences: player.preferences,
          stats_count: stats.length,
          latest_stats: stats[0],
          scouting_reports_count: reports.length,
          avg_scouting_rating: reports.length > 0 ? (reports.reduce((sum, r) => sum + r.overall_rating, 0) / reports.length).toFixed(1) : null,
          comments_count: comments.length
        };
      });

      const prompt = `Du bist ein Experte für Spieler-Scouting im Profifußball. Analysiere die folgenden ${selectedPlayers.length} Spieler und gib eine detaillierte Empfehlung.

${requirement ? `GESUCHTE ANFORDERUNG: ${requirement}\n` : ''}

SPIELER-DATEN:
${JSON.stringify(playersData, null, 2)}

Erstelle eine professionelle Analyse mit folgender Struktur:

1. **Zusammenfassung**: Kurze Übersicht über jeden Spieler (2-3 Sätze pro Spieler)

2. **Vergleich der Schlüsselattribute**:
   - Technische Fähigkeiten
   - Physische Attribute
   - Mentale/Persönliche Eigenschaften
   - Aktuelle Form und Entwicklung

3. **Empfehlung**: 
   - Wer ist der beste Kandidat und warum?
   - Für welche Anforderung passt welcher Spieler am besten?
   - Risiken und Vorteile bei jedem Spieler

4. **Rangfolge**: Nummeriere die Spieler von 1 (beste Wahl) bis ${selectedPlayers.length}

Sei konkret, sachlich und fundiert. Nutze die verfügbaren Daten (Statistiken, Scouting-Reports, Form, etc.).`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        model: "claude_sonnet_4_6"
      });

      setAiRecommendation(response);
    } catch (error) {
      console.error("Fehler beim Generieren der KI-Empfehlung:", error);
      setAiRecommendation("Fehler beim Generieren der Empfehlung. Bitte versuchen Sie es erneut.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const ComparisonRow = ({ label, icon: Icon, getValue }) => (
    <tr className="border-b border-slate-200 hover:bg-slate-50">
      <td className="p-3 font-medium text-slate-700 sticky left-0 bg-white border-r border-slate-200">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-slate-500" />}
          {label}
        </div>
      </td>
      {selectedPlayers.map((player, idx) => (
        <td key={player.id} className={`p-3 text-slate-900 ${idx < selectedPlayers.length - 1 ? 'border-r border-slate-200' : ''}`}>
          {getValue(player)}
        </td>
      ))}
    </tr>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Spieler-Vergleich
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Player Selection */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {selectedPlayers.map(player => (
                    <Badge key={player.id} variant="secondary" className="pl-3 pr-2 py-1.5">
                      {player.name}
                      <button
                        onClick={() => removePlayer(player.id)}
                        className="ml-2 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {selectedPlayerIds.length < 5 && (
                  <Select onValueChange={addPlayer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Spieler hinzufügen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers.map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} - {player.position} ({player.current_club})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-slate-500">
                  {selectedPlayerIds.length}/5 Spieler ausgewählt
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Requirement Input */}
          {selectedPlayers.length >= 2 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <label className="text-sm font-medium text-slate-700">
                  Gesuchte Anforderung (optional)
                </label>
                <Textarea
                  placeholder="z.B. Schneller Flügelspieler für offensives Spiel, gute Technik, unter 25 Jahre..."
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  className="h-20"
                />
                <Button
                  onClick={generateAIRecommendation}
                  disabled={isGeneratingAI}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      KI-Analyse läuft...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      KI-Empfehlung generieren
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* AI Recommendation */}
          {aiRecommendation && (
            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader className="border-b border-purple-200">
                <CardTitle className="text-lg flex items-center gap-2 text-purple-900">
                  <Sparkles className="w-5 h-5" />
                  KI-Empfehlung
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                  {aiRecommendation}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparison Table */}
          {selectedPlayers.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detaillierter Vergleich</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-300">
                        <th className="p-3 text-left font-semibold sticky left-0 bg-slate-100 border-r border-slate-300">
                          Attribut
                        </th>
                        {selectedPlayers.map((player, idx) => (
                          <th key={player.id} className={`p-3 text-left font-semibold ${idx < selectedPlayers.length - 1 ? 'border-r border-slate-300' : ''}`}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {player.name}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Allgemeine Infos */}
                      <tr className="bg-slate-100">
                        <td colSpan={selectedPlayers.length + 1} className="p-2 font-bold text-slate-800">
                          Allgemeine Informationen
                        </td>
                      </tr>
                      <ComparisonRow
                        label="Alter"
                        icon={Calendar}
                        getValue={(p) => calculateAge(p.date_of_birth) ? `${calculateAge(p.date_of_birth)} Jahre` : '-'}
                      />
                      <ComparisonRow
                        label="Position"
                        icon={Target}
                        getValue={(p) => (
                          <div className="space-y-1">
                            <Badge className="bg-blue-600">{p.position}</Badge>
                            {p.secondary_positions?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.secondary_positions.map(pos => (
                                  <Badge key={pos} variant="outline" className="text-xs">
                                    {pos}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      />
                      <ComparisonRow
                        label="Aktueller Verein"
                        icon={Award}
                        getValue={(p) => p.current_club || '-'}
                      />
                      <ComparisonRow
                        label="Nationalität"
                        icon={MapPin}
                        getValue={(p) => p.nationality || '-'}
                      />
                      <ComparisonRow
                        label="Marktwert"
                        icon={DollarSign}
                        getValue={(p) => p.market_value ? `${(p.market_value / 1000000).toFixed(2)}M €` : '-'}
                      />
                      <ComparisonRow
                        label="Größe"
                        getValue={(p) => p.height ? `${p.height} cm` : '-'}
                      />
                      <ComparisonRow
                        label="Starker Fuß"
                        getValue={(p) => p.foot ? <span className="capitalize">{p.foot}</span> : '-'}
                      />
                      <ComparisonRow
                        label="Vertrag bis"
                        getValue={(p) => p.contract_until ? format(new Date(p.contract_until), "MM/yyyy") : '-'}
                      />

                      {/* Physische Attribute */}
                      <tr className="bg-slate-100">
                        <td colSpan={selectedPlayers.length + 1} className="p-2 font-bold text-slate-800">
                          Physische Attribute
                        </td>
                      </tr>
                      <ComparisonRow
                        label="⚡ Tempo"
                        getValue={(p) => p.speed_rating ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-700">{p.speed_rating}/10</span>
                            <div className="w-full bg-amber-100 rounded-full h-2">
                              <div className="bg-amber-500 h-2 rounded-full" style={{width: `${p.speed_rating * 10}%`}} />
                            </div>
                          </div>
                        ) : '-'}
                      />
                      <ComparisonRow
                        label="💪 Stärke"
                        getValue={(p) => p.strength_rating ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-red-700">{p.strength_rating}/10</span>
                            <div className="w-full bg-red-100 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full" style={{width: `${p.strength_rating * 10}%`}} />
                            </div>
                          </div>
                        ) : '-'}
                      />
                      <ComparisonRow
                        label="🏃 Ausdauer"
                        getValue={(p) => p.stamina_rating ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-700">{p.stamina_rating}/10</span>
                            <div className="w-full bg-green-100 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{width: `${p.stamina_rating * 10}%`}} />
                            </div>
                          </div>
                        ) : '-'}
                      />
                      <ComparisonRow
                        label="🤸 Agilität"
                        getValue={(p) => p.agility_rating ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-purple-700">{p.agility_rating}/10</span>
                            <div className="w-full bg-purple-100 rounded-full h-2">
                              <div className="bg-purple-500 h-2 rounded-full" style={{width: `${p.agility_rating * 10}%`}} />
                            </div>
                          </div>
                        ) : '-'}
                      />

                      {/* Form & Charakter */}
                      <tr className="bg-slate-100">
                        <td colSpan={selectedPlayers.length + 1} className="p-2 font-bold text-slate-800">
                          Aktuelle Form & Charakter
                        </td>
                      </tr>
                      <ComparisonRow
                        label="Aktuelle Form"
                        icon={TrendingUp}
                        getValue={(p) => p.current_form ? (
                          <div>
                            <Badge className={{
                              ausgezeichnet:'bg-green-600',
                              sehr_gut:'bg-green-500',
                              gut:'bg-blue-500',
                              befriedigend:'bg-yellow-500',
                              schwach:'bg-red-500'
                            }[p.current_form]}>
                              {({
                                ausgezeichnet:'⭐ Ausgezeichnet',
                                sehr_gut:'✅ Sehr gut',
                                gut:'👍 Gut',
                                befriedigend:'➖ Befriedigend',
                                schwach:'⬇️ Schwach'
                              })[p.current_form]}
                            </Badge>
                            {p.form_description && (
                              <p className="text-xs text-slate-600 mt-1">{p.form_description}</p>
                            )}
                          </div>
                        ) : '-'}
                      />
                      <ComparisonRow
                        label="Persönlichkeit"
                        getValue={(p) => p.personality_traits?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.personality_traits.map(trait => (
                              <Badge key={trait} variant="outline" className="text-xs">
                                {trait}
                              </Badge>
                            ))}
                          </div>
                        ) : '-'}
                      />

                      {/* Stärken & Notizen */}
                      <tr className="bg-slate-100">
                        <td colSpan={selectedPlayers.length + 1} className="p-2 font-bold text-slate-800">
                          Profil & Bewertungen
                        </td>
                      </tr>
                      <ComparisonRow
                        label="Stärken"
                        icon={Award}
                        getValue={(p) => p.strengths ? (
                          <p className="text-xs">{p.strengths}</p>
                        ) : '-'}
                      />
                      <ComparisonRow
                        label="Notizen"
                        icon={FileText}
                        getValue={(p) => p.notes ? (
                          <p className="text-xs">{p.notes.substring(0, 150)}{p.notes.length > 150 ? '...' : ''}</p>
                        ) : '-'}
                      />
                      <ComparisonRow
                        label="Scouting Reports"
                        getValue={(p) => {
                          const reports = getPlayerScoutingReports(p.id);
                          if (reports.length === 0) return '-';
                          const avgRating = (reports.reduce((sum, r) => sum + r.overall_rating, 0) / reports.length).toFixed(1);
                          return (
                            <div>
                              <Badge variant="outline">{reports.length} Berichte</Badge>
                              <p className="text-xs mt-1">⭐ Ø {avgRating}/10</p>
                            </div>
                          );
                        }}
                      />
                      <ComparisonRow
                        label="Kommentare"
                        icon={MessageSquare}
                        getValue={(p) => {
                          const comments = getPlayerComments(p.id);
                          return comments.length > 0 ? (
                            <Badge variant="outline">{comments.length} Kommentare</Badge>
                          ) : '-';
                        }}
                      />

                      {/* Statistiken */}
                      <tr className="bg-slate-100">
                        <td colSpan={selectedPlayers.length + 1} className="p-2 font-bold text-slate-800">
                          Statistiken (Aktuellste Saison)
                        </td>
                      </tr>
                      <ComparisonRow
                        label="Saison"
                        icon={Activity}
                        getValue={(p) => {
                          const stats = getPlayerStats(p.id);
                          return stats.length > 0 ? `${stats[0].season} - ${stats[0].competition}` : 'Keine Daten';
                        }}
                      />
                      <ComparisonRow
                        label="Einsätze"
                        getValue={(p) => {
                          const stats = getPlayerStats(p.id);
                          if (stats.length === 0 || stats[0].data_status === 'no_api_data_found') return '-';
                          return `${stats[0].appearances || 0} (${stats[0].starts || 0} Startelf)`;
                        }}
                      />
                      <ComparisonRow
                        label="Tore"
                        getValue={(p) => {
                          const stats = getPlayerStats(p.id);
                          if (stats.length === 0 || stats[0].data_status === 'no_api_data_found') return '-';
                          return stats[0].goals || 0;
                        }}
                      />
                      <ComparisonRow
                        label="Vorlagen"
                        getValue={(p) => {
                          const stats = getPlayerStats(p.id);
                          if (stats.length === 0 || stats[0].data_status === 'no_api_data_found') return '-';
                          return stats[0].assists || 0;
                        }}
                      />
                      <ComparisonRow
                        label="Minuten"
                        getValue={(p) => {
                          const stats = getPlayerStats(p.id);
                          if (stats.length === 0 || stats[0].data_status === 'no_api_data_found') return '-';
                          return stats[0].minutes_played || 0;
                        }}
                      />

                      {/* Präferenzen */}
                      <tr className="bg-slate-100">
                        <td colSpan={selectedPlayers.length + 1} className="p-2 font-bold text-slate-800">
                          Spielerpräferenzen
                        </td>
                      </tr>
                      <ComparisonRow
                        label="Bevorzugte Ligen"
                        icon={Heart}
                        getValue={(p) => p.preferences?.preferred_leagues?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.preferences.preferred_leagues.map(league => (
                              <Badge key={league} variant="outline" className="text-xs">
                                {league}
                              </Badge>
                            ))}
                          </div>
                        ) : '-'}
                      />
                      <ComparisonRow
                        label="Bevorzugte Länder"
                        getValue={(p) => p.preferences?.preferred_countries?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.preferences.preferred_countries.map(country => (
                              <Badge key={country} variant="outline" className="text-xs">
                                {country}
                              </Badge>
                            ))}
                          </div>
                        ) : '-'}
                      />
                      <ComparisonRow
                        label="Gehaltsvorstellung"
                        getValue={(p) => {
                          const prefs = p.preferences;
                          if (!prefs?.min_salary && !prefs?.max_salary) return '-';
                          return `${prefs.min_salary ? `${Math.round(prefs.min_salary / 1000)}K` : '?'} - ${prefs.max_salary ? `${Math.round(prefs.max_salary / 1000)}K €` : '?'}`;
                        }}
                      />
                      <ComparisonRow
                        label="Ausgeschlossene Vereine"
                        getValue={(p) => p.preferences?.excluded_clubs?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.preferences.excluded_clubs.map(club => (
                              <Badge key={club} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                {club}
                              </Badge>
                            ))}
                          </div>
                        ) : '-'}
                      />
                      <ComparisonRow
                        label="Karriereziele"
                        getValue={(p) => p.preferences?.career_goals || '-'}
                      />
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedPlayers.length < 2 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">
                  Wählen Sie mindestens 2 Spieler aus, um den Vergleich zu starten
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}