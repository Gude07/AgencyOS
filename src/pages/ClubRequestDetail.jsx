import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Mail, Phone, Building2, Users, Link as LinkIcon } from "lucide-react";
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

export default function ClubRequestDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('id');

  const [editMode, setEditMode] = useState(false);
  const [editedRequest, setEditedRequest] = useState(null);

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

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClubRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubRequest', requestId] });
      queryClient.invalidateQueries({ queryKey: ['clubRequests'] });
      setEditMode(false);
    },
  });

  const handleSaveRequest = () => {
    const requestData = {
      ...editedRequest,
      budget_min: editedRequest.budget_min ? parseFloat(editedRequest.budget_min) : undefined,
      budget_max: editedRequest.budget_max ? parseFloat(editedRequest.budget_max) : undefined,
      age_min: editedRequest.age_min ? parseInt(editedRequest.age_min) : undefined,
      age_max: editedRequest.age_max ? parseInt(editedRequest.age_max) : undefined,
    };
    updateRequestMutation.mutate({ id: requestId, data: requestData });
  };

  const handleTogglePlayer = (playerId) => {
    const matchedPlayers = request.matched_players || [];
    const newMatchedPlayers = matchedPlayers.includes(playerId)
      ? matchedPlayers.filter(id => id !== playerId)
      : [...matchedPlayers, playerId];
    
    updateRequestMutation.mutate({ 
      id: requestId, 
      data: { matched_players: newMatchedPlayers }
    });
  };

  // Filter matching players based on request criteria
  const matchingPlayers = players.filter(player => {
    if (!player.position || player.position !== request?.position_needed) return false;
    
    const ageMatch = (!request.age_min || player.age >= request.age_min) &&
                     (!request.age_max || player.age <= request.age_max);
    
    const budgetMatch = (!request.budget_max || !player.market_value || player.market_value <= request.budget_max);
    
    return ageMatch && budgetMatch;
  });

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

  const currentRequestData = editMode ? editedRequest : request;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("ClubRequests"))}
            className="hover:bg-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Anfrage Details</h1>
          </div>
          {!editMode ? (
            <Button onClick={() => { setEditMode(true); setEditedRequest(request); }} variant="outline">
              Bearbeiten
            </Button>
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

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-blue-900" />
                    {editMode ? (
                      <Input
                        value={editedRequest.club_name}
                        onChange={(e) => setEditedRequest({...editedRequest, club_name: e.target.value})}
                        className="text-2xl font-bold"
                      />
                    ) : (
                      <CardTitle className="text-2xl">{currentRequestData.club_name}</CardTitle>
                    )}
                  </div>
                  {editMode ? (
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
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-3 block">Kontaktinformationen</Label>
                  <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                    {editMode ? (
                      <>
                        <Input
                          value={editedRequest.contact_person || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, contact_person: e.target.value})}
                          placeholder="Ansprechpartner"
                        />
                        <Input
                          value={editedRequest.contact_email || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, contact_email: e.target.value})}
                          placeholder="E-Mail"
                        />
                        <Input
                          value={editedRequest.contact_phone || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, contact_phone: e.target.value})}
                          placeholder="Telefon"
                        />
                      </>
                    ) : (
                      <>
                        {currentRequestData.contact_person && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-700">{currentRequestData.contact_person}</span>
                          </div>
                        )}
                        {currentRequestData.contact_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-500" />
                            <a href={`mailto:${currentRequestData.contact_email}`} className="text-blue-900 hover:underline">
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
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Gesuchte Position</Label>
                    {editMode ? (
                      <Select 
                        value={editedRequest.position_needed} 
                        onValueChange={(value) => setEditedRequest({...editedRequest, position_needed: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Torwart">Torwart</SelectItem>
                          <SelectItem value="Innenverteidiger">Innenverteidiger</SelectItem>
                          <SelectItem value="Außenverteidiger">Außenverteidiger</SelectItem>
                          <SelectItem value="Defensives Mittelfeld">Defensives Mittelfeld</SelectItem>
                          <SelectItem value="Zentrales Mittelfeld">Zentrales Mittelfeld</SelectItem>
                          <SelectItem value="Offensives Mittelfeld">Offensives Mittelfeld</SelectItem>
                          <SelectItem value="Flügelspieler">Flügelspieler</SelectItem>
                          <SelectItem value="Stürmer">Stürmer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-semibold text-slate-900">{currentRequestData.position_needed}</p>
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
                          <SelectItem value="Winter 2024/25">Winter 2024/25</SelectItem>
                          <SelectItem value="Sommer 2025">Sommer 2025</SelectItem>
                          <SelectItem value="Winter 2025/26">Winter 2025/26</SelectItem>
                          <SelectItem value="Sommer 2026">Sommer 2026</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-semibold text-slate-900">{currentRequestData.transfer_period || '-'}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Budget</Label>
                    {editMode ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={editedRequest.budget_min || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, budget_min: e.target.value})}
                          placeholder="Min"
                        />
                        <Input
                          type="number"
                          value={editedRequest.budget_max || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, budget_max: e.target.value})}
                          placeholder="Max"
                        />
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {currentRequestData.budget_min ? `${(currentRequestData.budget_min / 1000000).toFixed(1)}M` : '?'} - 
                        {currentRequestData.budget_max ? ` ${(currentRequestData.budget_max / 1000000).toFixed(1)}M €` : ' ?'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Altersbereich</Label>
                    {editMode ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={editedRequest.age_min || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, age_min: e.target.value})}
                          placeholder="Min"
                        />
                        <Input
                          type="number"
                          value={editedRequest.age_max || ""}
                          onChange={(e) => setEditedRequest({...editedRequest, age_max: e.target.value})}
                          placeholder="Max"
                        />
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {currentRequestData.age_min || '?'} - {currentRequestData.age_max || '?'} Jahre
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Anforderungen</Label>
                  {editMode ? (
                    <Textarea
                      value={editedRequest.requirements || ""}
                      onChange={(e) => setEditedRequest({...editedRequest, requirements: e.target.value})}
                      className="h-32"
                    />
                  ) : (
                    <p className="text-slate-600">{currentRequestData.requirements || "Keine weiteren Anforderungen"}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">Passende Spieler ({matchingPlayers.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {matchingPlayers.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Keine passenden Spieler gefunden
                  </p>
                ) : (
                  <div className="space-y-3">
                    {matchingPlayers.map(player => {
                      const isMatched = request.matched_players?.includes(player.id);
                      return (
                        <div 
                          key={player.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            isMatched ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isMatched}
                              onCheckedChange={() => handleTogglePlayer(player.id)}
                              className="mt-1"
                            />
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => navigate(createPageUrl("PlayerDetail") + "?id=" + player.id)}
                            >
                              <h4 className="font-semibold text-slate-900">{player.name}</h4>
                              <p className="text-sm text-slate-600 mt-1">{player.current_club}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                <span>{player.age} Jahre</span>
                                <span>•</span>
                                <span>{player.market_value ? `${(player.market_value / 1000000).toFixed(1)}M €` : '-'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}