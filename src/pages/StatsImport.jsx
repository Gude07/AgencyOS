import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BarChart2, RefreshCw, PlayCircle, CheckCircle2, XCircle,
  AlertTriangle, Search, Trash2, ChevronDown, ChevronUp, Clock
} from "lucide-react";
import { syncSinglePlayer, syncAllPlayers } from "../components/stats/playerStatsPipeline";
import { formatInGermanTime } from "@/components/utils/dateUtils";

const SEASONS = ["2025/26", "2024/25", "2023/24", "2022/23"];

const matchStatusColors = {
  confirmed: "bg-green-100 text-green-800 border-green-200",
  auto_matched: "bg-blue-100 text-blue-800 border-blue-200",
  needs_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  unmatched: "bg-red-100 text-red-800 border-red-200",
};
const matchStatusLabels = {
  confirmed: "Bestätigt",
  auto_matched: "Auto-Match",
  needs_review: "Review nötig",
  unmatched: "Kein Match",
};
const logLevelColors = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  error: "bg-red-50 border-red-200 text-red-800",
};

export default function StatsImport() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Single-Import State
  const [singleName, setSingleName] = useState("");
  const [singleClub, setSingleClub] = useState("");
  const [singleSeason, setSingleSeason] = useState("2025/26");
  const [singleResult, setSingleResult] = useState(null);

  // Batch-Import State
  const [batchProgress, setBatchProgress] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);
  const [showClearLogsDialog, setShowClearLogsDialog] = useState(false);

  const { data: allStats = [] } = useQuery({
    queryKey: ["playerStats"],
    queryFn: () => base44.entities.PlayerStats.list("-last_updated"),
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["playerStatsLogs"],
    queryFn: () => base44.entities.PlayerStatsLog.list("-created_date", 100),
  });

  // Single-Import Mutation
  const singleImportMutation = useMutation({
    mutationFn: () =>
      syncSinglePlayer({ playerName: singleName, clubName: singleClub, season: singleSeason }),
    onSuccess: (result) => {
      setSingleResult(result);
      queryClient.invalidateQueries({ queryKey: ["playerStats"] });
      queryClient.invalidateQueries({ queryKey: ["playerStatsLogs"] });
    },
  });

  // Sync-All Mutation
  const syncAllMutation = useMutation({
    mutationFn: (season) =>
      syncAllPlayers(season, (completed, total, result) => {
        setBatchProgress({ completed, total, lastResult: result });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playerStats"] });
      queryClient.invalidateQueries({ queryKey: ["playerStatsLogs"] });
      setBatchProgress(null);
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      for (const log of logs) {
        await base44.entities.PlayerStatsLog.delete(log.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playerStatsLogs"] });
      setShowClearLogsDialog(false);
    },
  });

  const confirmMatchMutation = useMutation({
    mutationFn: ({ statsId, playerId }) =>
      base44.entities.PlayerStats.update(statsId, { player_id: playerId, match_status: "confirmed" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playerStats"] }),
  });

  const deleteStatsMutation = useMutation({
    mutationFn: (id) => base44.entities.PlayerStats.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playerStats"] }),
  });

  // Statistiken
  const needsReview = allStats.filter((s) => s.match_status === "needs_review");
  const unmatched = allStats.filter((s) => s.match_status === "unmatched");
  const errorLogs = logs.filter((l) => l.level === "error");

  const getPlayerName = (id) => players.find((p) => p.id === id)?.name || id;

  return (
    <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <BarChart2 className="w-8 h-8 text-blue-900 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik-Import</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Spielerstatistiken von soccerstats247.com • Automatisches Matching & Synchronisation
            </p>
          </div>
        </div>

        {/* KPI-Karten */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Statistiken gesamt", value: allStats.length, color: "text-blue-900" },
            { label: "Auto-gematcht", value: allStats.filter(s => s.match_status === "auto_matched" || s.match_status === "confirmed").length, color: "text-green-700" },
            { label: "Review nötig", value: needsReview.length, color: "text-yellow-700" },
            { label: "Fehler-Logs", value: errorLogs.length, color: "text-red-700" },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardContent className="p-4 text-center">
                <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-xs text-slate-500 mt-1">{kpi.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="single">Einzelimport</TabsTrigger>
            <TabsTrigger value="sync">Vollsync</TabsTrigger>
            <TabsTrigger value="logs" className="relative">
              Logs
              {errorLogs.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {errorLogs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ÜBERSICHT */}
          <TabsContent value="overview" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Importierte Statistiken</h2>
              {needsReview.length > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {needsReview.length} Review nötig
                </Badge>
              )}
            </div>

            {allStats.length === 0 ? (
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardContent className="p-12 text-center">
                  <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Noch keine Statistiken importiert</p>
                  <p className="text-sm text-slate-400 mt-1">Nutzen Sie den Einzelimport oder Vollsync</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allStats.map((stat) => (
                  <Card key={stat.id} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {stat.player_name_external}
                            </span>
                            <Badge variant="outline" className={matchStatusColors[stat.match_status] + " border text-xs"}>
                              {matchStatusLabels[stat.match_status]}
                              {stat.match_confidence > 0 && ` ${stat.match_confidence}%`}
                            </Badge>
                            {stat.player_id && (
                              <Badge variant="outline" className="text-xs bg-slate-50 border-slate-300">
                                → {getPlayerName(stat.player_id)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {stat.club} • {stat.competition} • {stat.season}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm">
                            {stat.appearances != null && <span>🎽 {stat.appearances} Spiele</span>}
                            {stat.goals != null && <span>⚽ {stat.goals} Tore</span>}
                            {stat.assists != null && <span>🅰️ {stat.assists} Assists</span>}
                            {stat.minutes_played != null && <span>⏱️ {stat.minutes_played} Min</span>}
                            {stat.yellow_cards > 0 && <span>🟨 {stat.yellow_cards}</span>}
                            {stat.red_cards > 0 && <span>🟥 {stat.red_cards}</span>}
                          </div>
                          {stat.last_updated && (
                            <p className="text-xs text-slate-400 mt-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {formatInGermanTime(stat.last_updated, "dd.MM.yyyy HH:mm")}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {stat.match_status === "needs_review" && stat.player_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-300"
                              onClick={() => confirmMatchMutation.mutate({ statsId: stat.id, playerId: stat.player_id })}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Bestätigen
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => deleteStatsMutation.mutate(stat.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* EINZELIMPORT */}
          <TabsContent value="single">
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-slate-900 dark:text-white">Einzelnen Spieler importieren</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Spielername *
                    </label>
                    <Input
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      placeholder="z.B. Robert Lewandowski"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Verein (optional)
                    </label>
                    <Input
                      value={singleClub}
                      onChange={(e) => setSingleClub(e.target.value)}
                      placeholder="z.B. FC Barcelona"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Saison
                    </label>
                    <Select value={singleSeason} onValueChange={setSingleSeason}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEASONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={() => singleImportMutation.mutate()}
                  disabled={!singleName.trim() || singleImportMutation.isPending}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  {singleImportMutation.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Pipeline läuft...</>
                  ) : (
                    <><PlayCircle className="w-4 h-4 mr-2" />Import starten</>
                  )}
                </Button>

                {singleResult && (
                  <div className={`p-4 rounded-lg border text-sm space-y-2 ${
                    singleResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                  }`}>
                    <div className="flex items-center gap-2 font-semibold">
                      {singleResult.success
                        ? <><CheckCircle2 className="w-4 h-4 text-green-600" />Import erfolgreich</>
                        : <><XCircle className="w-4 h-4 text-red-600" />Import fehlgeschlagen</>
                      }
                    </div>
                    {singleResult.matchedPlayerId && (
                      <p>🔗 Verknüpft mit: <strong>{getPlayerName(singleResult.matchedPlayerId)}</strong> ({singleResult.matchConfidence}% Konfidenz)</p>
                    )}
                    {singleResult.skipped && <p className="text-slate-600">ℹ️ Keine Änderungen (bereits aktuell)</p>}
                    {singleResult.warnings.map((w, i) => (
                      <p key={i} className="text-yellow-700">⚠️ {w}</p>
                    ))}
                    {singleResult.errors.map((e, i) => (
                      <p key={i} className="text-red-700">✗ {e}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* VOLLSYNC */}
          <TabsContent value="sync">
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-slate-900 dark:text-white">Vollständige Synchronisation</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Synchronisiert Statistiken für alle <strong>{players.filter(p => !p.archive_id).length}</strong> aktiven Spieler im System.
                  Rate-Limiting: ~1,5s zwischen Anfragen.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  {SEASONS.map((season) => (
                    <Button
                      key={season}
                      variant="outline"
                      onClick={() => syncAllMutation.mutate(season)}
                      disabled={syncAllMutation.isPending}
                      className="justify-start gap-3 h-auto p-4"
                    >
                      <RefreshCw className={`w-5 h-5 text-blue-900 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
                      <div className="text-left">
                        <div className="font-semibold">Saison {season}</div>
                        <div className="text-xs text-slate-500">Alle Spieler synchronisieren</div>
                      </div>
                    </Button>
                  ))}
                </div>

                {batchProgress && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>Fortschritt</span>
                      <span>{batchProgress.completed} / {batchProgress.total}</span>
                    </div>
                    <Progress value={(batchProgress.completed / batchProgress.total) * 100} className="h-2" />
                    {batchProgress.lastResult && (
                      <p className="text-xs text-slate-500">
                        Zuletzt: {batchProgress.lastResult.playerName}
                        {batchProgress.lastResult.success
                          ? <span className="text-green-600 ml-2">✓</span>
                          : <span className="text-red-600 ml-2">✗</span>}
                      </p>
                    )}
                  </div>
                )}

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-900">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm mb-2">Pipeline-Architektur</h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {["FETCH", "PARSE", "NORMALIZE", "VALIDATE", "MATCH", "PERSIST"].map((s, i, arr) => (
                      <React.Fragment key={s}>
                        <span className="px-2 py-1 bg-blue-900 text-white rounded">{s}</span>
                        {i < arr.length - 1 && <span className="text-blue-400 self-center">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LOGS */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Pipeline-Logs ({logs.length})
              </h2>
              {logs.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200"
                  onClick={() => setShowClearLogsDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Logs leeren
                </Button>
              )}
            </div>

            {logs.length === 0 ? (
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardContent className="p-8 text-center text-slate-500">
                  Keine Logs vorhanden
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border text-sm ${logLevelColors[log.level]}`}
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs uppercase font-mono border-current">
                          {log.level}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-mono border-current">
                          {log.stage}
                        </Badge>
                        <span className="font-medium">{log.message}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-60">
                          {formatInGermanTime(log.created_date, "dd.MM. HH:mm")}
                        </span>
                        {expandedLog === log.id
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />
                        }
                      </div>
                    </div>
                    {expandedLog === log.id && log.details && (
                      <pre className="mt-2 p-2 bg-white/50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(JSON.parse(log.details || "{}"), null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}

            <AlertDialog open={showClearLogsDialog} onOpenChange={setShowClearLogsDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alle Logs löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion löscht alle {logs.length} Log-Einträge dauerhaft.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearLogsMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}