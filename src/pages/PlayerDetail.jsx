import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ExternalLink, Building2, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

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

  const handleSavePlayer = () => {
    const playerData = {
      ...editedPlayer,
      age: editedPlayer.age ? parseInt(editedPlayer.age) : undefined,
      market_value: editedPlayer.market_value ? parseFloat(editedPlayer.market_value) : undefined,
      height: editedPlayer.height ? parseFloat(editedPlayer.height) : undefined,
    };
    updatePlayerMutation.mutate({ id: playerId, data: playerData });
  };

  const matchedRequests = clubRequests.filter(req => 
    player?.matched_requests?.includes(req.id)
  );

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

  const currentPlayerData = editMode ? editedPlayer : player;

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
            <Button onClick={() => { setEditMode(true); setEditedPlayer(player); }} variant="outline">
              Bearbeiten
            </Button>
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

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editMode ? (
                        <Input
                          value={editedPlayer.name}
                          onChange={(e) => setEditedPlayer({...editedPlayer, name: e.target.value})}
                          className="text-2xl font-bold mb-2"
                        />
                      ) : (
                        <CardTitle className="text-2xl">{currentPlayerData.name}</CardTitle>
                      )}
                      {editMode ? (
                        <Input
                          value={editedPlayer.current_club || ""}
                          onChange={(e) => setEditedPlayer({...editedPlayer, current_club: e.target.value})}
                          placeholder="Aktueller Verein"
                          className="mt-2"
                        />
                      ) : (
                        <p className="text-slate-600 mt-1">{currentPlayerData.current_club}</p>
                      )}
                    </div>
                    {currentPlayerData.transfermarkt_url && (
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
                  <div className="flex flex-wrap gap-2">
                    {editMode ? (
                      <Select 
                        value={editedPlayer.category} 
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
                      <Badge variant="secondary" className={categoryColors[currentPlayerData.category] + " border"}>
                        {currentPlayerData.category}
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-slate-200">
                      {currentPlayerData.position}
                    </Badge>
                    <Badge variant="outline" className="border-slate-200">
                      {currentPlayerData.status}
                    </Badge>
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
                        value={editedPlayer.age || ""}
                        onChange={(e) => setEditedPlayer({...editedPlayer, age: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">{currentPlayerData.age || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Nationalität</Label>
                    {editMode ? (
                      <Input
                        value={editedPlayer.nationality || ""}
                        onChange={(e) => setEditedPlayer({...editedPlayer, nationality: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">{currentPlayerData.nationality || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Größe</Label>
                    {editMode ? (
                      <Input
                        type="number"
                        value={editedPlayer.height || ""}
                        onChange={(e) => setEditedPlayer({...editedPlayer, height: e.target.value})}
                        placeholder="cm"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {currentPlayerData.height ? `${currentPlayerData.height} cm` : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Starker Fuß</Label>
                    {editMode ? (
                      <Select 
                        value={editedPlayer.foot || ""} 
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
                      <p className="font-semibold text-slate-900 capitalize">{currentPlayerData.foot || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Marktwert</Label>
                    {editMode ? (
                      <Input
                        type="number"
                        value={editedPlayer.market_value || ""}
                        onChange={(e) => setEditedPlayer({...editedPlayer, market_value: e.target.value})}
                        placeholder="€"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {currentPlayerData.market_value 
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
                        value={editedPlayer.contract_until || ""}
                        onChange={(e) => setEditedPlayer({...editedPlayer, contract_until: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {currentPlayerData.contract_until 
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
                      value={editedPlayer.strengths || ""}
                      onChange={(e) => setEditedPlayer({...editedPlayer, strengths: e.target.value})}
                      className="h-24"
                    />
                  ) : (
                    <p className="text-slate-600">{currentPlayerData.strengths || "Keine Angaben"}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Notizen</Label>
                  {editMode ? (
                    <Textarea
                      value={editedPlayer.notes || ""}
                      onChange={(e) => setEditedPlayer({...editedPlayer, notes: e.target.value})}
                      className="h-32"
                    />
                  ) : (
                    <p className="text-slate-600">{currentPlayerData.notes || "Keine Notizen"}</p>
                  )}
                </div>

                {currentPlayerData.transfermarkt_url && (
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Passende Vereinsanfragen
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {matchedRequests.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Keine passenden Anfragen
                  </p>
                ) : (
                  <div className="space-y-3">
                    {matchedRequests.map(request => (
                      <div 
                        key={request.id}
                        className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id)}
                      >
                        <h4 className="font-semibold text-slate-900">{request.club_name}</h4>
                        <p className="text-sm text-slate-600 mt-1">{request.position_needed}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Budget: {request.budget_min ? `${(request.budget_min / 1000000).toFixed(1)}M` : '?'} - 
                          {request.budget_max ? ` ${(request.budget_max / 1000000).toFixed(1)}M €` : ' ?'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">Potentielle Vereine</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {currentPlayerData.potential_clubs?.length > 0 ? (
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
      </div>
    </div>
  );
}