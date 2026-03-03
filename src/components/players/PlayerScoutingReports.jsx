import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, ChevronDown, ChevronUp, Star, ClipboardList, User } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as ReTooltip,
} from "recharts";

const RECOMMENDATION_CONFIG = {
  sehr_empfehlenswert: { label: "Sehr empfehlenswert", color: "bg-green-100 text-green-800 border-green-300" },
  empfehlenswert:      { label: "Empfehlenswert",      color: "bg-blue-100 text-blue-800 border-blue-300" },
  beobachten:          { label: "Beobachten",           color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  nicht_empfehlenswert:{ label: "Nicht empfehlenswert",color: "bg-red-100 text-red-800 border-red-300" },
};

const EMPTY_FORM = {
  report_date: new Date().toISOString().split("T")[0],
  scout_name: "",
  match_attended: "",
  overall_rating: 7,
  recommendation: "empfehlenswert",
  strengths: "",
  weaknesses: "",
  potential: "",
  notes: "",
  technical_passing: 5, technical_dribbling: 5, technical_shooting: 5,
  technical_tackling: 5, technical_heading: 5, technical_first_touch: 5,
  tactical_positioning: 5, tactical_decision_making: 5, tactical_game_intelligence: 5,
  physical_speed: 5, physical_endurance: 5, physical_strength: 5,
  mental_leadership: 5, mental_work_rate: 5, mental_composure: 5,
};

function RatingSlider({ label, value, onChange }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <Label className="text-xs text-slate-600">{label}</Label>
        <span className="text-xs font-bold text-blue-900">{value}/10</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={1} max={10} step={1} />
    </div>
  );
}

function OverallStars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(10)].map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </div>
  );
}

function RadarDisplay({ report }) {
  const data = [
    { subject: "Passen", value: report.technical_passing || 0 },
    { subject: "Dribbling", value: report.technical_dribbling || 0 },
    { subject: "Abschluss", value: report.technical_shooting || 0 },
    { subject: "Tackling", value: report.technical_tackling || 0 },
    { subject: "Kopfball", value: report.technical_heading || 0 },
    { subject: "Ballannahme", value: report.technical_first_touch || 0 },
    { subject: "Positionierung", value: report.tactical_positioning || 0 },
    { subject: "Entscheidung", value: report.tactical_decision_making || 0 },
    { subject: "Spielintelligenz", value: report.tactical_game_intelligence || 0 },
    { subject: "Tempo", value: report.physical_speed || 0 },
    { subject: "Ausdauer", value: report.physical_endurance || 0 },
    { subject: "Stärke", value: report.physical_strength || 0 },
    { subject: "Führung", value: report.mental_leadership || 0 },
    { subject: "Einsatz", value: report.mental_work_rate || 0 },
    { subject: "Nervenstärke", value: report.mental_composure || 0 },
  ];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
        <ReTooltip formatter={(v) => [`${v}/10`]} />
        <Radar name="Bewertung" dataKey="value" stroke="#1e3a8a" fill="#1e3a8a" fillOpacity={0.3} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function ReportCard({ report, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const rec = RECOMMENDATION_CONFIG[report.recommendation] || RECOMMENDATION_CONFIG.beobachten;

  return (
    <Card className="border-slate-200 bg-white hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-slate-900 text-sm">
                {report.report_date ? format(new Date(report.report_date), "dd.MM.yyyy", { locale: de }) : "-"}
              </span>
              <Badge className={`${rec.color} border text-xs`}>{rec.label}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{report.scout_name}</span>
              {report.match_attended && <span>📋 {report.match_attended}</span>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">Gesamtbewertung:</span>
              <OverallStars rating={report.overall_rating} />
              <span className="text-xs font-bold text-amber-600">{report.overall_rating}/10</span>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onDelete(report.id)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expanded Detail */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Radar Chart */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Attribut-Übersicht</p>
                <RadarDisplay report={report} />
              </div>
              {/* Category Averages */}
              <div className="space-y-3">
                {[
                  { label: "⚽ Technik", keys: ["technical_passing","technical_dribbling","technical_shooting","technical_tackling","technical_heading","technical_first_touch"], color: "text-blue-700" },
                  { label: "🧠 Taktik", keys: ["tactical_positioning","tactical_decision_making","tactical_game_intelligence"], color: "text-purple-700" },
                  { label: "💪 Physis", keys: ["physical_speed","physical_endurance","physical_strength"], color: "text-green-700" },
                  { label: "🧠 Mental", keys: ["mental_leadership","mental_work_rate","mental_composure"], color: "text-amber-700" },
                ].map(cat => {
                  const values = cat.keys.map(k => report[k] || 0).filter(v => v > 0);
                  const avg = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "-";
                  return (
                    <div key={cat.label} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                      <span className={`text-sm font-bold ${cat.color}`}>{avg}/10</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Texts */}
            <div className="grid md:grid-cols-3 gap-4">
              {report.strengths && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs font-semibold text-green-800 mb-1">✅ Stärken</p>
                  <p className="text-xs text-green-700 whitespace-pre-wrap">{report.strengths}</p>
                </div>
              )}
              {report.weaknesses && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-semibold text-red-800 mb-1">⚠️ Schwächen</p>
                  <p className="text-xs text-red-700 whitespace-pre-wrap">{report.weaknesses}</p>
                </div>
              )}
              {report.potential && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-800 mb-1">🚀 Potenzial</p>
                  <p className="text-xs text-blue-700 whitespace-pre-wrap">{report.potential}</p>
                </div>
              )}
            </div>
            {report.notes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-semibold text-slate-700 mb-1">📝 Notizen</p>
                <p className="text-xs text-slate-600 whitespace-pre-wrap">{report.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PlayerScoutingReports({ playerId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["scoutingReports", playerId],
    queryFn: async () => {
      const all = await base44.entities.ScoutingReport.list("-report_date");
      return all.filter(r => r.player_id === playerId);
    },
    enabled: !!playerId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ScoutingReport.create({ ...data, player_id: playerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoutingReports", playerId] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ScoutingReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoutingReports", playerId] });
      setDeleteId(null);
    },
  });

  const f = (key) => ({
    value: form[key],
    onChange: (v) => setForm(prev => ({ ...prev, [key]: v })),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-900" />
          <h2 className="text-lg font-semibold text-slate-900">Scouting Reports</h2>
          <Badge variant="outline" className="text-slate-500">{reports.length} Berichte</Badge>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-blue-900 hover:bg-blue-800 text-white">
          <Plus className="w-4 h-4 mr-1" />
          Neuer Bericht
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader className="border-b border-blue-100 pb-3">
            <CardTitle className="text-sm text-blue-900">Neuen Scouting Report erstellen</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs mb-1.5 block">Datum *</Label>
                <Input type="date" value={form.report_date} onChange={e => setForm(p => ({...p, report_date: e.target.value}))} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Scout *</Label>
                <Input placeholder="Name des Scouts" value={form.scout_name} onChange={e => setForm(p => ({...p, scout_name: e.target.value}))} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs mb-1.5 block">Beobachtetes Spiel</Label>
                <Input placeholder="z.B. FC Bayern vs BVB, 01.03.2026" value={form.match_attended} onChange={e => setForm(p => ({...p, match_attended: e.target.value}))} />
              </div>
            </div>

            {/* Overall Rating & Recommendation */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded-xl border border-blue-100">
              <div>
                <Label className="text-xs mb-2 block font-semibold">Gesamtbewertung: <span className="text-blue-900 text-sm">{form.overall_rating}/10</span></Label>
                <Slider value={[form.overall_rating]} onValueChange={([v]) => setForm(p => ({...p, overall_rating: v}))} min={1} max={10} step={1} />
                <div className="mt-2"><OverallStars rating={form.overall_rating} /></div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block font-semibold">Empfehlung *</Label>
                <Select value={form.recommendation} onValueChange={v => setForm(p => ({...p, recommendation: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sehr_empfehlenswert">⭐ Sehr empfehlenswert</SelectItem>
                    <SelectItem value="empfehlenswert">✅ Empfehlenswert</SelectItem>
                    <SelectItem value="beobachten">👀 Beobachten</SelectItem>
                    <SelectItem value="nicht_empfehlenswert">❌ Nicht empfehlenswert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Attribute Sliders */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">⚽ Technik</p>
                <RatingSlider label="Passen" {...f("technical_passing")} />
                <RatingSlider label="Dribbling" {...f("technical_dribbling")} />
                <RatingSlider label="Abschluss" {...f("technical_shooting")} />
                <RatingSlider label="Tackling" {...f("technical_tackling")} />
                <RatingSlider label="Kopfball" {...f("technical_heading")} />
                <RatingSlider label="Ballannahme" {...f("technical_first_touch")} />
              </div>
              <div className="space-y-6">
                <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">🧠 Taktik</p>
                  <RatingSlider label="Positionierung" {...f("tactical_positioning")} />
                  <RatingSlider label="Entscheidungsfindung" {...f("tactical_decision_making")} />
                  <RatingSlider label="Spielintelligenz" {...f("tactical_game_intelligence")} />
                </div>
                <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wider">💪 Physis</p>
                  <RatingSlider label="Tempo" {...f("physical_speed")} />
                  <RatingSlider label="Ausdauer" {...f("physical_endurance")} />
                  <RatingSlider label="Stärke" {...f("physical_strength")} />
                </div>
                <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">🧠 Mental</p>
                  <RatingSlider label="Führungsstärke" {...f("mental_leadership")} />
                  <RatingSlider label="Einsatzbereitschaft" {...f("mental_work_rate")} />
                  <RatingSlider label="Nervenstärke" {...f("mental_composure")} />
                </div>
              </div>
            </div>

            {/* Text Areas */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs mb-1.5 block text-green-700 font-semibold">✅ Stärken</Label>
                <Textarea placeholder="Stärken des Spielers..." value={form.strengths} onChange={e => setForm(p => ({...p, strengths: e.target.value}))} className="h-28 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block text-red-700 font-semibold">⚠️ Schwächen</Label>
                <Textarea placeholder="Schwächen des Spielers..." value={form.weaknesses} onChange={e => setForm(p => ({...p, weaknesses: e.target.value}))} className="h-28 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block text-blue-700 font-semibold">🚀 Potenzial</Label>
                <Textarea placeholder="Entwicklungspotenzial..." value={form.potential} onChange={e => setForm(p => ({...p, potential: e.target.value}))} className="h-28 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block text-slate-600 font-semibold">📝 Weitere Notizen</Label>
              <Textarea placeholder="Zusätzliche Beobachtungen..." value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} className="h-20 text-sm" />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.scout_name || !form.report_date || createMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                Bericht speichern
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Abbrechen</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-400">Laden...</div>
      ) : reports.length === 0 && !showForm ? (
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-10 text-center">
            <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Noch keine Scouting Reports</p>
            <p className="text-sm text-slate-400 mt-1">Erstelle den ersten Bericht mit dem Button oben</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <ReportCard key={report.id} report={report} onDelete={setDeleteId} />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bericht löschen?</AlertDialogTitle>
            <AlertDialogDescription>Dieser Scouting Report wird dauerhaft gelöscht.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-red-600 hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}