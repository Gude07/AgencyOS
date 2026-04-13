import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Clock, Monitor, ChevronRight, X, BarChart2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const PAGE_LABELS = {
  Dashboard: "Dashboard",
  Players: "Spieler",
  Coaches: "Trainer",
  ClubRequests: "Vereinsanfragen",
  Tasks: "Aufgaben",
  Calendar: "Kalender",
  OrganizationalOverview: "Organisatorisches",
  Deals: "Deals",
  AIChat: "KI-Scout",
  AgenturGPT: "AgenturGPT",
  ClubProfiles: "Vereinsprofile",
  PlayerComparison: "Spieler-Vergleich",
  ClubAnalysis: "KI-Vereinsanalyse",
  MyActivity: "Meine Aktivitäten",
};

function formatDuration(seconds) {
  if (!seconds || seconds < 60) return `${Math.round(seconds || 0)}s`;
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function formatLastSeen(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std`;
  return date.toLocaleDateString("de-DE");
}

export default function TeamActivityPanel({ agencyId }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const today = new Date().toISOString().split("T")[0];

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["user-activity-today", agencyId, today],
    queryFn: async () => {
      const all = await base44.entities.UserActivity.filter({ agency_id: agencyId, session_date: today });
      return all;
    },
    enabled: !!agencyId,
    refetchInterval: 30000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["team-users"],
    queryFn: () => base44.entities.User.list(),
  });

  // Group by user: total time today, last page, last seen
  const userStats = React.useMemo(() => {
    const map = {};
    for (const a of activities) {
      if (!map[a.user_email]) {
        map[a.user_email] = {
          email: a.user_email,
          name: a.user_name || a.user_email,
          totalSeconds: 0,
          lastPage: null,
          lastSeen: null,
          pagesVisited: new Set(),
        };
      }
      map[a.user_email].totalSeconds += a.duration_seconds || 0;
      map[a.user_email].pagesVisited.add(a.page_name);
      const seenAt = new Date(a.last_seen_at || a.updated_date || a.created_date);
      if (!map[a.user_email].lastSeen || seenAt > new Date(map[a.user_email].lastSeen)) {
        map[a.user_email].lastSeen = a.last_seen_at || a.updated_date || a.created_date;
        map[a.user_email].lastPage = a.page_name;
      }
    }
    return Object.values(map).sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
  }, [activities]);

  // Per-page breakdown for selected user
  const userPageBreakdown = useMemo(() => {
    if (!selectedUser) return [];
    const userActivities = activities.filter(a => a.user_email === selectedUser.email);
    const pageMap = {};
    for (const a of userActivities) {
      if (!pageMap[a.page_name]) pageMap[a.page_name] = 0;
      pageMap[a.page_name] += a.duration_seconds || 0;
    }
    const total = Object.values(pageMap).reduce((s, v) => s + v, 0);
    return Object.entries(pageMap)
      .map(([page, seconds]) => ({ page, seconds, percent: total > 0 ? Math.round((seconds / total) * 100) : 0 }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [selectedUser, activities]);

  if (isLoading) {
    return (
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-6 text-center text-slate-400 text-sm">Lade Team-Aktivitäten...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Team-Aktivität heute
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {userStats.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Monitor className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Noch keine Aktivität heute</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {userStats.map((u) => (
              <div
                key={u.email}
                onClick={() => setSelectedUser(u)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 dark:text-blue-300 font-bold text-sm">
                    {u.name?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{u.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Zuletzt: {PAGE_LABELS[u.lastPage] || u.lastPage || "—"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(u.totalSeconds)} heute
                  </span>
                  <span className="text-xs text-slate-400">{formatLastSeen(u.lastSeen)}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Detail Dialog */}
    <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            Aktivität heute – {selectedUser?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 py-2">
          <div className="flex justify-between text-xs text-slate-500 mb-3">
            <span>Gesamtzeit heute</span>
            <span className="font-semibold text-slate-700">{formatDuration(selectedUser?.totalSeconds)}</span>
          </div>
          {userPageBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Keine Seitendetails verfügbar</p>
          ) : (
            <div className="space-y-3">
              {userPageBreakdown.map(({ page, seconds, percent }) => (
                <div key={page}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {PAGE_LABELS[page] || page}
                    </span>
                    <span className="text-slate-500 text-xs">{formatDuration(seconds)} ({percent}%)</span>
                  </div>
                  <Progress value={percent} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}