import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  FileText,
  CheckSquare,
  TrendingUp,
  Search,
  Activity,
  Clock,
  Mail,
  Shield,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

const ACCESS_PASSWORD = "AdminActivity2026!";

export default function UserActivityOverview() {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("userActivityUnlocked") === "true");

  const handleUnlock = (e) => {
    e.preventDefault();
    if (passwordInput === ACCESS_PASSWORD) {
      sessionStorage.setItem("userActivityUnlocked", "true");
      setUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  // Aktuellen Admin laden
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  // Alle Benutzer laden
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser,
  });

  // Alle Aktivitätsdaten laden
  const { data: playerComments = [] } = useQuery({
    queryKey: ["playerCommentsAll"],
    queryFn: () => base44.entities.PlayerComment.list("-created_date"),
  });

  const { data: noteComments = [] } = useQuery({
    queryKey: ["noteCommentsAll"],
    queryFn: () => base44.entities.NoteComment.list("-created_date"),
  });

  const { data: taskComments = [] } = useQuery({
    queryKey: ["taskCommentsAll"],
    queryFn: () => base44.entities.Comment.list("-created_date"),
  });

  const { data: communications = [] } = useQuery({
    queryKey: ["communicationsAll"],
    queryFn: () => base44.entities.Communication.list("-date"),
  });

  const { data: players = [] } = useQuery({
    queryKey: ["playersAll"],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["internalNotesAll"],
    queryFn: () => base44.entities.InternalNote.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasksAll"],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: clubRequests = [] } = useQuery({
    queryKey: ["clubRequestsAll"],
    queryFn: () => base44.entities.ClubRequest.list(),
  });

  // Seitenbesuche & Klicks laden
  const { data: userActivitiesLog = [] } = useQuery({
    queryKey: ["userActivitiesLog"],
    queryFn: () => base44.entities.UserActivity.list("-last_seen_at", 500),
  });

  // Alle Aktivitäten pro Benutzer aggregieren
  const userActivities = useMemo(() => {
    if (!users.length) return [];

    // Alle Aktivitäten sammeln mit created_by (E-Mail)
    const allItems = [];

    playerComments.forEach((c) => {
      const player = players.find((p) => p.id === c.player_id);
      allItems.push({
        user_email: c.created_by,
        type: "player_comment",
        date: c.created_date,
        title: `Kommentar zu Spieler: ${player?.name || "Unbekannt"}`,
        subtitle: player?.position + (player?.current_club ? ` • ${player.current_club}` : ""),
        content: c.content,
        icon: Users,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
      });
    });

    noteComments.forEach((c) => {
      const note = notes.find((n) => n.id === c.note_id);
      allItems.push({
        user_email: c.created_by,
        type: "note_comment",
        date: c.created_date,
        title: `Kommentar zu Notiz: ${note?.title || "Unbekannt"}`,
        subtitle: note?.category || "",
        content: c.content,
        icon: FileText,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
      });
    });

    taskComments.forEach((c) => {
      const task = tasks.find((t) => t.id === c.task_id);
      allItems.push({
        user_email: c.created_by,
        type: "task_comment",
        date: c.created_date,
        title: `Kommentar zu Aufgabe: ${task?.title || "Unbekannt"}`,
        subtitle: task?.category || "",
        content: c.content,
        icon: CheckSquare,
        color: "text-green-600",
        bgColor: "bg-green-100",
      });
    });

    communications.forEach((c) => {
      const request = clubRequests.find((r) => r.id === c.club_request_id);
      allItems.push({
        user_email: c.created_by,
        type: "communication",
        date: c.date,
        title: `Kommunikation: ${c.subject || ""}`,
        subtitle: `${request?.club_name || ""} • ${c.type || ""}`,
        content: c.details,
        icon: Building2,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
      });
    });

    // Seitenbesuche & Klicks aus UserActivity-Log
    userActivitiesLog.forEach((a) => {
      const isClick = a.page_name?.startsWith("Klick: ");
      allItems.push({
        user_email: a.user_email,
        type: isClick ? "click" : "page_visit",
        date: a.last_seen_at || a.session_date,
        title: isClick ? a.page_name : `Seite besucht: ${a.page_name}`,
        subtitle: a.duration_seconds > 0 ? `${Math.round(a.duration_seconds / 60)}m ${a.duration_seconds % 60}s verweilt` : "",
        content: "",
        icon: isClick ? Activity : TrendingUp,
        color: isClick ? "text-slate-600" : "text-indigo-600",
        bgColor: isClick ? "bg-slate-100" : "bg-indigo-100",
      });
    });

    // Nach Benutzer gruppieren
    const byUser = {};
    users.forEach((u) => {
      byUser[u.email] = {
        user: u,
        activities: [],
        counts: { player_comment: 0, note_comment: 0, task_comment: 0, communication: 0, page_visit: 0, click: 0 },
        lastActivity: null,
      };
    });

    allItems.forEach((item) => {
      if (byUser[item.user_email]) {
        byUser[item.user_email].activities.push(item);
        byUser[item.user_email].counts[item.type] = (byUser[item.user_email].counts[item.type] || 0) + 1;
        if (!byUser[item.user_email].lastActivity || new Date(item.date) > new Date(byUser[item.user_email].lastActivity)) {
          byUser[item.user_email].lastActivity = item.date;
        }
      }
    });

    // Sortieren: zuletzt aktiv zuerst
    return Object.values(byUser).sort((a, b) => {
      if (!a.lastActivity && !b.lastActivity) return 0;
      if (!a.lastActivity) return 1;
      if (!b.lastActivity) return -1;
      return new Date(b.lastActivity) - new Date(a.lastActivity);
    });
  }, [users, playerComments, noteComments, taskComments, communications, players, notes, tasks, clubRequests, userActivitiesLog]);

  const filteredUsers = useMemo(() => {
    if (!search) return userActivities;
    const q = search.toLowerCase();
    return userActivities.filter(
      (ua) =>
        ua.user.full_name?.toLowerCase().includes(q) ||
        ua.user.email?.toLowerCase().includes(q)
    );
  }, [userActivities, search]);

  const selectedUserActivities = useMemo(() => {
    if (!selectedUser) return [];
    return selectedUser.activities
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50);
  }, [selectedUser]);

  const totalActivities = userActivities.reduce((sum, ua) => sum + ua.activities.length, 0);
  const activeUsers = userActivities.filter((ua) => ua.activities.length > 0).length;

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Diese Seite ist nur für Administratoren zugänglich.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Passwort-Schutz
  if (!unlocked) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Card className="max-w-md w-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-slate-500 dark:text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Passwort erforderlich</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Bitte geben Sie das Admin-Passwort ein, um die Benutzer-Aktivitäten einzusehen.
              </p>
            </div>
            <form onSubmit={handleUnlock} className="space-y-4">
              <Input
                type="password"
                placeholder="Passwort"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                className="bg-white dark:bg-slate-800"
                autoFocus
              />
              {passwordError && (
                <p className="text-sm text-red-600 dark:text-red-400">Falsches Passwort. Bitte erneut versuchen.</p>
              )}
              <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white">
                Entsperren
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Benutzer-Aktivitäten</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Übersicht über alle Aktionen der Benutzer in Ihrer Agentur
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { sessionStorage.removeItem("userActivityUnlocked"); setUnlocked(false); setPasswordInput(""); }}
            className="flex items-center gap-2 border-slate-300 dark:border-slate-700"
          >
            <Shield className="w-4 h-4" /> Sperren
          </Button>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-slate-500" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Benutzer gesamt</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-green-600" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Aktive Benutzer</p>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{activeUsers}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Aktivitäten gesamt</p>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-400">{totalActivities}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-600" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Letzte Aktivität</p>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {userActivities[0]?.lastActivity
                  ? formatDistanceToNow(new Date(userActivities[0].lastActivity), { addSuffix: true, locale: de })
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Suche */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Benutzer suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-900"
          />
        </div>

        {/* Benutzertabelle */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Benutzer-Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-left">
                      <th className="pb-3 pl-2 font-medium text-slate-500 dark:text-slate-400">Benutzer</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Rolle</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400 text-center">Spieler</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400 text-center">Vereine</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400 text-center">Notizen</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400 text-center">Aufgaben</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400 text-center">Seiten</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400 text-center">Klicks</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400 text-center">Gesamt</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Letzte Aktivität</th>
                      <th className="pb-3 pr-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((ua) => (
                      <tr
                        key={ua.user.id}
                        className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedUser(ua)}
                      >
                        <td className="py-3 pl-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                                {ua.user.full_name?.[0]?.toUpperCase() || "?"}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white truncate">
                                {ua.user.full_name || "Unbenannt"}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{ua.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge variant={ua.user.role === "admin" ? "default" : "secondary"}>
                            {ua.user.role === "admin" ? "Admin" : "Benutzer"}
                          </Badge>
                        </td>
                        <td className="py-3 text-center text-slate-700 dark:text-slate-300">{ua.counts.player_comment}</td>
                        <td className="py-3 text-center text-slate-700 dark:text-slate-300">{ua.counts.communication}</td>
                        <td className="py-3 text-center text-slate-700 dark:text-slate-300">{ua.counts.note_comment}</td>
                        <td className="py-3 text-center text-slate-700 dark:text-slate-300">{ua.counts.task_comment}</td>
                        <td className="py-3 text-center text-slate-700 dark:text-slate-300">{ua.counts.page_visit}</td>
                        <td className="py-3 text-center text-slate-700 dark:text-slate-300">{ua.counts.click}</td>
                        <td className="py-3 text-center">
                          <span className="font-bold text-slate-900 dark:text-white">{ua.activities.length}</span>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {ua.lastActivity
                            ? format(new Date(ua.lastActivity), "dd.MM.yyyy HH:mm", { locale: de })
                            : "—"}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          {ua.activities.length > 0 && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Details →</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-500 dark:text-slate-400">
                          Keine Benutzer gefunden
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail-Dialog */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <Card
            className="max-w-2xl w-full max-h-[80vh] overflow-hidden bg-white dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      {selectedUser.user.full_name?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-slate-900 dark:text-white">
                      {selectedUser.user.full_name || "Unbenannt"}
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {selectedUser.user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(80vh - 100px)" }}>
              {selectedUserActivities.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">Keine Aktivitäten vorhanden</p>
              ) : (
                selectedUserActivities.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className={`p-2 rounded-lg ${activity.bgColor} flex-shrink-0`}>
                      <activity.icon className={`w-4 h-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm text-slate-900 dark:text-white">{activity.title}</h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {format(new Date(activity.date), "dd.MM.yyyy HH:mm", { locale: de })}
                        </span>
                      </div>
                      {activity.subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{activity.subtitle}</p>
                      )}
                      {activity.content && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{activity.content}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}