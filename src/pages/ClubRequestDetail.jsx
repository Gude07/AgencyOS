import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Mail, Phone, Building2, Users, Star, ListChecks, MessageSquare, Settings, Search, SlidersHorizontal, Trash2, UserPlus, Calendar, Clock, Sparkles, Send, FileText, Footprints } from "lucide-react";
import { calculateDetailedMatchScore, getLeagueTierInfo } from "../utils/matchmaking";
import SendEmailDialog from "../components/outlook/SendEmailDialog";
import AIMatchingAnalysis from "../components/clubRequests/AIMatchingAnalysis";
import MultiUserSelect from "../components/tasks/MultiUserSelect";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatInGermanTime } from "@/components/utils/dateUtils";
import MatchingCriteriaEditor from "../components/clubRequests/MatchingCriteriaEditor";
import CommunicationHistory from "../components/clubRequests/CommunicationHistory";
import MatchScoreBreakdown from "../components/clubRequests/MatchScoreBreakdown";
import EmailDraftGenerator from "../components/ai/EmailDraftGenerator";
import DropboxDocumentManager from "../components/documents/DropboxDocumentManager";

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

export default function ClubRequestDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('id');
  const backUrl = urlParams.get('back');

  const [editMode, setEditMode] = useState(false);
  const [editedRequest, setEditedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState(urlParams.get('tab') || "matched");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  
  const [matchFilters, setMatchFilters] = useState({
    search: "",
    category: "alle",
    status: "alle",
    nationality: "alle",
    positionType: "alle"
  });

  const { data: request, isLoading } = useQuery({
    queryKey: ['clubRequest', requestId],
    queryFn: async () => {
      const requests = await base44.entities.ClubRequest.list();
      return requests.find(r => r.id === requestId);
    },
    enabled: !!requestId,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => base44.entities.Agency.list(),
  });

  const agencyLeagueTierConfigs = agencies.find(a => a.id === currentUser?.agency_id)?.league_tier_configs;

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClubRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubRequest', requestId] });
      queryClient.invalidateQueries({ queryKey: ['clubRequests'] });
      setEditMode(false);
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubRequest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubRequests'] });
      navigate(createPageUrl("ClubRequests"));
    },
  });

  const handleSaveRequest = () => {
    const requestData = {
      ...editedRequest,
      budget_min: editedRequest.budget_min ? parseFloat(editedRequest.budget_min) : undefined,
      budget_max: editedRequest.budget_max ? parseFloat(editedRequest.budget_max) : undefined,
      salary_min: editedRequest.salary_min ? parseFloat(editedRequest.salary_min) : undefined,
      salary_max: editedRequest.salary_max ? parseFloat(editedRequest.salary_max) : undefined,
      age_min: editedRequest.age_min ? parseInt(editedRequest.age_min) : undefined,
      age_max: editedRequest.age_max ? parseInt(editedRequest.age_max) : undefined,
      last_modified_date: new Date().toISOString(),
    };
    updateRequestMutation.mutate({ id: requestId, data: requestData });
  };

  const handleDeleteRequest = () => {
    deleteRequestMutation.mutate(requestId);
  };

  const handleToggleShortlist = async (playerId) => {
    if (!request) return;
    const shortlist = request.shortlist || [];
    const isAdding = !shortlist.includes(playerId);
    const newShortlist = isAdding
      ? [...shortlist, playerId]
      : shortlist.filter(id => id !== playerId);
    
    // Update club request shortlist
    await updateRequestMutation.mutateAsync({ 
      id: requestId, 
      data: { shortlist: newShortlist }
    });
    
    // Update player favorites
    const player = players.find(p => p.id === playerId);
    if (player) {
      const favorites = player.favorite_matches || [];
      const newFavorites = isAdding
        ? [...new Set([...favorites, requestId])]
        : favorites.filter(id => id !== requestId);
      
      await base44.entities.Player.update(playerId, { favorite_matches: newFavorites });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['player', playerId] });
    }
    

  };

  const handleSaveMatchingCriteria = (criteria) => {
    updateRequestMutation.mutate({ 
      id: requestId, 
      data: { matching_criteria: criteria }
    });
  };

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const favorites = currentUser?.favorite_club_requests || [];
      const newFavorites = favorites.includes(requestId)
        ? favorites.filter(id => id !== requestId)
        : [...favorites, requestId];
      await base44.auth.updateMe({ favorite_club_requests: newFavorites });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const isFavorite = currentUser?.favorite_club_requests?.includes(requestId);

  const calculateMatchScore = (player) => {
    const { score } = calculateDetailedMatchScore(player, request, agencyLeagueTierConfigs);
    return score;
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Anfrage nicht gefunden</p>
      </div>
    );
  }

  const matchingPlayers = players
    .filter(player => !player.archive_id)  // Archivierte Spieler ausschließen
    .map(player => ({
      ...player,
      matchScore: calculateMatchScore(player),
      positionMatch: player.position === request.position_needed ? 'main' : 
                     (player.secondary_positions?.includes(request.position_needed) ? 'secondary' : 'none')
    }))
    .filter(player => player.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  const archivedMatchingPlayers = players
    .filter(player => player.archive_id)  // Nur archivierte Spieler
    .map(player => ({
      ...player,
      matchScore: calculateMatchScore(player),
      positionMatch: player.position === request.position_needed ? 'main' : 
                     (player.secondary_positions?.includes(request.position_needed) ? 'secondary' : 'none')
    }))
    .filter(player => player.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  const filteredMatchingPlayers = matchingPlayers.filter(player => {
    const matchesSearch = matchFilters.search === "" || 
      player.name?.toLowerCase().includes(matchFilters.search.toLowerCase()) ||
      player.current_club?.toLowerCase().includes(matchFilters.search.toLowerCase());
    
    const matchesCategory = matchFilters.category === "alle" || player.category === matchFilters.category;
    const matchesStatus = matchFilters.status === "alle" || player.status === matchFilters.status;
    const matchesNationality = matchFilters.nationality === "alle" || player.nationality === matchFilters.nationality;
    const matchesPositionType = matchFilters.positionType === "alle" || 
      (matchFilters.positionType === "main" && player.positionMatch === "main") ||
      (matchFilters.positionType === "secondary" && player.positionMatch === "secondary");
    
    return matchesSearch && matchesCategory && matchesStatus && matchesNationality && matchesPositionType;
  });

  const uniqueNationalities = [...new Set(matchingPlayers.map(p => p.nationality).filter(Boolean))];
  const shortlistPlayers = players.filter(p => request.shortlist?.includes(p.id));

  const currentRequestData = editMode ? editedRequest : request;

  const renderPlayerCard = (player, showMatchScore = false) => {
    const isOfferedToThisRequest = player.offered_to_requests?.includes(requestId);

    return (
      <div 
        key={player.id}
        className={`p-4 rounded-lg border transition-colors ${
          isOfferedToThisRequest 
            ? 'bg-green-50 border-green-300 hover:border-green-400' 
            : 'bg-slate-50 border-slate-200 hover:border-blue-300'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div 
            className="flex-1 cursor-pointer"
            onClick={() => {
              const params = new URLSearchParams();
              params.set('id', requestId);
              params.set('tab', activeTab);
              if (backUrl) params.set('back', backUrl);
              navigate(createPageUrl("PlayerDetail") + "?id=" + player.id + "&back=" + encodeURIComponent(window.location.pathname + "?" + params.toString()));
            }}
          >
            <div className="flex items-center gap-2">
              <h4 className={`font-semibold ${isOfferedToThisRequest ? 'text-green-900' : 'text-slate-900'}`}>
                {player.name}
              </h4>
              {isOfferedToThisRequest && (
                <Badge className="bg-green-600 text-white text-xs">Angeboten</Badge>
              )}
            </div>
            <p className={`text-sm mt-1 ${isOfferedToThisRequest ? 'text-green-700' : 'text-slate-600'}`}>
              {player.current_club}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="outline" className={`text-xs ${player.positionMatch === 'main' ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-200'}`}>
                {player.position}
              </Badge>
              {player.secondary_positions?.map((pos) => (
                <Badge key={pos} variant="outline" className={`text-xs ${pos === request.position_needed ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200'}`}>
                  {pos}
                </Badge>
              ))}
            </div>
          </div>
          {showMatchScore && player.matchScore !== undefined && (
            <MatchScoreBreakdown 
              player={player} 
              request={request} 
              matchScore={player.matchScore} 
            />
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <p className="text-slate-600">Alter</p>
            <p className="font-semibold text-slate-900">
              {player.date_of_birth ? Math.floor((new Date() - new Date(player.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : '-'}
            </p>
          </div>
          <div>
            <p className="text-slate-600">Marktwert</p>
            <p className="font-semibold text-slate-900">
              {player.market_value ? `${(player.market_value / 1000000).toFixed(1)}M €` : '-'}
            </p>
          </div>
          {(player.height || player.speed_rating) && (
            <div>
              <p className="text-slate-600">Größe</p>
              <p className="font-semibold text-slate-900">{player.height ? `${player.height} cm` : '-'}</p>
            </div>
          )}
          {player.current_form && (
            <div>
              <p className="text-slate-600">Form</p>
              <p className="font-semibold text-slate-900">
                {{ausgezeichnet:'⭐ Ausgezeichnet', sehr_gut:'✅ Sehr gut', gut:'👍 Gut', befriedigend:'➖ Befriedigend', schwach:'⬇️ Schwach'}[player.current_form] || '-'}
              </p>
            </div>
          )}
        </div>
        {(player.speed_rating || player.strength_rating || player.stamina_rating || player.agility_rating) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {player.speed_rating && <span className="text-xs px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-amber-800">⚡ Tempo {player.speed_rating}/10</span>}
            {player.strength_rating && <span className="text-xs px-2 py-0.5 bg-red-50 border border-red-200 rounded-full text-red-800">💪 Kraft {player.strength_rating}/10</span>}
            {player.stamina_rating && <span className="text-xs px-2 py-0.5 bg-green-50 border border-green-200 rounded-full text-green-800">🏃 Ausdauer {player.stamina_rating}/10</span>}
            {player.agility_rating && <span className="text-xs px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-full text-purple-800">🤸 Agilität {player.agility_rating}/10</span>}
          </div>
        )}
        {player.personality_traits?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {player.personality_traits.slice(0,3).map(trait => (
              <span key={trait} className="text-xs px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700">👤 {trait}</span>
            ))}
            {player.personality_traits.length > 3 && (
              <span className="text-xs px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-500">+{player.personality_traits.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleShortlist(player.id)}
            className={`flex-1 ${request.shortlist?.includes(player.id) ? 'bg-blue-50 border-blue-300 text-blue-900' : ''}`}
          >
            <ListChecks className="w-4 h-4 mr-2" />
            {request.shortlist?.includes(player.id) ? 'Auf Shortlist' : 'Zu Shortlist'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backUrl ? decodeURIComponent(backUrl) : createPageUrl("ClubRequests"))}
            className="hover:bg-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Anfrage Details</h1>
          </div>
          {!editMode ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleFavoriteMutation.mutate()}
                className={isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-slate-400 hover:text-slate-600'}
              >
                <Star className={`w-5 h-5 ${isFavorite ? 'fill-yellow-400' : ''}`} />
              </Button>
              {request.contact_email && (
                <>
                  <EmailDraftGenerator 
                    type="club_request"
                    entityId={requestId}
                    defaultRecipient={request.contact_person}
                  />
                  <Button 
                    onClick={() => setShowEmailDialog(true)} 
                    variant="outline"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    E-Mail
                  </Button>
                </>
              )}
              <Button onClick={() => setShowDeleteDialog(true)} variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
              <Button onClick={() => { setEditMode(true); setEditedRequest(request); }} variant="outline">
                Bearbeiten
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveRequest} className="bg-blue-900 hover:bg-blue-800">
                Speichern
              </Button>
            </div>
          )}
        </div>

        {request.league && (() => {
          const tierInfo = getLeagueTierInfo(request.league, agencyLeagueTierConfigs);
          if (tierInfo.source === 'unknown') {
            return (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">Liga nicht erkannt: "{request.league}"</p>
                  <p className="text-sm text-amber-700 mt-0.5">Diese Liga ist keinem Tier zugeordnet – der Liga-Niveau-Fit kann nicht berechnet werden. Bitte ordnen Sie die Liga manuell einem Tier zu.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-800 hover:bg-amber-100 flex-shrink-0"
                  onClick={() => window.location.href = '/AgencyManagement'}
                >
                  Tier konfigurieren
                </Button>
              </div>
            );
          }
          return null;
        })()}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-blue-900" />
                    {editMode ? (
                      <Input
                        value={editedRequest.club_name}
                        onChange={(e) => setEditedRequest({...editedRequest, club_name: e.target.value})}
                        className="text-xl font-bold"
                      />
                    ) : (
                      <CardTitle className="text-xl">{currentRequestData.club_name}</CardTitle>
                    )}
                  </div>
                  {editMode ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={editedRequest.league || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, league: e.target.value})}
                          placeholder="Liga"
                        />
                        <Input
                          value={editedRequest.country || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, country: e.target.value})}
                          placeholder="Land"
                        />
                      </div>
                      <Select 
                        value={editedRequest.position_needed} 
                        onValueChange={(value) => setEditedRequest({...editedRequest, position_needed: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Torwart</SelectLabel>
                            <SelectItem value="Torwart">Torwart</SelectItem>
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Verteidigung</SelectLabel>
                            <SelectItem value="Innenverteidiger">Innenverteidiger</SelectItem>
                            <SelectItem value="Außenverteidiger">Außenverteidiger (beide Seiten)</SelectItem>
                            <SelectItem value="Linker Außenverteidiger">Linker Außenverteidiger</SelectItem>
                            <SelectItem value="Rechter Außenverteidiger">Rechter Außenverteidiger</SelectItem>
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Mittelfeld</SelectLabel>
                            <SelectItem value="Defensives Mittelfeld">Defensives Mittelfeld</SelectItem>
                            <SelectItem value="Mittelfeld">Mittelfeld (beide Seiten)</SelectItem>
                            <SelectItem value="Linkes Mittelfeld">Linkes Mittelfeld</SelectItem>
                            <SelectItem value="Zentrales Mittelfeld">Zentrales Mittelfeld</SelectItem>
                            <SelectItem value="Rechtes Mittelfeld">Rechtes Mittelfeld</SelectItem>
                            <SelectItem value="Offensives Mittelfeld">Offensives Mittelfeld</SelectItem>
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Angriff</SelectLabel>
                            <SelectItem value="Flügelspieler">Flügelspieler (beide Seiten)</SelectItem>
                            <SelectItem value="Linksaußen">Linksaußen</SelectItem>
                            <SelectItem value="Rechtsaußen">Rechtsaußen</SelectItem>
                            <SelectItem value="Stürmer">Stürmer</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <p className="text-slate-600">{currentRequestData.league} • {currentRequestData.country}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {editMode ? (
                      <>
                        <Select 
                          value={editedRequest.priority} 
                          onValueChange={(value) => setEditedRequest({...editedRequest, priority: value})}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="niedrig">Niedrig</SelectItem>
                            <SelectItem value="mittel">Mittel</SelectItem>
                            <SelectItem value="hoch">Hoch</SelectItem>
                            <SelectItem value="dringend">Dringend</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select 
                          value={editedRequest.status} 
                          onValueChange={(value) => setEditedRequest({...editedRequest, status: value})}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="offen">Offen</SelectItem>
                            <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                            <SelectItem value="angebote_gesendet">Angebote gesendet</SelectItem>
                            <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                            <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <>
                        <Badge variant="secondary" className={priorityColors[currentRequestData.priority] + " border"}>
                          {currentRequestData.priority}
                        </Badge>
                        <Badge variant="secondary" className={statusColors[currentRequestData.status] + " border"}>
                          {currentRequestData.status.replace(/_/g, ' ')}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Datum-Anzeige */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start gap-3 text-xs text-slate-600">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="font-medium">Erstellt:</span>
                      </div>
                      <p className="text-slate-800">
                        {formatInGermanTime(currentRequestData.created_date, "dd.MM.yyyy 'um' HH:mm 'Uhr'")}
                      </p>
                    </div>
                    {currentRequestData.last_modified_date && (
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-medium">Letzte Änderung:</span>
                        </div>
                        <p className="text-slate-800">
                          {formatInGermanTime(currentRequestData.last_modified_date, "dd.MM.yyyy 'um' HH:mm 'Uhr'")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-3 block">Kontaktinformationen</Label>
                  {editMode ? (
                    <div className="space-y-3">
                      <Input
                        placeholder="Ansprechpartner"
                        value={editedRequest.contact_person || ""}
                        onChange={(e) => setEditedRequest({...editedRequest, contact_person: e.target.value})}
                      />
                      <Input
                        type="email"
                        placeholder="E-Mail"
                        value={editedRequest.contact_email || ""}
                        onChange={(e) => setEditedRequest({...editedRequest, contact_email: e.target.value})}
                      />
                      <Input
                        placeholder="Telefon"
                        value={editedRequest.contact_phone || ""}
                        onChange={(e) => setEditedRequest({...editedRequest, contact_phone: e.target.value})}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                      {currentRequestData.contact_person && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-500" />
                          <span className="text-slate-700">{currentRequestData.contact_person}</span>
                        </div>
                      )}
                      {currentRequestData.contact_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-500" />
                          <a href={`mailto:${currentRequestData.contact_email}`} className="text-blue-900 hover:underline text-sm">
                            {currentRequestData.contact_email}
                          </a>
                        </div>
                      )}
                      {currentRequestData.contact_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-500" />
                          <a href={`tel:${currentRequestData.contact_phone}`} className="text-blue-900 hover:underline">
                            {currentRequestData.contact_phone}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Gesuchte Position</Label>
                    {editMode ? (
                      <p className="text-sm text-slate-500 italic">Position oben ändern</p>
                    ) : (
                      <p className="font-semibold text-slate-900">{currentRequestData.position_needed}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block flex items-center gap-1">
                      Gesuchter starker Fuß
                      <span className="text-xs text-slate-400">(optional)</span>
                    </Label>
                    {editMode ? (
                      <Select
                        value={editedRequest.sought_foot || ""}
                        onValueChange={(value) => setEditedRequest({...editedRequest, sought_foot: value === 'keine_angabe' ? undefined : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kein Fuß bevorzugt" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keine_angabe">Kein Fuß bevorzugt</SelectItem>
                          <SelectItem value="rechts">Rechts</SelectItem>
                          <SelectItem value="links">Links</SelectItem>
                          <SelectItem value="beidfüßig">Beidfüßig</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      currentRequestData.sought_foot ? (
                        <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-900 capitalize">
                          🦶 {currentRequestData.sought_foot}
                        </Badge>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Kein Fuß bevorzugt</p>
                      )
                    )}
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Transfer-Art</Label>
                    {editMode ? (
                      <div className="flex flex-wrap gap-3">
                        {['kauf', 'leihe', 'leihe_mit_kaufoption'].map(type => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editedRequest.transfer_types?.includes(type)}
                              onChange={(e) => {
                                const types = editedRequest.transfer_types || [];
                                const newTypes = e.target.checked
                                  ? [...types, type]
                                  : types.filter(t => t !== type);
                                setEditedRequest({...editedRequest, transfer_types: newTypes});
                              }}
                              className="h-4 w-4"
                            />
                            <span className="text-sm text-slate-700">
                              {type === 'kauf' ? 'Kauf' : type === 'leihe' ? 'Leihe' : 'Leihe mit Kaufoption'}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {currentRequestData.transfer_types?.map(type => (
                          <Badge key={type} variant="outline" className="border-blue-300 bg-blue-50 text-blue-900">
                            {type === 'kauf' ? '💰 Kauf' : type === 'leihe' ? '🔄 Leihe' : '🔄💰 Leihe + Kaufoption'}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {(editMode ? editedRequest.transfer_types?.includes('kauf') : currentRequestData.transfer_types?.includes('kauf')) && (
                    <div>
                      <Label className="text-sm text-slate-600 mb-1.5 block">Budget Kauf</Label>
                      {editMode ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={editedRequest.budget_min || ""}
                            onChange={(e) => setEditedRequest({...editedRequest, budget_min: e.target.value})}
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            value={editedRequest.budget_max || ""}
                            onChange={(e) => setEditedRequest({...editedRequest, budget_max: e.target.value})}
                          />
                        </div>
                      ) : (
                        <p className="font-semibold text-slate-900">
                          {currentRequestData.budget_min ? `${(currentRequestData.budget_min / 1000000).toFixed(2).replace(/\.?0+$/, '')}M` : '?'} - 
                          {currentRequestData.budget_max ? ` ${(currentRequestData.budget_max / 1000000).toFixed(2).replace(/\.?0+$/, '')}M €` : ' ?'}
                        </p>
                      )}
                    </div>
                  )}

                  {(editMode ? editedRequest.transfer_types?.includes('leihe') : currentRequestData.transfer_types?.includes('leihe')) && (
                    <div>
                      <Label className="text-sm text-slate-600 mb-1.5 block">Leihgebühr Budget</Label>
                      {editMode ? (
                        <Input
                          type="number"
                          placeholder="Leihgebühr"
                          value={editedRequest.loan_fee_budget || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, loan_fee_budget: e.target.value})}
                        />
                      ) : (
                        currentRequestData.loan_fee_budget ? (
                          <p className="font-semibold text-slate-900">
                            {(currentRequestData.loan_fee_budget / 1000).toFixed(0)}k €
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400 italic">Keine Angabe</p>
                        )
                      )}
                    </div>
                  )}

                  {(editMode ? editedRequest.transfer_types?.includes('leihe_mit_kaufoption') : currentRequestData.transfer_types?.includes('leihe_mit_kaufoption')) && (
                    <div>
                      <Label className="text-sm text-slate-600 mb-1.5 block">Kaufoptions-Budget</Label>
                      {editMode ? (
                        <Input
                          type="number"
                          placeholder="Kaufoption"
                          value={editedRequest.buy_option_budget || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, buy_option_budget: e.target.value})}
                        />
                      ) : (
                        currentRequestData.buy_option_budget ? (
                          <p className="font-semibold text-slate-900">
                            {(currentRequestData.buy_option_budget / 1000000).toFixed(2).replace(/\.?0+$/, '')}M €
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400 italic">Keine Angabe</p>
                        )
                      )}
                    </div>
                  )}

                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Gehalt ({currentRequestData.salary_period || 'jährlich'})</Label>
                    {editMode ? (
                      <>
                        <Select 
                          value={editedRequest.salary_period || "jährlich"} 
                          onValueChange={(value) => setEditedRequest({...editedRequest, salary_period: value})}
                          className="mb-2"
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monatlich">Monatlich</SelectItem>
                            <SelectItem value="jährlich">Jährlich</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={editedRequest.salary_min || ""}
                            onChange={(e) => setEditedRequest({...editedRequest, salary_min: e.target.value})}
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            value={editedRequest.salary_max || ""}
                            onChange={(e) => setEditedRequest({...editedRequest, salary_max: e.target.value})}
                          />
                        </div>
                      </>
                    ) : (
                      currentRequestData.salary_min || currentRequestData.salary_max ? (
                        <p className="font-semibold text-slate-900">
                          {currentRequestData.salary_min ? `${Math.round(currentRequestData.salary_min / 1000)}K` : '?'} - 
                          {currentRequestData.salary_max ? ` ${Math.round(currentRequestData.salary_max / 1000)}K €` : ' ?'}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Keine Angabe</p>
                      )
                    )}
                    </div>

                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Altersbereich</Label>
                    {editMode ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={editedRequest.age_min || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, age_min: e.target.value})}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={editedRequest.age_max || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, age_max: e.target.value})}
                        />
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {currentRequestData.age_min || '?'} - {currentRequestData.age_max || '?'} Jahre
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Transferperiode</Label>
                    {editMode ? (
                      <Select 
                        value={editedRequest.transfer_period || ""} 
                        onValueChange={(value) => setEditedRequest({...editedRequest, transfer_period: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Winter 2025/26">Winter 2025/26</SelectItem>
                          <SelectItem value="Sommer 2026">Sommer 2026</SelectItem>
                          <SelectItem value="Winter 2026/27">Winter 2026/27</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      currentRequestData.transfer_period && (
                        <p className="font-semibold text-slate-900">{currentRequestData.transfer_period}</p>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Anforderungen</Label>
                  {editMode ? (
                    <Textarea
                      value={editedRequest.requirements || ""}
                      onChange={(e) => setEditedRequest({...editedRequest, requirements: e.target.value})}
                      placeholder="Weitere Anforderungen..."
                      className="h-24"
                    />
                  ) : (
                    currentRequestData.requirements ? (
                      <p className="text-sm text-slate-600">{currentRequestData.requirements}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Keine Anforderungen angegeben</p>
                    )
                  )}
                </div>

                {/* Zuständige Personen - nur bei in_bearbeitung oder angebote_gesendet */}
                {(currentRequestData.status === 'in_bearbeitung' || currentRequestData.status === 'angebote_gesendet') && (
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Zuständige Personen
                    </Label>
                    {editMode ? (
                      <MultiUserSelect
                        selectedUsers={editedRequest.assigned_to || []}
                        users={users}
                        onChange={(selected) => setEditedRequest({...editedRequest, assigned_to: selected})}
                      />
                    ) : (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        {currentRequestData.assigned_to && currentRequestData.assigned_to.length > 0 ? (
                          <div className="space-y-2">
                            {currentRequestData.assigned_to.map(email => {
                              const user = users.find(u => u.email === email);
                              return (
                                <div key={email} className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                                    <span className="text-blue-800 font-semibold text-sm">
                                      {user?.full_name?.[0]?.toUpperCase() || email[0].toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900">{user?.full_name || email}</p>
                                    <p className="text-xs text-slate-500">{email}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-blue-700 italic">
                            Noch niemand zugewiesen - Bearbeiten klicken um Personen hinzuzufügen
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Mobile/Tablet: Dropdown */}
              <div className="xl:hidden mb-6">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matched">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Matches ({filteredMatchingPlayers.length})
                      </div>
                    </SelectItem>
                    <SelectItem value="ai_matching">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        KI-Analyse
                      </div>
                    </SelectItem>
                    <SelectItem value="shortlist">
                      <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4" />
                        Shortlist ({shortlistPlayers.length})
                      </div>
                    </SelectItem>
                    <SelectItem value="criteria">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Kriterien
                      </div>
                    </SelectItem>
                    <SelectItem value="documents">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Dokumente
                      </div>
                    </SelectItem>
                    <SelectItem value="communication">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Kommunikation
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop only: Full Tabs */}
              <TabsList className="hidden xl:grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="matched" className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Matches ({filteredMatchingPlayers.length})
                </TabsTrigger>
                <TabsTrigger value="ai_matching" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  KI-Analyse
                </TabsTrigger>
                <TabsTrigger value="shortlist" className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4" />
                  Shortlist ({shortlistPlayers.length})
                </TabsTrigger>
                <TabsTrigger value="criteria" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Kriterien
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Dokumente
                </TabsTrigger>
                <TabsTrigger value="communication" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Kommunikation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="matched" className="space-y-6">
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-700">Filter (Aktive Spieler)</span>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="relative lg:col-span-2">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          placeholder="Spieler oder Verein..."
                          value={matchFilters.search}
                          onChange={(e) => setMatchFilters({...matchFilters, search: e.target.value})}
                          className="pl-9"
                        />
                      </div>
                      <Select 
                        value={matchFilters.positionType} 
                        onValueChange={(value) => setMatchFilters({...matchFilters, positionType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Positionsart" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alle">Alle Positionen</SelectItem>
                          <SelectItem value="main">Nur Hauptposition</SelectItem>
                          <SelectItem value="secondary">Nur Nebenposition</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select 
                        value={matchFilters.category} 
                        onValueChange={(value) => setMatchFilters({...matchFilters, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kategorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alle">Alle Kategorien</SelectItem>
                          <SelectItem value="Wintertransferperiode">Winter</SelectItem>
                          <SelectItem value="Sommertransferperiode">Sommer</SelectItem>
                          <SelectItem value="Top-Priorität">Top-Priorität</SelectItem>
                          <SelectItem value="Beobachtungsliste">Beobachtung</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select 
                        value={matchFilters.status} 
                        onValueChange={(value) => setMatchFilters({...matchFilters, status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alle">Alle Status</SelectItem>
                          <SelectItem value="noch_offen">Noch offen</SelectItem>
                          <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                          <SelectItem value="bei_verein_angeboten">Bei Verein angeboten</SelectItem>
                          <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select 
                        value={matchFilters.nationality} 
                        onValueChange={(value) => setMatchFilters({...matchFilters, nationality: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nationalität" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alle">Alle Nationalitäten</SelectItem>
                          {uniqueNationalities.map(nationality => (
                            <SelectItem key={nationality} value={nationality}>{nationality}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {filteredMatchingPlayers.length === 0 ? (
                  <Card className="border-slate-200 bg-white">
                    <CardContent className="p-8 text-center">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600">
                        {matchingPlayers.length === 0 
                          ? "Keine passenden Spieler gefunden" 
                          : "Keine Ergebnisse für die ausgewählten Filter"}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {matchingPlayers.length === 0 
                          ? "Passen Sie die Matching-Kriterien an oder fügen Sie neue Spieler hinzu"
                          : "Versuchen Sie andere Filtereinstellungen"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredMatchingPlayers.map(player => renderPlayerCard(player, true))}
                  </div>
                )}

                {/* Archivierte Spieler separat anzeigen */}
                {archivedMatchingPlayers.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader className="border-b border-amber-200 pb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-amber-700" />
                        <CardTitle className="text-lg text-amber-900">Archivierte Matches ({archivedMatchingPlayers.length})</CardTitle>
                      </div>
                      <p className="text-sm text-amber-700 mt-1">
                        Diese Spieler befinden sich im Archiv, könnten aber trotzdem passen
                      </p>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        {archivedMatchingPlayers.map(player => (
                          <div key={player.id} className="opacity-75">
                            {renderPlayerCard(player, true)}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="ai_matching">
                <AIMatchingAnalysis request={request} matchingPlayers={matchingPlayers} />
              </TabsContent>

              <TabsContent value="shortlist" className="space-y-4">
                {shortlistPlayers.length === 0 ? (
                  <Card className="border-slate-200 bg-white">
                    <CardContent className="p-8 text-center">
                      <ListChecks className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600">Noch keine Spieler auf der Shortlist</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Fügen Sie Spieler aus den Matches hinzu
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {shortlistPlayers.map(player => renderPlayerCard(player, false))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="criteria">
                <MatchingCriteriaEditor 
                  criteria={request.matching_criteria || []}
                  onSave={handleSaveMatchingCriteria}
                />
              </TabsContent>

              <TabsContent value="documents">
                <DropboxDocumentManager entityType="ClubRequest" entityId={requestId} />
              </TabsContent>

              <TabsContent value="communication">
                <CommunicationHistory 
                  clubRequestId={requestId}
                  players={[...matchingPlayers, ...shortlistPlayers]}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Vereinsanfrage löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Sind Sie sicher, dass Sie die Anfrage von {request.club_name} dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRequest} className="bg-red-600 hover:bg-red-700">
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <SendEmailDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          defaultTo={request.contact_email || ""}
          defaultSubject={`Spielervorschlag für ${request.club_name} - ${request.position_needed}`}
          clubRequestId={requestId}
        />
      </div>
    </div>
  );
}