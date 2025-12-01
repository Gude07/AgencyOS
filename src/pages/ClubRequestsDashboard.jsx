import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { Search, SlidersHorizontal, Building2, Users, Star, Eye, Pencil, TrendingUp, Clock, CheckCircle2, AlertCircle, ListChecks } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AssignmentOverview from "../components/clubRequests/AssignmentOverview";

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

export default function ClubRequestsDashboard() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  
  const [searchTerm, setSearchTerm] = useState(urlParams.get('search') || "");
  const [filterStatus, setFilterStatus] = useState(urlParams.get('status') || "alle");
  const [filterPriority, setFilterPriority] = useState(urlParams.get('priority') || "alle");
  const [filterCountry, setFilterCountry] = useState(urlParams.get('country') || "alle");
  const [filterPosition, setFilterPosition] = useState(urlParams.get('position') || "alle");
  const [filterShortlist, setFilterShortlist] = useState(urlParams.get('shortlist') || "alle");
  const [sortBy, setSortBy] = useState(urlParams.get('sortBy') || "-created_date");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['clubRequests'],
    queryFn: () => base44.entities.ClubRequest.list(),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const calculateMatchScore = (player, request) => {
    if (!request) return 0;

    const mainPositionMatch = player.position === request.position_needed;
    const secondaryPositionMatch = player.secondary_positions?.includes(request.position_needed);
    
    if (!mainPositionMatch && !secondaryPositionMatch) return 0;
    
    let totalWeight = 3;
    let achievedWeight = 0;

    if (mainPositionMatch) achievedWeight += 3;
    else if (secondaryPositionMatch) achievedWeight += 1.5;

    if (request.age_min && request.age_max && player.age >= request.age_min && player.age <= request.age_max) {
      totalWeight += 2;
      achievedWeight += 2;
    } else if (request.age_min || request.age_max) {
      totalWeight += 2;
    }

    if (request.budget_max && player.market_value && player.market_value <= request.budget_max) {
      totalWeight += 2;
      achievedWeight += 2;
    } else if (request.budget_max) {
      totalWeight += 2;
    }

    return totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;
  };

  const requestsWithMatches = useMemo(() => {
    return requests.map(request => {
      const matchingPlayers = players.filter(player => 
        calculateMatchScore(player, request) > 0
      );
      return {
        ...request,
        matchCount: matchingPlayers.length,
      };
    });
  }, [requests, players]);

  const filteredRequests = useMemo(() => {
    let filtered = requestsWithMatches.filter(request => {
      const matchesSearch = searchTerm === "" || 
        request.club_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.league?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "alle" || request.status === filterStatus;
      const matchesPriority = filterPriority === "alle" || request.priority === filterPriority;
      const matchesCountry = filterCountry === "alle" || request.country === filterCountry;
      const matchesPosition = filterPosition === "alle" || request.position_needed === filterPosition;
      
      const shortlistCount = request.shortlist?.length || 0;
      const matchesShortlist = filterShortlist === "alle" || 
                               (filterShortlist === "leer" && shortlistCount === 0) ||
                               (filterShortlist === "1-3" && shortlistCount >= 1 && shortlistCount <= 3) ||
                               (filterShortlist === "4-10" && shortlistCount >= 4 && shortlistCount <= 10) ||
                               (filterShortlist === "10+" && shortlistCount > 10);
      
      return matchesSearch && matchesStatus && matchesPriority && matchesCountry && matchesPosition && matchesShortlist;
    });

    filtered.sort((a, b) => {
      switch(sortBy) {
        case "-created_date":
          return new Date(b.created_date) - new Date(a.created_date);
        case "created_date":
          return new Date(a.created_date) - new Date(b.created_date);
        case "-matches":
          return b.matchCount - a.matchCount;
        case "matches":
          return a.matchCount - b.matchCount;
        case "priority":
          const priorityOrder = { dringend: 0, hoch: 1, mittel: 2, niedrig: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case "club_name":
          return a.club_name.localeCompare(b.club_name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [requestsWithMatches, searchTerm, filterStatus, filterPriority, filterCountry, filterPosition, filterShortlist, sortBy]);

  const uniqueCountries = [...new Set(requests.map(r => r.country).filter(Boolean))];
  const uniquePositions = [...new Set(requests.map(r => r.position_needed).filter(Boolean))];

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterStatus !== 'alle') params.set('status', filterStatus);
    if (filterPriority !== 'alle') params.set('priority', filterPriority);
    if (filterCountry !== 'alle') params.set('country', filterCountry);
    if (filterPosition !== 'alle') params.set('position', filterPosition);
    if (filterShortlist !== 'alle') params.set('shortlist', filterShortlist);
    if (sortBy !== '-created_date') params.set('sortBy', sortBy);
    
    const newSearch = params.toString();
    const currentSearch = window.location.search.slice(1);
    
    if (newSearch !== currentSearch) {
      window.history.replaceState(null, '', `?${newSearch}`);
    }
  }, [searchTerm, filterStatus, filterPriority, filterCountry, filterPosition, filterShortlist, sortBy]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      open: requests.filter(r => r.status === "offen").length,
      inProgress: requests.filter(r => r.status === "in_bearbeitung").length,
      highPriority: requests.filter(r => r.priority === "hoch" || r.priority === "dringend").length,
      withMatches: requestsWithMatches.filter(r => r.matchCount > 0).length,
    };
  }, [requests, requestsWithMatches]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Vereinsanfragen Dashboard</h1>
            <p className="text-slate-600 mt-1">Übersicht und Verwaltung aller Anfragen</p>
          </div>
          <Button 
            onClick={() => navigate(createPageUrl("ClubRequests"))}
            className="bg-blue-900 hover:bg-blue-800"
          >
            Zur Listenansicht
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Gesamt</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <Building2 className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Offen</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.open}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">In Bearbeitung</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.inProgress}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Hohe Priorität</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.highPriority}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Mit Matches</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.withMatches}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Filter & Sortierung</span>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-3 mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Suchen nach Verein, Liga, Person..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Status</SelectItem>
                  <SelectItem value="offen">Offen</SelectItem>
                  <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                  <SelectItem value="angebote_gesendet">Angebote gesendet</SelectItem>
                  <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                  <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Priorität" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Prioritäten</SelectItem>
                  <SelectItem value="dringend">Dringend</SelectItem>
                  <SelectItem value="hoch">Hoch</SelectItem>
                  <SelectItem value="mittel">Mittel</SelectItem>
                  <SelectItem value="niedrig">Niedrig</SelectItem>
                </SelectContent>
              </Select>

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

              <Select value={filterPosition} onValueChange={setFilterPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Positionen</SelectItem>
                  {uniquePositions.map(position => (
                    <SelectItem key={position} value={position}>{position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterShortlist} onValueChange={setFilterShortlist}>
                <SelectTrigger>
                  <SelectValue placeholder="Shortlist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Shortlists</SelectItem>
                  <SelectItem value="leer">Leer (0)</SelectItem>
                  <SelectItem value="1-3">1-3 Spieler</SelectItem>
                  <SelectItem value="4-10">4-10 Spieler</SelectItem>
                  <SelectItem value="10+">10+ Spieler</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Sortieren" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_date">Neueste zuerst</SelectItem>
                  <SelectItem value="created_date">Älteste zuerst</SelectItem>
                  <SelectItem value="-matches">Meiste Matches zuerst</SelectItem>
                  <SelectItem value="matches">Wenigste Matches zuerst</SelectItem>
                  <SelectItem value="priority">Nach Priorität</SelectItem>
                  <SelectItem value="club_name">Nach Vereinsname</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filteredRequests.length === 0 ? (
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">
                {requests.length === 0 ? "Noch keine Anfragen vorhanden" : "Keine Anfragen gefunden"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.map(request => (
              <Card 
                key={request.id}
                className={`border-slate-200 bg-white hover:shadow-lg transition-all cursor-pointer ${
                  request.matchCount > 5 ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                }`}
                onClick={() => {
                  const params = new URLSearchParams();
                  if (searchTerm) params.set('search', searchTerm);
                  if (filterStatus !== 'alle') params.set('status', filterStatus);
                  if (filterPriority !== 'alle') params.set('priority', filterPriority);
                  if (filterCountry !== 'alle') params.set('country', filterCountry);
                  if (filterPosition !== 'alle') params.set('position', filterPosition);
                  if (filterShortlist !== 'alle') params.set('shortlist', filterShortlist);
                  if (sortBy !== '-created_date') params.set('sortBy', sortBy);
                  navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id + "&back=" + encodeURIComponent(window.location.pathname + "?" + params.toString()));
                }}
              >
                <CardContent className="p-5">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-slate-900 truncate">{request.club_name}</h3>
                        <p className="text-sm text-slate-600 truncate">{request.league} • {request.country}</p>
                      </div>
                      {request.matchCount > 0 && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                          request.matchCount > 5 ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          <Users className="w-3 h-3" />
                          <span className="text-sm font-bold">{request.matchCount}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className={priorityColors[request.priority] + " border text-xs"}>
                        {request.priority}
                      </Badge>
                      <Badge variant="secondary" className={statusColors[request.status] + " border text-xs"}>
                        {request.status.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {request.position_needed}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Budget:</span>
                        <span className="font-semibold text-slate-900">
                          {request.budget_min ? `${(request.budget_min / 1000000).toFixed(1)}M` : '?'} - 
                          {request.budget_max ? ` ${(request.budget_max / 1000000).toFixed(1)}M €` : ' ?'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Alter:</span>
                        <span className="font-semibold text-slate-900">
                          {request.age_min || '?'} - {request.age_max || '?'} Jahre
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Shortlist:</span>
                        <span className="font-semibold text-slate-900 flex items-center gap-1">
                          <ListChecks className="w-3 h-3" />
                          {request.shortlist?.length || 0}
                        </span>
                      </div>
                      {request.transfer_period && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Periode:</span>
                          <span className="font-semibold text-slate-900">{request.transfer_period}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          const params = new URLSearchParams();
                          if (searchTerm) params.set('search', searchTerm);
                          if (filterStatus !== 'alle') params.set('status', filterStatus);
                          if (filterPriority !== 'alle') params.set('priority', filterPriority);
                          if (filterCountry !== 'alle') params.set('country', filterCountry);
                          if (filterPosition !== 'alle') params.set('position', filterPosition);
                          if (filterShortlist !== 'alle') params.set('shortlist', filterShortlist);
                          if (sortBy !== '-created_date') params.set('sortBy', sortBy);
                          navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id + "&back=" + encodeURIComponent(window.location.pathname + "?" + params.toString()));
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Matches
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const params = new URLSearchParams();
                          if (searchTerm) params.set('search', searchTerm);
                          if (filterStatus !== 'alle') params.set('status', filterStatus);
                          if (filterPriority !== 'alle') params.set('priority', filterPriority);
                          if (filterCountry !== 'alle') params.set('country', filterCountry);
                          if (filterPosition !== 'alle') params.set('position', filterPosition);
                          if (filterShortlist !== 'alle') params.set('shortlist', filterShortlist);
                          if (sortBy !== '-created_date') params.set('sortBy', sortBy);
                          navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id + "&back=" + encodeURIComponent(window.location.pathname + "?" + params.toString()));
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}