import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, 
  Users, 
  Building2, 
  FileText, 
  CheckSquare,
  Calendar,
  TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function MyActivity() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  // Aktuellen Benutzer laden
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Alle relevanten Daten laden
  const { data: playerComments = [] } = useQuery({
    queryKey: ['playerComments'],
    queryFn: () => base44.entities.PlayerComment.list('-created_date'),
    enabled: !!currentUser,
  });

  const { data: noteComments = [] } = useQuery({
    queryKey: ['noteComments'],
    queryFn: () => base44.entities.NoteComment.list('-created_date'),
    enabled: !!currentUser,
  });

  const { data: taskComments = [] } = useQuery({
    queryKey: ['taskComments'],
    queryFn: () => base44.entities.Comment.list('-created_date'),
    enabled: !!currentUser,
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['communications'],
    queryFn: () => base44.entities.Communication.list('-date'),
    enabled: !!currentUser,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['internalNotes'],
    queryFn: () => base44.entities.InternalNote.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: clubRequests = [] } = useQuery({
    queryKey: ['clubRequests'],
    queryFn: () => base44.entities.ClubRequest.list(),
  });

  // Filtern nach aktuellem Benutzer
  const myPlayerComments = useMemo(() => {
    if (!currentUser) return [];
    return playerComments
      .filter(c => c.created_by === currentUser.email)
      .slice(0, 50);
  }, [playerComments, currentUser]);

  const myNoteComments = useMemo(() => {
    if (!currentUser) return [];
    return noteComments
      .filter(c => c.created_by === currentUser.email)
      .slice(0, 50);
  }, [noteComments, currentUser]);

  const myTaskComments = useMemo(() => {
    if (!currentUser) return [];
    return taskComments
      .filter(c => c.created_by === currentUser.email)
      .slice(0, 50);
  }, [taskComments, currentUser]);

  const myCommunications = useMemo(() => {
    if (!currentUser) return [];
    return communications
      .filter(c => c.created_by === currentUser.email)
      .slice(0, 50);
  }, [communications, currentUser]);

  // Alle Aktivitäten kombinieren und sortieren
  const allActivities = useMemo(() => {
    const activities = [];

    // Spieler-Kommentare
    myPlayerComments.forEach(comment => {
      const player = players.find(p => p.id === comment.player_id);
      if (player) {
        activities.push({
          type: 'player_comment',
          date: comment.created_date,
          title: `Kommentar zu Spieler: ${player.name}`,
          subtitle: player.position + (player.current_club ? ` • ${player.current_club}` : ''),
          content: comment.content,
          link: `PlayerDetail?id=${player.id}`,
          icon: Users,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
        });
      }
    });

    // Notiz-Kommentare
    myNoteComments.forEach(comment => {
      const note = notes.find(n => n.id === comment.note_id);
      if (note) {
        activities.push({
          type: 'note_comment',
          date: comment.created_date,
          title: `Kommentar zu Notiz: ${note.title}`,
          subtitle: note.category,
          content: comment.content,
          link: `NoteDetail?id=${note.id}`,
          icon: FileText,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
        });
      }
    });

    // Task-Kommentare
    myTaskComments.forEach(comment => {
      const task = tasks.find(t => t.id === comment.task_id);
      if (task) {
        activities.push({
          type: 'task_comment',
          date: comment.created_date,
          title: `Kommentar zu Aufgabe: ${task.title}`,
          subtitle: task.category,
          content: comment.content,
          link: `TaskDetail?id=${task.id}`,
          icon: CheckSquare,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        });
      }
    });

    // Kommunikationen
    myCommunications.forEach(comm => {
      const request = clubRequests.find(r => r.id === comm.club_request_id);
      if (request) {
        activities.push({
          type: 'communication',
          date: comm.date,
          title: `Kommunikation: ${comm.subject}`,
          subtitle: `${request.club_name} • ${comm.type}`,
          content: comm.details,
          link: `ClubRequestDetail?id=${request.id}&tab=communication`,
          icon: Building2,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
        });
      }
    });

    // Sortieren nach Datum (neueste zuerst)
    return activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [myPlayerComments, myNoteComments, myTaskComments, myCommunications, players, notes, tasks, clubRequests]);

  // Filtern nach Tab
  const filteredActivities = useMemo(() => {
    if (activeTab === 'all') return allActivities;
    return allActivities.filter(a => a.type === activeTab);
  }, [allActivities, activeTab]);

  // Statistiken
  const stats = {
    total: allActivities.length,
    playerComments: myPlayerComments.length,
    noteComments: myNoteComments.length,
    taskComments: myTaskComments.length,
    communications: myCommunications.length,
  };

  const handleActivityClick = (activity) => {
    navigate(createPageUrl(activity.link.split('?')[0]) + '?' + activity.link.split('?')[1]);
  };

  if (!currentUser) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Meine Aktivitäten</h1>
          <p className="text-slate-600 mt-1">
            Übersicht über alle deine Kommentare und Einträge
          </p>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <p className="text-xs text-slate-500">Gesamt</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-slate-500">Spieler</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.playerComments}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-orange-600" />
                <p className="text-xs text-slate-500">Vereine</p>
              </div>
              <p className="text-2xl font-bold text-orange-900">{stats.communications}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-purple-600" />
                <p className="text-xs text-slate-500">Notizen</p>
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats.noteComments}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckSquare className="w-4 h-4 text-green-600" />
                <p className="text-xs text-slate-500">Aufgaben</p>
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.taskComments}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              Alle ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="player_comment" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Spieler ({stats.playerComments})
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Vereine ({stats.communications})
            </TabsTrigger>
            <TabsTrigger value="note_comment" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notizen ({stats.noteComments})
            </TabsTrigger>
            <TabsTrigger value="task_comment" className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Aufgaben ({stats.taskComments})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
            {filteredActivities.length === 0 ? (
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Noch keine Aktivitäten vorhanden</p>
                </CardContent>
              </Card>
            ) : (
              filteredActivities.map((activity, index) => (
                <Card 
                  key={index}
                  className="border-slate-200 bg-white hover:shadow-md cursor-pointer transition-all"
                  onClick={() => handleActivityClick(activity)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-lg ${activity.bgColor} flex-shrink-0`}>
                        <activity.icon className={`w-5 h-5 ${activity.color}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h3 className="font-semibold text-slate-900">{activity.title}</h3>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {format(new Date(activity.date), "dd.MM.yyyy HH:mm", { locale: de })}
                          </span>
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-2">{activity.subtitle}</p>
                        
                        {activity.content && (
                          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg line-clamp-3">
                            {activity.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}