import React, { useState, useEffect } from "react";
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
import { ArrowLeft, ExternalLink, Building2, Link as LinkIcon, Star, Settings, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import PlayerPreferences from "../components/players/PlayerPreferences";
import SecondaryPositionsEditor from "../components/players/SecondaryPositionsEditor";

const categoryColors = {
  "Wintertransferperiode": "bg-blue-100 text-blue-800 border-blue-200",
  "Sommertransferperiode": "bg-orange-100 text-orange-800 border-orange-200",
  "Zukunft": "bg-purple-100 text-purple-800 border-purple-200",
  "Beobachtungsliste": "bg-slate-100 text-slate-800 border-slate-200",
  "Top-Priorität": "bg-red-100 text-red-800 border-red-200",
  "Vertragsende": "bg-green-100 text-green-800 border-green-200",
};

export default function PlayerDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get('id');

  const [editMode, setEditMode] = useState(false);
  const [editedPlayer, setEditedPlayer] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [matchFilters, setMatchFilters] = useState({
    search: "",
    priority: "alle",
    status: "alle",
    country: "alle"
  });

  const { data: player, isLoading } = useQuery({
    queryKey: ['player', playerId],
    queryFn: async () => {
      const players = await base44.entities.Player.list();
      return players.find(p => p.id === playerId);
    },
    enabled: !!playerId,
  });

  const { data: clubRequests = [] } = useQuery({
    queryKey: ['clubRequests'],
    queryFn: () => base44.entities.ClubRequest.list(),
  });

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Player.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player', playerId] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setEditMode(false);
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: (id) => base44.entities.Player.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      navigate(createPageUrl("Players"));
    },
  });

  useEffect(() => {
    if (player && editMode) {
      console.log("Player loaded for editing:", player);
      console.log("Secondary positions from DB:", player.secondary_positions);
    }
  }, [player, editMode]);

  const handleSavePlayer = () => {
    console.log("=== SAVE PLAYER START ===");
    console.log("editedPlayer state:", editedPlayer);
    console.log("editedPlayer.secondary_positions:", editedPlayer.secondary_positions);
    
    const playerData = {
      ...player,
      ...editedPlayer,
      secondary_positions: Array.isArray(editedPlayer.secondary_positions) ? editedPlayer.secondary_positions : [],
      age: editedPlayer.age ? parseInt(editedPlayer.age) : player.age,
      market_value: editedPlayer.market_value ? parseFloat(editedPlayer.market_value) : player.market_value,
      height: editedPlayer.height ? parseFloat(editedPlayer.height) : player.height,
    };
    
    console.log("Final playerData to save:", playerData);
    console.log("Final secondary_positions:", playerData.secondary_positions);
    console.log("=== SAVE PLAYER END ===");
    
    updatePlayerMutation.mutate({ id: playerId, data: playerData });
  };

  const handleDeletePlayer = () => {
    deletePlayerMutation.mutate(playerId);
  };

  const handleSavePreferences = (preferences) => {
    updatePlayerMutation.mutate({ 
      id: playerId, 
      data: { ...player, preferences }
    });
  };

  const handleStartEdit = () => {
    const initialEditState = {
      ...player,
      secondary_positions: Array.isArray(player.secondary_positions) ? player.secondary_positions : []
    };
    console.log("Starting edit mode with:", initialEditState);
    setEditMode(true);
    setEditedPlayer(initialEditState);
  };

  const handleSecondaryPositionsChange = (positions) => {
    console.log("Secondary positions changed to:", positions);
    setEditedPlayer(prev => {
      const updated = {...prev, secondary_positions: positions};
      console.log("Updated editedPlayer:", updated);
      return updated;
    });
  };

  const handleToggleFavorite = (requestId) => {
    if (!player) return;
    const favorites = player.favorite_matches || [];
    const newFavorites = favorites.includes(requestId)
      ? favorites.filter(id => id !== requestId)
      : [...favorites, requestId];
    
    updatePlayerMutation.mutate({ 
      id: playerId, 
      data: { favorite_matches: newFavorites }
    });
  };

  const calculateBidirectionalMatchScore = (request) => {
    if (!player || !request) return 0;

    const mainPositionMatch = player.position === request.position_needed;
    const secondaryPositionMatch = Array.isArray(player.secondary_positions) && player.secondary_positions.includes(request.position_needed);
    
    if (!mainPositionMatch && !secondaryPositionMatch) {
      return 0;
    }

    let totalWeight = 0;
    let achievedWeight = 0;

    totalWeight += 3;
    if (mainPositionMatch) {
      achievedWeight += 3;
    } else if (secondaryPositionMatch) {
      achievedWeight += 1.5;
    }

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

    const prefs = player.preferences || {};
    
    if (prefs.excluded_clubs?.length > 0 && prefs.excluded_clubs.includes(request.club_name)) {
      return 0;
    }

    if (prefs.preferred_leagues?.length > 0 || prefs.preferred_countries?.length > 0) {
      totalWeight += 2;
      if (prefs.preferred_leagues?.includes(request.league)) achievedWeight += 1;
      if (prefs.preferred_countries?.includes(request.country)) achievedWeight += 1;
    }

    if (prefs.min_salary || prefs.max_salary) {
      totalWeight += 1;
      const budgetMatch = (!prefs.min_salary || request.budget_min >= prefs.min_salary) &&
                         (!prefs.max_salary || request.budget_max <= prefs.max_salary);
      if (budgetMatch) achievedWeight += 1;
    }

    return totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Spieler nicht gefunden</p>
      </div>
    );
  }

  const matchingRequests = clubRequests
    .map(request => ({
      ...request,
      matchScore: calculateBidirectionalMatchScore(request)
    }))
    .filter(request => request.matchScore > 0)
    .sort((a, b) => {
      const aIsFavorite = (player.favorite_matches || []).includes(a.id);
      const bIsFavorite = (player.favorite_matches || []).includes(b.id);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return b.matchScore - a.matchScore;
    });

  const filteredMatchingRequests = matchingRequests.filter(request => {
    const matchesSearch = matchFilters.search === "" || 
      request.club_name?.toLowerCase().includes(matchFilters.search.toLowerCase()) ||
      request.league?.toLowerCase().includes(matchFilters.search.toLowerCase());
    
    const matchesPriority = matchFilters.priority === "alle" || request.priority === matchFilters.priority;
    const matchesStatus = matchFilters.status === "alle" || request.status === matchFilters.status;
    const matchesCountry = matchFilters.country === "alle" || request.country === matchFilters.country;
    
    return matchesSearch && matchesPriority && matchesStatus && matchesCountry;
  });

  const favoriteMatches = clubRequests.filter(req => 
    (player.favorite_matches || []).includes(req.id)
  );

  const uniqueCountries = [...new Set(matchingRequests.map(r => r.country).filter(Boolean))];

  const currentPlayerData = editMode ? editedPlayer : player;
  const currentSecondaryPositions = Array.isArray(currentPlayerData?.secondary_positions) ? currentPlayerData.secondary_positions : [];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Players"))}
            className="hover:bg-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Spielerdetails</h1>
          </div>
          {!editMode ? (
            <div className="flex gap-2">
              <Button onClick={() => setShowDeleteDialog(true)} variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
              <Button onClick={handleStartEdit} variant="outline">
                Bearbeiten
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSavePlayer} className="bg-blue-900 hover:bg-blue-800">
                Speichern
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="info">Spielerinfo</TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Präferenzen
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Matches ({filteredMatchingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-slate-200 bg-white">
                  <CardHeader className="border-b border-slate-100">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {editMode ? (
                            <Input
                              value={editedPlayer?.name || ""}
                              onChange={(e) => setEditedPlayer({...editedPlayer, name: e.target.value})}
                              className="text-2xl font-bold mb-2"
                            />
                          ) : (
                            <CardTitle className="text-2xl">{currentPlayerData?.name}</CardTitle>
                          )}
                          {editMode ? (
                            <Input
                              value={editedPlayer?.current_club || ""}
                              onChange={(e) => setEditedPlayer({...editedPlayer, current_club: e.target.value})}
                              placeholder="Aktueller Verein"
                              className="mt-2"
                            />
                          ) : (
                            <p className="text-slate-600 mt-1">{currentPlayerData?.current_club}</p>
                          )}
                        </div>
                        {currentPlayerData?.transfermarkt_url && (
                          <a
                            href={currentPlayerData.transfermarkt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-5 h-5 text-blue-900" />
                          </a>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {editMode ? (
                            <Select 
                              value={editedPlayer?.category || "Beobachtungsliste"} 
                              onValueChange={(value) => setEditedPlayer({...editedPlayer, category: value})}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Wintertransferperiode">Wintertransferperiode</SelectItem>
                                <SelectItem value="Sommertransferperiode">Sommertransferperiode</SelectItem>
                                <SelectItem value="Zukunft">Zukunft</SelectItem>
                                <SelectItem value="Beobachtungsliste">Beobachtungsliste</SelectItem>
                                <SelectItem value="Top-Priorität">Top-Priorität</SelectItem>
                                <SelectItem value="Vertragsende">Vertragsende</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary" className={categoryColors[currentPlayerData?.category] + " border"}>
                              {currentPlayerData?.category}
                            </Badge>
                          )}
                          <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-900 font-semibold">
                            {currentPlayerData?.position}
                          </Badge>
                          {currentSecondaryPositions.map((pos) => (
                            <Badge key={pos} variant="outline" className="border-slate-200">
                              {pos}
                            </Badge>
                          ))}
                          <Badge variant="outline" className="border-slate-200">
                            {currentPlayerData?.status}
                          </Badge>
                        </div>

                        {editMode && editedPlayer && (
                          <div className="space-y-3">
                            <div>
                              <Label>Hauptposition *</Label>
                              <Select 
                                value={editedPlayer.position} 
                                onValueChange={(value) => setEditedPlayer({...editedPlayer, position: value})}
                              >
                                <SelectTrigger className="mt-1.5">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Torwart">Torwart</SelectItem>
                                  <SelectItem value="Innenverteidiger">Innenverteidiger</SelectItem>
                                  <SelectItem value="Linker Außenverteidiger">Linker Außenverteidiger</SelectItem>
                                  <SelectItem value="Rechter Außenverteidiger">Rechter Außenverteidiger</SelectItem>
                                  <SelectItem value="Defensives Mittelfeld">Defensives Mittelfeld</SelectItem>
                                  <SelectItem value="Linkes Mittelfeld">Linkes Mittelfeld</SelectItem>
                                  <SelectItem value="Zentrales Mittelfeld">Zentrales Mittelfeld</SelectItem>
                                  <SelectItem value="Rechtes Mittelfeld">Rechtes Mittelfeld</SelectItem>
                                  <SelectItem value="Offensives Mittelfeld">Offensives Mittelfeld</SelectItem>
                                  <SelectItem value="Linksaußen">Linksaußen</SelectItem>
                                  <SelectItem value="Rechtsaußen">Rechtsaußen</SelectItem>
                                  <SelectItem value="Stürmer">Stürmer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <SecondaryPositionsEditor
                              mainPosition={editedPlayer.position}
                              secondaryPositions={editedPlayer.secondary_positions}
                              onChange={handleSecondaryPositionsChange}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div>
                        <Label className="text-sm text-slate-600 mb-1.5 block">Alter</Label>
                        {editMode ? (
                          <Input
                            type="number"
                            value={editedPlayer?.age || ""}
                            onChange={(e) => setEditedPlayer({...editedPlayer, age: e.target.value})}
                          />
                        ) : (
                          <p className="font-semibold text-slate-900">{currentPlayerData?.age || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-slate-600 mb-1.5 block">Nationalität</Label>
                        {editMode ? (
                          <Input
                            value={editedPlayer?.nationality || ""}
                            onChange={(e) => setEditedPlayer({...editedPlayer, nationality: e.target.value})}
                          />
                        ) : (
                          <p className="font-semibold text-slate-900">{currentPlayerData?.nationality || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-slate-600 mb-1.5 block">Größe</Label>
                        {editMode ? (
                          <Input
                            type="number"
                            value={editedPlayer?.height || ""}
                            onChange={(e) => setEditedPlayer({...editedPlayer, height: e.target.value})}
                            placeholder="cm"
                          />
                        ) : (
                          <p className="font-semibold text-slate-900">
                            {currentPlayerData?.height ? `${currentPlayerData.height} cm` : '-'}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-slate-600 mb-1.5 block">Starker Fuß</Label>
                        {editMode ? (
                          <Select 
                            value={editedPlayer?.foot || ""} 
                            onValueChange={(value) => setEditedPlayer({...editedPlayer, foot: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rechts">Rechts</SelectItem>
                              <SelectItem value="links">Links</SelectItem>
                              <SelectItem value="beidfüßig">Beidfüßig</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="font-semibold text-slate-900 capitalize">{currentPlayerData?.foot || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-slate-600 mb-1.5 block">Marktwert</Label>
                        {editMode ? (
                          <Input
                            type="number"
                            value={editedPlayer?.market_value || ""}
                            onChange={(e) => setEditedPlayer({...editedPlayer, market_value: e.target.value})}
                            placeholder="€"
                          />
                        ) : (
                          <p className="font-semibold text-slate-900">
                            {currentPlayerData?.market_value 
                              ? `${(currentPlayerData.market_value / 1000000).toFixed(1)}M €`
                              : '-'
                            }
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-slate-600 mb-1.5 block">Vertrag bis</Label>
                        {editMode ? (
                          <Input
                            type="date"
                            value={editedPlayer?.contract_until || ""}
                            onChange={(e) => setEditedPlayer({...editedPlayer, contract_until: e.target.value})}
                          />
                        ) : (
                          <p className="font-semibold text-slate-900">
                            {currentPlayerData?.contract_until 
                              ? format(new Date(currentPlayerData.contract_until), "MM/yyyy")
                              : '-'
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-slate-700 mb-2 block">Stärken</Label>
                      {editMode ? (
                        <Textarea
                          value={editedPlayer?.strengths || ""}
                          onChange={(e) => setEditedPlayer({...editedPlayer, strengths: e.target.value})}
                          className="h-24"
                        />
                      ) : (
                        <p className="text-slate-600">{currentPlayerData?.strengths || "Keine Angaben"}</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-slate-700 mb-2 block">Notizen</Label>
                      {editMode ? (
                        <Textarea
                          value={editedPlayer?.notes || ""}
                          onChange={(e) => setEditedPlayer({...editedPlayer, notes: e.target.value})}
                          className="h-32"
                        />
                      ) : (
                        <p className="text-slate-600">{currentPlayerData?.notes || "Keine Notizen"}</p>
                      )}
                    </div>

                    {currentPlayerData?.transfermarkt_url && (
                      <div>
                        <Label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" />
                          Transfermarkt.de Profil
                        </Label>
                        <a
                          href={currentPlayerData.transfermarkt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-900 hover:underline break-all"
                        >
                          {currentPlayerData.transfermarkt_url}
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-slate-200 bg-white">
                  <CardHeader className="border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <CardTitle className="text-lg">Favorisierte Matches</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {favoriteMatches.length > 0 ? (
                      <div className="space-y-2">
                        {favoriteMatches.map((request) => (
                          <div 
                            key={request.id}
                            onClick={() => navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id)}
                            className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">{request.club_name}</p>
                              <p className="text-xs text-slate-600 truncate">{request.league}</p>
                            </div>
                            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">
                        Keine Favoriten
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                  <CardHeader className="border-b border-slate-100">
                    <CardTitle className="text-lg">Potentielle Vereine</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {currentPlayerData?.potential_clubs?.length > 0 ? (
                      <div className="space-y-2">
                        {currentPlayerData.potential_clubs.map((club, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">{club}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">
                        Keine Vereine hinterlegt
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preferences">
            <PlayerPreferences 
              preferences={player.preferences || {}}
              onSave={handleSavePreferences}
            />
          </TabsContent>

          <TabsContent value="matches">
            <div className="space-y-4">
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">Filter</span>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        placeholder="Verein oder Liga..."
                        value={matchFilters.search}
                        onChange={(e) => setMatchFilters({...matchFilters, search: e.target.value})}
                        className="pl-9"
                      />
                    </div>
                    <Select 
                      value={matchFilters.priority} 
                      onValueChange={(value) => setMatchFilters({...matchFilters, priority: value})}
                    >
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
                    <Select 
                      value={matchFilters.status} 
                      onValueChange={(value) => setMatchFilters({...matchFilters, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">Alle Status</SelectItem>
                        <SelectItem value="offen">Offen</SelectItem>
                        <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                        <SelectItem value="angebote_gesendet">Angebote gesendet</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={matchFilters.country} 
                      onValueChange={(value) => setMatchFilters({...matchFilters, country: value})}
                    >
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
                  </div>
                </CardContent>
              </Card>

              {filteredMatchingRequests.length === 0 ? (
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-8 text-center">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">
                      {matchingRequests.length === 0 
                        ? "Keine passenden Vereinsanfragen gefunden" 
                        : "Keine Ergebnisse für die ausgewählten Filter"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {matchingRequests.length === 0 
                        ? "Definieren Sie Spielerpräferenzen für bessere Matches"
                        : "Versuchen Sie andere Filtereinstellungen"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredMatchingRequests.map(request => {
                    const isFavorite = (player.favorite_matches || []).includes(request.id);
                    return (
                      <Card 
                        key={request.id}
                        className={`border-slate-200 bg-white hover:shadow-md transition-all cursor-pointer ${
                          isFavorite ? 'ring-2 ring-yellow-400' : ''
                        }`}
                        onClick={() => navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h4 className="font-semibold text-slate-900">{request.club_name}</h4>
                              <p className="text-sm text-slate-600 mt-1">{request.league} • {request.country}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(request.id);
                                }}
                                className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                                  isFavorite ? 'text-yellow-500' : 'text-slate-400'
                                }`}
                              >
                                <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                              </button>
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-900 text-white rounded-lg">
                                <Star className="w-3 h-3 fill-current" />
                                <span className="text-sm font-bold">{request.matchScore}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm">
                              <span className="text-slate-600">Position: </span>
                              <span className="font-semibold text-slate-900">{request.position_needed}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-slate-600">Budget: </span>
                              <span className="font-semibold text-slate-900">
                                {request.budget_min ? `${(request.budget_min / 1000000).toFixed(1)}M` : '?'} - 
                                {request.budget_max ? ` ${(request.budget_max / 1000000).toFixed(1)}M €` : ' ?'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Spieler löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Sind Sie sicher, dass Sie {player.name} dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePlayer} className="bg-red-600 hover:bg-red-700">
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}