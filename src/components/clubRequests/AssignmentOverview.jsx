import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  in_bearbeitung: "bg-blue-100 text-blue-800 border-blue-200",
  angebote_gesendet: "bg-purple-100 text-purple-800 border-purple-200",
};

export default function AssignmentOverview() {
  const navigate = useNavigate();

  const { data: requests = [] } = useQuery({
    queryKey: ['clubRequests'],
    queryFn: () => base44.entities.ClubRequest.list('-created_date'),
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
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Zuständigkeiten Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(assignmentsByUser).map(([email, userRequests]) => {
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
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm text-slate-900 truncate">{request.club_name}</span>
                          <Badge variant="secondary" className={statusColors[request.status] + " border text-xs"}>
                            {request.status === 'in_bearbeitung' ? 'In Bearb.' : 'Angebote'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{request.position_needed}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {unassignedRequests.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                    <span className="text-amber-800 font-bold">?</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Nicht zugewiesen</p>
                    <p className="text-xs text-amber-700">{unassignedRequests.length} Anfrage(n)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {unassignedRequests.map(request => (
                    <div 
                      key={request.id}
                      onClick={() => navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id + "&back=" + encodeURIComponent(window.location.pathname + window.location.search + (window.location.search ? '&' : '?') + "scrollY=" + window.scrollY))}
                      className="p-2 bg-white rounded border border-amber-200 hover:border-amber-400 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm text-slate-900 truncate">{request.club_name}</span>
                        <Badge variant="secondary" className={statusColors[request.status] + " border text-xs"}>
                          {request.status === 'in_bearbeitung' ? 'In Bearb.' : 'Angebote'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{request.position_needed}</p>
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