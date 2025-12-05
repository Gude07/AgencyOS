import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Search, Building2, ChevronDown, ChevronRight, Users, FileText, MapPin, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const priorityColors = {
  niedrig: "bg-emerald-100 text-emerald-800 border-emerald-200",
  mittel: "bg-yellow-100 text-yellow-800 border-yellow-200",
  hoch: "bg-orange-100 text-orange-800 border-orange-200",
  dringend: "bg-red-100 text-red-800 border-red-200",
};

const statusColors = {
  offen: "bg-slate-100 text-slate-800 border-slate-200",
  in_bearbeitung: "bg-blue-100 text-blue-800 border-blue-200",
  angebote_gesendet: "bg-purple-100 text-purple-800 border-purple-200",
  abgeschlossen: "bg-green-100 text-green-800 border-green-200",
  abgelehnt: "bg-red-100 text-red-800 border-red-200",
};

export default function ClubsOverview() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  
  const [searchTerm, setSearchTerm] = useState(urlParams.get('search') || "");
  const [filterCountry, setFilterCountry] = useState(urlParams.get('country') || "alle");
  const [filterHasActive, setFilterHasActive] = useState(urlParams.get('hasActive') || "alle");
  const [expandedClubs, setExpandedClubs] = useState(new Set());

  // Restore scroll position on mount
  React.useEffect(() => {
    const scrollY = urlParams.get('scrollY');
    if (scrollY) {
      setTimeout(() => window.scrollTo(0, parseInt(scrollY)), 100);
    }
  }, []);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['clubRequests'],
    queryFn: () => base44.entities.ClubRequest.list('-created_date'),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  // Spieler die "bei Verein angeboten" sind
  const offeredPlayers = useMemo(() => {
    return players.filter(p => p.status === 'bei_verein_angeboten');
  }, [players]);

  // Gruppiere Anfragen nach Vereinsname
  const clubsGrouped = useMemo(() => {
    const grouped = {};
    
    requests.forEach(request => {
      const clubName = request.club_name?.trim() || "Unbekannt";
      if (!grouped[clubName]) {
        grouped[clubName] = {
          name: clubName,
          country: request.country,
          league: request.league,
          contact_person: request.contact_person,
          contact_email: request.contact_email,
          contact_phone: request.contact_phone,
          requests: [],
        };
      }
      grouped[clubName].requests.push(request);
      // Update contact info if newer request has it
      if (request.contact_person) grouped[clubName].contact_person = request.contact_person;
      if (request.contact_email) grouped[clubName].contact_email = request.contact_email;
      if (request.contact_phone) grouped[clubName].contact_phone = request.contact_phone;
      if (request.league) grouped[clubName].league = request.league;
      if (request.country) grouped[clubName].country = request.country;
    });

    return Object.values(grouped).map(club => ({
      ...club,
      activeCount: club.requests.filter(r => 
        r.status === 'offen' || r.status === 'in_bearbeitung' || r.status === 'angebote_gesendet'
      ).length,
      totalCount: club.requests.length,
    }));
  }, [requests]);

  const filteredClubs = useMemo(() => {
    return clubsGrouped.filter(club => {
      const matchesSearch = searchTerm === "" || 
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.league?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCountry = filterCountry === "alle" || club.country === filterCountry;
      
      const matchesActive = filterHasActive === "alle" || 
        (filterHasActive === "aktiv" && club.activeCount > 0) ||
        (filterHasActive === "keine" && club.activeCount === 0);
      
      return matchesSearch && matchesCountry && matchesActive;
    }).sort((a, b) => b.activeCount - a.activeCount || a.name.localeCompare(b.name));
  }, [clubsGrouped, searchTerm, filterCountry, filterHasActive]);

  const uniqueCountries = [...new Set(requests.map(r => r.country).filter(Boolean))].sort();

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterCountry !== 'alle') params.set('country', filterCountry);
    if (filterHasActive !== 'alle') params.set('hasActive', filterHasActive);
    
    const newSearch = params.toString();
    const currentSearch = window.location.search.slice(1);
    
    if (newSearch !== currentSearch) {
      window.history.replaceState(null, '', `?${newSearch}`);
    }
  }, [searchTerm, filterCountry, filterHasActive]);

  const toggleClub = (clubName) => {
    setExpandedClubs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clubName)) {
        newSet.delete(clubName);
      } else {
        newSet.add(clubName);
      }
      return newSet;
    });
  };

  const navigateToRequest = (requestId) => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterCountry !== 'alle') params.set('country', filterCountry);
    if (filterHasActive !== 'alle') params.set('hasActive', filterHasActive);
    params.set('scrollY', window.scrollY.toString());
    navigate(createPageUrl("ClubRequestDetail") + "?id=" + requestId + "&back=" + encodeURIComponent(window.location.pathname + "?" + params.toString()));
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Vereine Übersicht</h1>
            <p className="text-slate-600 mt-1">{filteredClubs.length} Vereine mit {requests.length} Anfragen</p>
          </div>
          <Button 
            onClick={() => navigate(createPageUrl("ClubRequests"))}
            variant="outline"
          >
            Zur Listenansicht
          </Button>
        </div>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Verein, Liga oder Kontakt suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Land" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Länder</SelectItem>
                  {uniqueCountries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterHasActive} onValueChange={setFilterHasActive}>
                <SelectTrigger>
                  <SelectValue placeholder="Aktive Anfragen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Vereine</SelectItem>
                  <SelectItem value="aktiv">Mit aktiven Anfragen</SelectItem>
                  <SelectItem value="keine">Ohne aktive Anfragen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {filteredClubs.map(club => (
            <Collapsible 
              key={club.name} 
              open={expandedClubs.has(club.name)}
              onOpenChange={() => toggleClub(club.name)}
            >
              <Card className="border-slate-200 bg-white overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-blue-900" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{club.name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                            {club.league && <span>{club.league}</span>}
                            {club.league && club.country && <span>•</span>}
                            {club.country && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {club.country}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                            <FileText className="w-3 h-3 mr-1" />
                            {club.totalCount} Anfrage{club.totalCount !== 1 ? 'n' : ''}
                          </Badge>
                          {club.activeCount > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                              {club.activeCount} aktiv
                            </Badge>
                          )}
                        </div>
                        {expandedClubs.has(club.name) ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0 border-t border-slate-100">
                    {/* Kontaktinfo */}
                    {(club.contact_person || club.contact_email || club.contact_phone) && (
                      <div className="p-3 bg-slate-50 rounded-lg mb-4 text-sm">
                        <p className="font-semibold text-slate-700 mb-1">Kontakt</p>
                        {club.contact_person && <p className="text-slate-600">{club.contact_person}</p>}
                        {club.contact_email && <p className="text-slate-500">{club.contact_email}</p>}
                        {club.contact_phone && <p className="text-slate-500">{club.contact_phone}</p>}
                      </div>
                    )}
                    
                    {/* Anfragen Liste */}
                    <div className="space-y-2">
                      {club.requests
                        .sort((a, b) => {
                          // Aktive zuerst, dann nach Datum
                          const aActive = ['offen', 'in_bearbeitung', 'angebote_gesendet'].includes(a.status);
                          const bActive = ['offen', 'in_bearbeitung', 'angebote_gesendet'].includes(b.status);
                          if (aActive && !bActive) return -1;
                          if (!aActive && bActive) return 1;
                          return new Date(b.created_date) - new Date(a.created_date);
                        })
                        .map(request => (
                        <div 
                          key={request.id}
                          onClick={() => navigateToRequest(request.id)}
                          className="p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900">{request.position_needed}</span>
                                <Badge variant="secondary" className={priorityColors[request.priority] + " border text-xs"}>
                                  {request.priority}
                                </Badge>
                                <Badge variant="secondary" className={statusColors[request.status] + " border text-xs"}>
                                  {request.status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                                <span>
                                  Budget: {request.budget_min ? `${(request.budget_min / 1000000).toFixed(1)}M` : '?'} - 
                                  {request.budget_max ? ` ${(request.budget_max / 1000000).toFixed(1)}M €` : ' ?'}
                                </span>
                                <span>
                                  Alter: {request.age_min || '?'} - {request.age_max || '?'}
                                </span>
                                {request.transfer_period && (
                                  <span>{request.transfer_period}</span>
                                )}
                              </div>
                            </div>
    {(() => {
                              const placedPlayers = offeredPlayers.filter(p => 
                                request.shortlist?.includes(p.id)
                              );
                              return placedPlayers.length > 0 ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  {placedPlayers.length} angeboten
                                </Badge>
                              ) : request.shortlist?.length > 0 ? (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {request.shortlist.length}
                                </Badge>
                              ) : null;
                            })()}
                          </div>
                          
                          {/* Platzierte Spieler unter der Anfrage */}
                          {(() => {
                            const placedPlayers = offeredPlayers.filter(p => 
                              request.shortlist?.includes(p.id)
                            );
                            if (placedPlayers.length === 0) return null;
                            return (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  Bei Verein angeboten:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {placedPlayers.map(player => (
                                    <div 
                                      key={player.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const params = new URLSearchParams();
                                        if (searchTerm) params.set('search', searchTerm);
                                        if (filterCountry !== 'alle') params.set('country', filterCountry);
                                        if (filterHasActive !== 'alle') params.set('hasActive', filterHasActive);
                                        params.set('scrollY', window.scrollY.toString());
                                        navigate(createPageUrl("PlayerDetail") + "?id=" + player.id + "&back=" + encodeURIComponent(window.location.pathname + "?" + params.toString()));
                                      }}
                                      className="flex items-center gap-2 px-2 py-1 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 cursor-pointer transition-colors"
                                    >
                                      <span className="text-sm font-medium text-green-900">{player.name}</span>
                                      <span className="text-xs text-green-600">{player.position}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>

        {filteredClubs.length === 0 && (
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Keine Vereine gefunden</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}