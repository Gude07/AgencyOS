import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  CheckSquare, 
  Calendar, 
  Building2, 
  AlertTriangle,
  Users,
  Briefcase,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import TaskCard from "../tasks/TaskCard";
import { Button } from "@/components/ui/button";

export default function DashboardWidget({ widget }) {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const all = await base44.entities.Task.list('-created_date');
      return all.filter(t => t.agency_id === user?.agency_id);
    },
    enabled: !!user && ['my_open_tasks', 'overdue_tasks'].includes(widget.widget_type)
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const all = await base44.entities.Meeting.list('-start_date');
      return all.filter(m => m.agency_id === user?.agency_id);
    },
    enabled: !!user && widget.widget_type === 'upcoming_meetings'
  });

  const { data: clubRequests = [] } = useQuery({
    queryKey: ['club-requests'],
    queryFn: async () => {
      const all = await base44.entities.ClubRequest.list('-created_date');
      return all.filter(r => r.agency_id === user?.agency_id);
    },
    enabled: !!user && widget.widget_type === 'new_club_requests'
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const all = await base44.entities.Player.list('-created_date');
      return all.filter(p => p.agency_id === user?.agency_id);
    },
    enabled: !!user && widget.widget_type === 'recent_players'
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const all = await base44.entities.Deal.list('-created_date');
      return all.filter(d => d.agency_id === user?.agency_id);
    },
    enabled: !!user && widget.widget_type === 'recent_deals'
  });

  const renderContent = () => {
    const maxItems = widget.settings?.max_items || 5;

    switch (widget.widget_type) {
      case 'my_open_tasks': {
        const myTasks = tasks.filter(t => {
          const assigned = Array.isArray(t.assigned_to) ? t.assigned_to : [];
          return assigned.includes(user?.email) && t.status !== 'abgeschlossen';
        }).slice(0, maxItems);

        return (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                  Meine offenen Aufgaben
                </CardTitle>
                <Link to={createPageUrl("Tasks")}>
                  <Button variant="ghost" size="sm">
                    Alle <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {myTasks.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Keine offenen Aufgaben</p>
              ) : (
                myTasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </CardContent>
          </Card>
        );
      }

      case 'upcoming_meetings': {
        const upcoming = meetings.filter(m => {
          const start = new Date(m.start_date);
          return start > new Date();
        }).slice(0, maxItems);

        return (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Bevorstehende Meetings
                </CardTitle>
                <Link to={createPageUrl("Calendar")}>
                  <Button variant="ghost" size="sm">
                    Alle <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {upcoming.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Keine bevorstehenden Meetings</p>
              ) : (
                upcoming.map(meeting => (
                  <Link key={meeting.id} to={createPageUrl("MeetingDetail") + `?id=${meeting.id}`}>
                    <div className="p-3 border rounded-lg hover:bg-slate-50">
                      <p className="font-medium text-sm">{meeting.title}</p>
                      <p className="text-xs text-slate-600">
                        {new Date(meeting.start_date).toLocaleDateString('de-DE')} {new Date(meeting.start_date).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        );
      }

      case 'new_club_requests': {
        const recent = clubRequests.slice(0, maxItems);

        return (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Neue Vereinsanfragen
                </CardTitle>
                <Link to={createPageUrl("ClubRequests")}>
                  <Button variant="ghost" size="sm">
                    Alle <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {recent.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Keine neuen Anfragen</p>
              ) : (
                recent.map(request => (
                  <Link key={request.id} to={createPageUrl("ClubRequestDetail") + `?id=${request.id}`}>
                    <div className="p-3 border rounded-lg hover:bg-slate-50">
                      <p className="font-medium text-sm">{request.club_name}</p>
                      <p className="text-xs text-slate-600">{request.position_needed}</p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        );
      }

      case 'overdue_tasks': {
        const overdue = tasks.filter(t => {
          if (t.status === 'abgeschlossen' || !t.deadline) return false;
          return new Date(t.deadline) < new Date();
        }).slice(0, maxItems);

        return (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Überfällige Aufgaben
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {overdue.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Keine überfälligen Aufgaben</p>
              ) : (
                overdue.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </CardContent>
          </Card>
        );
      }

      case 'recent_players': {
        const recent = players.slice(0, maxItems);

        return (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Neueste Spieler
                </CardTitle>
                <Link to={createPageUrl("Players")}>
                  <Button variant="ghost" size="sm">
                    Alle <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {recent.map(player => (
                <Link key={player.id} to={createPageUrl("PlayerDetail") + `?id=${player.id}`}>
                  <div className="p-3 border rounded-lg hover:bg-slate-50">
                    <p className="font-medium text-sm">{player.name}</p>
                    <p className="text-xs text-slate-600">{player.position} • {player.current_club}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        );
      }

      case 'recent_deals': {
        const active = deals.filter(d => 
          d.status !== 'abgeschlossen' && d.status !== 'abgelehnt'
        ).slice(0, maxItems);

        return (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-amber-600" />
                  Aktive Deals
                </CardTitle>
                <Link to={createPageUrl("Deals")}>
                  <Button variant="ghost" size="sm">
                    Alle <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {active.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Keine aktiven Deals</p>
              ) : (
                active.map(deal => (
                  <Link key={deal.id} to={createPageUrl("DealDetail") + `?id=${deal.id}`}>
                    <div className="p-3 border rounded-lg hover:bg-slate-50">
                      <p className="font-medium text-sm">{deal.title}</p>
                      <p className="text-xs text-slate-600">{deal.status}</p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        );
      }

      case 'stats_overview': {
        const openTasks = tasks.filter(t => t.status !== 'abgeschlossen').length;
        const activeDeals = deals.filter(d => d.status !== 'abgeschlossen' && d.status !== 'abgelehnt').length;
        const openRequests = clubRequests.filter(r => r.status === 'offen').length;

        return (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Übersicht
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{openTasks}</p>
                  <p className="text-xs text-slate-600">Offene Aufgaben</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{activeDeals}</p>
                  <p className="text-xs text-slate-600">Aktive Deals</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{openRequests}</p>
                  <p className="text-xs text-slate-600">Offene Anfragen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }

      default:
        return null;
    }
  };

  if (!widget.is_visible) return null;

  return renderContent();
}