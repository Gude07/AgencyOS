import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, TrendingUp, Target, Edit2, Check, X, Bell, RefreshCw } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const CURRENT_SEASON = "2025/26";

const EMPTY_STAT = {
  season: "", club: "", competition: "", appearances: 0, starts: 0,
  minutes_played: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0,
  clean_sheets: 0, goals_conceded: 0,
  stat_type: "club", // "club" | "national" | "u_national"
};

function getCurrentSeason(season) {
  return season === CURRENT_SEASON;
}

function avg(arr, key) {
  if (!arr.length) return 0;
  return arr.reduce((s, x) => s + (x[key] || 0), 0) / arr.length;
}

export default function PlayerCareerStats({ playerId, playerPosition }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_STAT);
  const [editData, setEditData] = useState({});
  const [activeSection, setActiveSection] = useState("club");

  const isGoalkeeper = playerPosition === "Torwart";

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["playerCareerStats", playerId],
    queryFn: async () => {
      const all = await base44.entities.PlayerCareerStat.list("-season");
      return all.filter(s => s.player_id === playerId);
    },
    enabled: !!playerId,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  // Monthly reminder check
  useEffect(() => {
    if (!stats.length || !currentUser) return;
    const lastReminder = currentUser?.career_stats_reminder?.[playerId];
    if (lastReminder) {
      const lastDate = new Date(lastReminder);
      const now = new Date();
      const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);
      if (diffDays < 28) return; // less than ~1 month ago
    }
    // Create reminder notification
    base44.entities.Notification.create({
      user_email: currentUser.email,
      type: "spieler_update",
      title: "Karrierestatistiken aktualisieren",
      message: `Bitte aktualisiere die Karrierestatistiken für diesen Spieler (letzte Aktualisierung liegt über einem Monat zurück).`,
      link: `PlayerDetail?id=${playerId}&tab=career`,
      read: false,
    }).then(() => {
      base44.auth.updateMe({
        career_stats_reminder: {
          ...(currentUser?.career_stats_reminder || {}),
          [playerId]: new Date().toISOString(),
        }
      });
    }).catch(() => {});
  }, [stats, currentUser, playerId]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlayerCareerStat.create({ ...data, player_id: playerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playerCareerStats", playerId] });
      setShowForm(false);
      setFormData(EMPTY_STAT);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlayerCareerStat.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playerCareerStats", playerId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlayerCareerStat.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playerCareerStats", playerId] }),
  });

  const clubStats = stats.filter(s => !s.stat_type || s.stat_type === "club");
  const nationalStats = stats.filter(s => s.stat_type === "national");
  const uNationalStats = stats.filter(s => s.stat_type === "u_national");

  const sectionStats = activeSection === "club" ? clubStats : activeSection === "national" ? nationalStats : uNationalStats;
  const sorted = [...sectionStats].sort((a, b) => (a.season > b.season ? 1 : -1));

  const lastUpdated = sectionStats.length > 0
    ? sectionStats.reduce((latest, s) => {
        const d = new Date(s.updated_date || s.created_date || 0);
        return d > latest ? d : latest;
      }, new Date(0))
    : null;

  const calcTotals = (arr) => arr.reduce((acc, s) => ({
    appearances: acc.appearances + (s.appearances || 0),
    starts: acc.starts + (s.starts || 0),
    goals: acc.goals + (s.goals || 0),
    assists: acc.assists + (s.assists || 0),
    minutes_played: acc.minutes_played + (s.minutes_played || 0),
    yellow_cards: acc.yellow_cards + (s.yellow_cards || 0),
    red_cards: acc.red_cards + (s.red_cards || 0),
    clean_sheets: acc.clean_sheets + (s.clean_sheets || 0),
    goals_conceded: acc.goals_conceded + (s.goals_conceded || 0),
  }), { appearances: 0, starts: 0, goals: 0, assists: 0, minutes_played: 0, yellow_cards: 0, red_cards: 0, clean_sheets: 0, goals_conceded: 0 });

  const totals = calcTotals(sectionStats);

  // Chart data
  const chartData = sorted.map(s => ({
    season: s.season,
    ...(isGoalkeeper
      ? { Gegentore: s.goals_conceded || 0, "Zu-Null": s.clean_sheets || 0 }
      : { Tore: s.goals || 0, Assists: s.assists || 0 }),
    Einsätze: s.appearances || 0,
    Startelf: s.starts || 0,
  }));

  const mainKey1 = isGoalkeeper ? "Gegentore" : "Tore";
  const mainKey2 = isGoalkeeper ? "Zu-Null" : "Assists";
  const avgMain1 = avg(sorted, isGoalkeeper ? "goals_conceded" : "goals");
  const avgMain2 = avg(sorted, isGoalkeeper ? "clean_sheets" : "assists");
  const avgStarts = avg(sorted, "starts");

  const handleStartEdit = (stat) => { setEditingId(stat.id); setEditData({ ...stat }); };
  const handleSaveEdit = () => updateMutation.mutate({ id: editingId, data: editData });

  const numField = (key, val, onChange) => (
    <Input type="number" min={0} value={val ?? 0}
      onChange={e => onChange(key, parseInt(e.target.value) || 0)}
      className="w-16 text-center px-1 h-7 text-xs" />
  );

  // Fields for non-goalkeeper
  const formFields = isGoalkeeper
    ? [
        { key: "appearances", label: "Einsätze" }, { key: "starts", label: "Startelf" },
        { key: "goals_conceded", label: "Gegentore" }, { key: "clean_sheets", label: "Zu-Null" },
        { key: "yellow_cards", label: "🟨" }, { key: "red_cards", label: "🟥" },
      ]
    : [
        { key: "appearances", label: "Einsätze" }, { key: "starts", label: "Startelf" },
        { key: "goals", label: "Tore" }, { key: "assists", label: "Assists" },
        { key: "yellow_cards", label: "🟨" }, { key: "red_cards", label: "🟥" },
      ];

  const kpis = isGoalkeeper
    ? [
        { label: "Einsätze", value: totals.appearances, color: "text-blue-900", bg: "bg-blue-50 border-blue-200" },
        { label: "Startelf", value: totals.starts, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
        { label: "Gegentore", value: totals.goals_conceded, color: "text-red-700", bg: "bg-red-50 border-red-200" },
        { label: "Zu-Null", value: totals.clean_sheets, color: "text-green-700", bg: "bg-green-50 border-green-200" },
        { label: "🟨", value: totals.yellow_cards, color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
        { label: "🟥", value: totals.red_cards, color: "text-red-700", bg: "bg-red-50 border-red-200" },
      ]
    : [
        { label: "Einsätze", value: totals.appearances, color: "text-blue-900", bg: "bg-blue-50 border-blue-200" },
        { label: "Startelf", value: totals.starts, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
        { label: "Tore", value: totals.goals, color: "text-green-700", bg: "bg-green-50 border-green-200" },
        { label: "Assists", value: totals.assists, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
        { label: "🟨", value: totals.yellow_cards, color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
        { label: "🟥", value: totals.red_cards, color: "text-red-700", bg: "bg-red-50 border-red-200" },
      ];

  const StatTable = ({ rows }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Saison</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Verein</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 hidden md:table-cell">Liga</th>
            <th className="text-center px-2 py-2 text-xs font-semibold text-slate-500">Sp.</th>
            <th className="text-center px-2 py-2 text-xs font-semibold text-indigo-700">XI</th>
            <th className="text-center px-2 py-2 text-xs font-semibold text-slate-500 hidden md:table-cell">Min</th>
            {isGoalkeeper ? (
              <>
                <th className="text-center px-2 py-2 text-xs font-semibold text-red-600">GT</th>
                <th className="text-center px-2 py-2 text-xs font-semibold text-green-700">ZN</th>
              </>
            ) : (
              <>
                <th className="text-center px-2 py-2 text-xs font-semibold text-green-700">Tore</th>
                <th className="text-center px-2 py-2 text-xs font-semibold text-purple-700">Ast</th>
              </>
            )}
            <th className="text-center px-2 py-2 text-xs font-semibold text-yellow-600">🟨</th>
            <th className="text-center px-2 py-2 text-xs font-semibold text-red-600">🟥</th>
            <th className="px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((stat) => {
            const isCurrent = getCurrentSeason(stat.season);
            return (
              <tr key={stat.id}
                className={`border-b border-slate-50 transition-colors ${isCurrent ? "bg-green-50 hover:bg-green-100" : "hover:bg-slate-50"}`}>
                {editingId === stat.id ? (
                  <>
                    <td className="px-4 py-2"><Input value={editData.season} onChange={e => setEditData({...editData, season: e.target.value})} className="w-24 h-7 text-xs" /></td>
                    <td className="px-4 py-2"><Input value={editData.club} onChange={e => setEditData({...editData, club: e.target.value})} className="w-28 h-7 text-xs" /></td>
                    <td className="px-4 py-2 hidden md:table-cell"><Input value={editData.competition || ""} onChange={e => setEditData({...editData, competition: e.target.value})} className="w-28 h-7 text-xs" /></td>
                    {["appearances","starts","minutes_played",
                      ...(isGoalkeeper ? ["goals_conceded","clean_sheets"] : ["goals","assists"]),
                      "yellow_cards","red_cards"].map(k => (
                      <td key={k} className="px-2 py-2 text-center">
                        {numField(k, editData[k], (key, val) => setEditData({...editData, [key]: val}))}
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isCurrent ? "text-green-800" : "text-slate-900"}`}>{stat.season}</span>
                        {isCurrent && <Badge className="bg-green-600 text-white text-xs py-0 px-1.5">Aktuell</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{stat.club}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{stat.competition || "-"}</td>
                    <td className="px-2 py-3 text-center">{stat.appearances ?? 0}</td>
                    <td className="px-2 py-3 text-center text-indigo-700">{stat.starts ?? 0}</td>
                    <td className="px-2 py-3 text-center text-slate-500 hidden md:table-cell">{stat.minutes_played ?? 0}</td>
                    {isGoalkeeper ? (
                      <>
                        <td className="px-2 py-3 text-center font-semibold text-red-600">{stat.goals_conceded ?? 0}</td>
                        <td className="px-2 py-3 text-center font-semibold text-green-700">{stat.clean_sheets ?? 0}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-3 text-center font-semibold text-green-700">{stat.goals ?? 0}</td>
                        <td className="px-2 py-3 text-center font-semibold text-purple-700">{stat.assists ?? 0}</td>
                      </>
                    )}
                    <td className="px-2 py-3 text-center text-yellow-600">{stat.yellow_cards ?? 0}</td>
                    <td className="px-2 py-3 text-center text-red-600">{stat.red_cards ?? 0}</td>
                    <td className="px-2 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleStartEdit(stat)} className="p-1 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteMutation.mutate(stat.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
        {rows.length > 1 && (
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
              <td className="px-4 py-2 text-slate-700" colSpan={3}>Gesamt ({rows.length} Saisons)</td>
              <td className="px-2 py-2 text-center">{totals.appearances}</td>
              <td className="px-2 py-2 text-center text-indigo-700">{totals.starts}</td>
              <td className="px-2 py-2 text-center text-slate-500 hidden md:table-cell">{totals.minutes_played}</td>
              {isGoalkeeper ? (
                <>
                  <td className="px-2 py-2 text-center text-red-600">{totals.goals_conceded}</td>
                  <td className="px-2 py-2 text-center text-green-700">{totals.clean_sheets}</td>
                </>
              ) : (
                <>
                  <td className="px-2 py-2 text-center text-green-700">{totals.goals}</td>
                  <td className="px-2 py-2 text-center text-purple-700">{totals.assists}</td>
                </>
              )}
              <td className="px-2 py-2 text-center text-yellow-600">{totals.yellow_cards}</td>
              <td className="px-2 py-2 text-center text-red-600">{totals.red_cards}</td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="club">🏟 Verein ({clubStats.length})</TabsTrigger>
            <TabsTrigger value="national">🌍 Nationalmannschaft ({nationalStats.length})</TabsTrigger>
            <TabsTrigger value="u_national">🌍 U-Nationalm. ({uNationalStats.length})</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-3">
            {lastUpdated && lastUpdated.getTime() > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <RefreshCw className="w-3 h-3" />
                Zuletzt aktualisiert: {format(lastUpdated, "dd.MM.yyyy", { locale: de })}
              </div>
            )}
            <Button size="sm" onClick={() => { setShowForm(!showForm); setFormData({...EMPTY_STAT, stat_type: activeSection}); }}
              className="bg-blue-900 hover:bg-blue-800 text-white">
              <Plus className="w-4 h-4 mr-1" />
              Saison hinzufügen
            </Button>
          </div>
        </div>

        {["club","national","u_national"].map(section => (
          <TabsContent key={section} value={section} className="mt-4 space-y-6">
            {/* KPIs */}
            {sectionStats.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {kpis.map(kpi => (
                  <div key={kpi.label} className={`rounded-lg border p-3 text-center ${kpi.bg}`}>
                    <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Chart */}
            {chartData.length >= 2 && (
              <Card className="border-slate-200 bg-white">
                <CardHeader className="border-b border-slate-100 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-900" />
                    Leistungstrend (mit Mittelwert-Linien)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="season" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey={mainKey1} fill={isGoalkeeper ? "#dc2626" : "#16a34a"} radius={[3, 3, 0, 0]} />
                      <Bar dataKey={mainKey2} fill={isGoalkeeper ? "#16a34a" : "#7c3aed"} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Einsätze" fill="#1e3a8a" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Startelf" fill="#6366f1" radius={[3, 3, 0, 0]} />
                      {/* Mittelwert-Linien */}
                      <ReferenceLine y={avgMain1} stroke={isGoalkeeper ? "#dc2626" : "#16a34a"} strokeDasharray="4 2" label={{ value: `Ø ${mainKey1}`, position: "insideTopRight", fontSize: 10, fill: isGoalkeeper ? "#dc2626" : "#16a34a" }} />
                      <ReferenceLine y={avgMain2} stroke={isGoalkeeper ? "#16a34a" : "#7c3aed"} strokeDasharray="4 2" label={{ value: `Ø ${mainKey2}`, position: "insideTopLeft", fontSize: 10, fill: isGoalkeeper ? "#16a34a" : "#7c3aed" }} />
                      <ReferenceLine y={avgStarts} stroke="#6366f1" strokeDasharray="4 2" label={{ value: `Ø Startelf`, position: "insideBottomRight", fontSize: 10, fill: "#6366f1" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Add Form */}
            {showForm && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">Neue Saison ({section === "club" ? "Verein" : section === "national" ? "Nationalmannschaft" : "U-Nationalmannschaft"})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <Label className="text-xs mb-1 block">Saison *</Label>
                      <Input placeholder="2025/26" value={formData.season} onChange={e => setFormData({...formData, season: e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Verein *</Label>
                      <Input placeholder="FC Bayern" value={formData.club} onChange={e => setFormData({...formData, club: e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Liga</Label>
                      <Input placeholder="Bundesliga" value={formData.competition} onChange={e => setFormData({...formData, competition: e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Minuten</Label>
                      <Input type="number" min={0} value={formData.minutes_played} onChange={e => setFormData({...formData, minutes_played: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {formFields.map(f => (
                      <div key={f.key} className="text-center">
                        <Label className="text-xs mb-1 block">{f.label}</Label>
                        <Input type="number" min={0} value={formData[f.key] ?? 0}
                          onChange={e => setFormData({...formData, [f.key]: parseInt(e.target.value) || 0})}
                          className="text-center px-1" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => createMutation.mutate({...formData, stat_type: activeSection})}
                      disabled={!formData.season || !formData.club || createMutation.isPending}
                      className="bg-blue-900 hover:bg-blue-800">
                      Speichern
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Abbrechen</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Table */}
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-slate-400">Laden...</div>
                ) : sorted.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Noch keine Statistiken für diesen Bereich</p>
                    <p className="text-sm mt-1">Saison über den Button oben hinzufügen</p>
                  </div>
                ) : (
                  <StatTable rows={sorted} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}