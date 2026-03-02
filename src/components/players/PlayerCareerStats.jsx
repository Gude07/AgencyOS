import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, TrendingUp, Target, Clock, Edit2, Check, X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from "recharts";

const EMPTY_STAT = {
  season: "", club: "", competition: "", appearances: 0, starts: 0,
  minutes_played: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, clean_sheets: 0,
};

export default function PlayerCareerStats({ playerId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_STAT);
  const [editData, setEditData] = useState({});

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["playerCareerStats", playerId],
    queryFn: async () => {
      const all = await base44.entities.PlayerCareerStat.list("-season");
      return all.filter(s => s.player_id === playerId);
    },
    enabled: !!playerId,
  });

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

  const sorted = [...stats].sort((a, b) => (a.season > b.season ? 1 : -1));

  const totals = stats.reduce((acc, s) => ({
    appearances: acc.appearances + (s.appearances || 0),
    goals: acc.goals + (s.goals || 0),
    assists: acc.assists + (s.assists || 0),
    minutes_played: acc.minutes_played + (s.minutes_played || 0),
    yellow_cards: acc.yellow_cards + (s.yellow_cards || 0),
    red_cards: acc.red_cards + (s.red_cards || 0),
  }), { appearances: 0, goals: 0, assists: 0, minutes_played: 0, yellow_cards: 0, red_cards: 0 });

  const chartData = sorted.map(s => ({
    season: s.season,
    Tore: s.goals || 0,
    Assists: s.assists || 0,
    Einsätze: s.appearances || 0,
  }));

  const numField = (key, val, onChange) => (
    <Input
      type="number"
      min={0}
      value={val ?? 0}
      onChange={e => onChange(key, parseInt(e.target.value) || 0)}
      className="w-16 text-center px-1"
    />
  );

  const handleStartEdit = (stat) => {
    setEditingId(stat.id);
    setEditData({ ...stat });
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({ id: editingId, data: editData });
  };

  return (
    <div className="space-y-6">
      {/* Karriere-KPIs */}
      {stats.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Einsätze", value: totals.appearances, color: "text-blue-900", bg: "bg-blue-50 border-blue-200" },
            { label: "Tore", value: totals.goals, color: "text-green-700", bg: "bg-green-50 border-green-200" },
            { label: "Assists", value: totals.assists, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
            { label: "Minuten", value: `${(totals.minutes_played / 90).toFixed(0)}×90`, color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
            { label: "🟨", value: totals.yellow_cards, color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
            { label: "🟥", value: totals.red_cards, color: "text-red-700", bg: "bg-red-50 border-red-200" },
          ].map(kpi => (
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
              Leistungstrend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="season" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Tore" fill="#16a34a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Assists" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Einsätze" fill="#1e3a8a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabelle */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Saisonstatistiken</CardTitle>
            <Button
              size="sm"
              onClick={() => { setShowForm(!showForm); setFormData(EMPTY_STAT); }}
              className="bg-blue-900 hover:bg-blue-800 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Saison hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Add Form */}
          {showForm && (
            <div className="p-4 border-b border-slate-100 bg-blue-50/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <Label className="text-xs mb-1 block">Saison *</Label>
                  <Input placeholder="2024/25" value={formData.season} onChange={e => setFormData({...formData, season: e.target.value})} />
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
                {[
                  {key:"appearances",label:"Einsätze"},{key:"starts",label:"Startelf"},
                  {key:"goals",label:"Tore"},{key:"assists",label:"Assists"},
                  {key:"yellow_cards",label:"🟨"},{key:"red_cards",label:"🟥"},
                ].map(f => (
                  <div key={f.key} className="text-center">
                    <Label className="text-xs mb-1 block">{f.label}</Label>
                    <Input type="number" min={0} value={formData[f.key]} onChange={e => setFormData({...formData, [f.key]: parseInt(e.target.value) || 0})} className="text-center px-1" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => createMutation.mutate(formData)} disabled={!formData.season || !formData.club || createMutation.isPending} className="bg-blue-900 hover:bg-blue-800">
                  Speichern
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Abbrechen</Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Laden...</div>
          ) : sorted.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Noch keine Karrieredaten erfasst</p>
              <p className="text-sm mt-1">Fügen Sie Saisons über den Button oben hinzu</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Saison</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Verein</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 hidden md:table-cell">Liga</th>
                    <th className="text-center px-2 py-2 text-xs font-semibold text-slate-500">Spiele</th>
                    <th className="text-center px-2 py-2 text-xs font-semibold text-slate-500">Min</th>
                    <th className="text-center px-2 py-2 text-xs font-semibold text-green-700">Tore</th>
                    <th className="text-center px-2 py-2 text-xs font-semibold text-purple-700">Ast</th>
                    <th className="text-center px-2 py-2 text-xs font-semibold text-yellow-600">🟨</th>
                    <th className="text-center px-2 py-2 text-xs font-semibold text-red-600">🟥</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((stat) => (
                    <tr key={stat.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      {editingId === stat.id ? (
                        <>
                          <td className="px-4 py-2"><Input value={editData.season} onChange={e => setEditData({...editData, season: e.target.value})} className="w-24 h-7 text-xs" /></td>
                          <td className="px-4 py-2"><Input value={editData.club} onChange={e => setEditData({...editData, club: e.target.value})} className="w-28 h-7 text-xs" /></td>
                          <td className="px-4 py-2 hidden md:table-cell"><Input value={editData.competition || ""} onChange={e => setEditData({...editData, competition: e.target.value})} className="w-28 h-7 text-xs" /></td>
                          {["appearances","minutes_played","goals","assists","yellow_cards","red_cards"].map(k => (
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
                          <td className="px-4 py-3 font-semibold text-slate-900">{stat.season}</td>
                          <td className="px-4 py-3 text-slate-700">{stat.club}</td>
                          <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{stat.competition || "-"}</td>
                          <td className="px-2 py-3 text-center">{stat.appearances ?? 0}</td>
                          <td className="px-2 py-3 text-center text-slate-500">{stat.minutes_played ?? 0}</td>
                          <td className="px-2 py-3 text-center font-semibold text-green-700">{stat.goals ?? 0}</td>
                          <td className="px-2 py-3 text-center font-semibold text-purple-700">{stat.assists ?? 0}</td>
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
                  ))}
                </tbody>
                {stats.length > 1 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                      <td className="px-4 py-2 text-slate-700" colSpan={3}>Gesamt ({stats.length} Saisons)</td>
                      <td className="px-2 py-2 text-center">{totals.appearances}</td>
                      <td className="px-2 py-2 text-center text-slate-500">{totals.minutes_played}</td>
                      <td className="px-2 py-2 text-center text-green-700">{totals.goals}</td>
                      <td className="px-2 py-2 text-center text-purple-700">{totals.assists}</td>
                      <td className="px-2 py-2 text-center text-yellow-600">{totals.yellow_cards}</td>
                      <td className="px-2 py-2 text-center text-red-600">{totals.red_cards}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}