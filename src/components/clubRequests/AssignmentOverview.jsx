import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  in_bearbeitung: "bg-blue-100 text-blue-800 border-blue-200",
  angebote_gesendet: "bg-purple-100 text-purple-800 border-purple-200",
};

const priorityColors = {
  dringend: "bg-red-100 text-red-800 border-red-200",
  hoch: "bg-orange-100 text-orange-800 border-orange-200",
  mittel: "bg-yellow-100 text-yellow-800 border-yellow-200",
  niedrig: "bg-green-100 text-green-800 border-green-200",
};

export default function AssignmentOverview() {
  const navigate = useNavigate();

  const [sortOrder, setSortOrder] = React.useState("created_date_desc");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterPriority, setFilterPriority] = React.useState("all");

  const { data: requests = [] } = useQuery({
    queryKey: ['clubRequests'],
    queryFn: () => base44.entities.ClubRequest.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Nur Anfragen mit Status in_bearbeitung oder angebote_gesendet
  const activeRequests = requests.filter(r => 
    r.status === 'in_bearbeitung' || r.status === 'angebote_gesendet'
  );

  // Gruppiere nach zuständiger Person
  const assignmentsByUser = {};
  
  activeRequests.forEach(request => {
    if (request.assigned_to && request.assigned_to.length > 0) {
      request.assigned_to.forEach(email => {
        if (!assignmentsByUser[email]) {
          assignmentsByUser[email] = [];
        }
        assignmentsByUser[email].push(request);
      });
    }
  });

  // Nicht zugewiesene Anfragen
  const unassignedRequests = activeRequests.filter(
    r => !r.assigned_to || r.assigned_to.length === 0
  );

  const sortRequests = (requestsToSort) => {
    return [...requestsToSort].sort((a, b) => {
      if (sortOrder === "created_date_asc") {
        return new Date(a.created_date) - new Date(b.created_date);
      } else if (sortOrder === "created_date_desc") {
        return new Date(b.created_date) - new Date(a.created_date);
      } else if (sortOrder === "priority_desc") {
        const priorityOrder = { dringend: 4, hoch: 3, mittel: 2, niedrig: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      }
      return 0;
    });
  };

  const filterAndSortRequests = (requestsToProcess) => {
    const filtered = requestsToProcess.filter(request => {
      const statusMatch = filterStatus === "all" || request.status === filterStatus;
      const priorityMatch = filterPriority === "all" || request.priority === filterPriority;
      return statusMatch && priorityMatch;
    });
    return sortRequests(filtered);
  };

  const assignedAndSorted = Object.entries(assignmentsByUser).map(([email, userRequests]) => {
    return [email, filterAndSortRequests(userRequests)];
  }).filter(([email, userRequests]) => userRequests.length > 0);

  const unassignedAndSorted = filterAndSortRequests(unassignedRequests);

  if (activeRequests.length === 0) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">Keine aktiven Anfragen in Bearbeitung</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Zuständigkeiten Übersicht
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                  <SelectItem value="angebote_gesendet">Angebote gesendet</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priorität" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Prioritäten</SelectItem>
                  <SelectItem value="dringend">Dringend</SelectItem>
                  <SelectItem value="hoch">Hoch</SelectItem>
                  <SelectItem value="mittel">Mittel</SelectItem>
                  <SelectItem value="niedrig">Niedrig</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sortieren" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_date_desc">Neueste zuerst</SelectItem>
                  <SelectItem value="created_date_asc">Älteste zuerst</SelectItem>
                  <SelectItem value="priority_desc">Nach Priorität</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedAndSorted.map(([email, userRequests]) => {
              const user = users.find(u => u.email === email);
              return (
                <div key={email} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                      <span className="text-blue-800 font-bold">
                        {user?.full_name?.[0]?.toUpperCase() || email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{user?.full_name || email}</p>
                      <p className="text-xs text-slate-500">{userRequests.length} Anfrage(n)</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {userRequests.map(request => (
                      <div 
                        key={request.id}
                        onClick={() => navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id + "&back=" + encodeURIComponent(window.location.pathname + window.location.search + (window.location.search ? '&' : '?') + "scrollY=" + window.scrollY))}
                        className="p-2 bg-white rounded border border-slate-200 hover:border-blue-300 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-medium text-sm text-slate-900 flex-1 min-w-0 truncate">{request.club_name}</span>
                          <div className="flex flex-col gap-1 items-end flex-shrink-0">
                            <Badge variant="secondary" className={priorityColors[request.priority] + " border text-xs px-1.5 py-0"}>
                              {request.priority}
                            </Badge>
                            <Badge variant="secondary" className={statusColors[request.status] + " border text-xs px-1.5 py-0"}>
                              {request.status === 'in_bearbeitung' ? 'In Bearb.' : 'Angebote'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">{request.position_needed}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {unassignedAndSorted.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                    <span className="text-amber-800 font-bold">?</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Nicht zugewiesen</p>
                    <p className="text-xs text-amber-700">{unassignedAndSorted.length} Anfrage(n)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {unassignedAndSorted.map(request => (
                    <div 
                      key={request.id}
                      onClick={() => navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id + "&back=" + encodeURIComponent(window.location.pathname + window.location.search + (window.location.search ? '&' : '?') + "scrollY=" + window.scrollY))}
                      className="p-2 bg-white rounded border border-amber-200 hover:border-amber-400 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-slate-900 flex-1 min-w-0 truncate">{request.club_name}</span>
                        <div className="flex flex-col gap-1 items-end flex-shrink-0">
                          <Badge variant="secondary" className={priorityColors[request.priority] + " border text-xs px-1.5 py-0"}>
                            {request.priority}
                          </Badge>
                          <Badge variant="secondary" className={statusColors[request.status] + " border text-xs px-1.5 py-0"}>
                            {request.status === 'in_bearbeitung' ? 'In Bearb.' : 'Angebote'}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{request.position_needed}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}