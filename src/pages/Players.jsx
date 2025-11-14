import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, ExternalLink, Calendar, TrendingUp, Users as UsersIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

export default function Players() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("alle");
  const [filterPosition, setFilterPosition] = useState("alle");

  const [newPlayer, setNewPlayer] = useState({
    name: "",
    date_of_birth: "",
    age: "",
    nationality: "",
    position: "",
    current_club: "",
    market_value: "",
    contract_until: "",
    transfermarkt_url: "",
    category: "Beobachtungsliste",
    potential_clubs: [],
    notes: "",
    status: "aktiv",
    strengths: "",
    foot: "",
    height: "",
  });

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list('-created_date'),
  });

  const createPlayerMutation = useMutation({
    mutationFn: (playerData) => base44.entities.Player.create(playerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setShowCreateDialog(false);
      setNewPlayer({
        name: "",
        date_of_birth: "",
        age: "",
        nationality: "",
        position: "",
        current_club: "",
        market_value: "",
        contract_until: "",
        transfermarkt_url: "",
        category: "Beobachtungsliste",
        potential_clubs: [],
        notes: "",
        status: "aktiv",
        strengths: "",
        foot: "",
        height: "",
      });
    },
  });

  const handleCreatePlayer = () => {
    const playerData = {
      ...newPlayer,
      age: newPlayer.age ? parseInt(newPlayer.age) : undefined,
      market_value: newPlayer.market_value ? parseFloat(newPlayer.market_value) : undefined,
      height: newPlayer.height ? parseFloat(newPlayer.height) : undefined,
    };
    createPlayerMutation.mutate(playerData);
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.current_club?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "alle" || player.category === filterCategory;
    const matchesPosition = filterPosition === "alle" || player.position === filterPosition;
    
    return matchesSearch && matchesCategory && matchesPosition;
  });

  const stats = [
    { label: "Gesamt", value: players.length },
    { label: "Wintertransfer", value: players.filter(p => p.category === "Wintertransferperiode").length },
    { label: "Sommertransfer", value: players.filter(p => p.category === "Sommertransferperiode").length },
    { label: "Top-Priorität", value: players.filter(p => p.category === "Top-Priorität").length },
  ];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Spielerverwaltung</h1>
            <p className="text-slate-600 mt-1">{filteredPlayers.length} Spieler im Portfolio</p>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-900 hover:bg-blue-800 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Spieler hinzufügen
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Spieler oder Verein suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-slate-200"
            />
          </div>

          <Tabs value={filterCategory} onValueChange={setFilterCategory}>
            <TabsList className="bg-slate-100">
              <TabsTrigger value="alle">Alle</TabsTrigger>
              <TabsTrigger value="Wintertransferperiode">Winter</TabsTrigger>
              <TabsTrigger value="Sommertransferperiode">Sommer</TabsTrigger>
              <TabsTrigger value="Top-Priorität">Top-Priorität</TabsTrigger>
              <TabsTrigger value="Beobachtungsliste">Beobachtung</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={filterPosition} onValueChange={setFilterPosition}>
            <SelectTrigger className="w-[200px] border-slate-200">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Positionen</SelectItem>
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
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredPlayers.map(player => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card 
                  className="hover:shadow-md transition-all duration-200 cursor-pointer border border-slate-200 bg-white"
                  onClick={() => navigate(createPageUrl("PlayerDetail") + "?id=" + player.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">{player.name}</h3>
                          <p className="text-sm text-slate-600">{player.current_club}</p>
                        </div>
                        {player.transfermarkt_url && (
                          <a
                            href={player.transfermarkt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-slate-500" />
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className={categoryColors[player.category] + " border"}>
                          {player.category}
                        </Badge>
                        <Badge variant="outline" className="border-slate-200">
                          {player.position}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600">Alter</p>
                        <p className="font-semibold text-slate-900">{player.age || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Nationalität</p>
                        <p className="font-semibold text-slate-900">{player.nationality || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Marktwert</p>
                        <p className="font-semibold text-slate-900">
                          {player.market_value ? `${(player.market_value / 1000000).toFixed(1)}M €` : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Vertrag bis</p>
                        <p className="font-semibold text-slate-900">
                          {player.contract_until ? format(new Date(player.contract_until), "MM/yyyy") : '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredPlayers.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <UsersIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">Keine Spieler gefunden</p>
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Neuen Spieler hinzufügen</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newPlayer.name}
                    onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                    placeholder="z.B. Max Mustermann"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="date_of_birth">Geburtsdatum</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={newPlayer.date_of_birth}
                    onChange={(e) => setNewPlayer({...newPlayer, date_of_birth: e.target.value})}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="age">Alter</Label>
                  <Input
                    id="age"
                    type="number"
                    value={newPlayer.age}
                    onChange={(e) => setNewPlayer({...newPlayer, age: e.target.value})}
                    placeholder="25"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="nationality">Nationalität</Label>
                  <Input
                    id="nationality"
                    value={newPlayer.nationality}
                    onChange={(e) => setNewPlayer({...newPlayer, nationality: e.target.value})}
                    placeholder="z.B. Deutschland"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="position">Position *</Label>
                  <Select value={newPlayer.position} onValueChange={(value) => setNewPlayer({...newPlayer, position: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Wählen..." />
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
                </div>

                <div>
                  <Label htmlFor="current_club">Aktueller Verein</Label>
                  <Input
                    id="current_club"
                    value={newPlayer.current_club}
                    onChange={(e) => setNewPlayer({...newPlayer, current_club: e.target.value})}
                    placeholder="z.B. FC Bayern München"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="market_value">Marktwert (€)</Label>
                  <Input
                    id="market_value"
                    type="number"
                    value={newPlayer.market_value}
                    onChange={(e) => setNewPlayer({...newPlayer, market_value: e.target.value})}
                    placeholder="5000000"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="contract_until">Vertrag bis</Label>
                  <Input
                    id="contract_until"
                    type="date"
                    value={newPlayer.contract_until}
                    onChange={(e) => setNewPlayer({...newPlayer, contract_until: e.target.value})}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="foot">Starker Fuß</Label>
                  <Select value={newPlayer.foot} onValueChange={(value) => setNewPlayer({...newPlayer, foot: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rechts">Rechts</SelectItem>
                      <SelectItem value="links">Links</SelectItem>
                      <SelectItem value="beidfüßig">Beidfüßig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="height">Größe (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={newPlayer.height}
                    onChange={(e) => setNewPlayer({...newPlayer, height: e.target.value})}
                    placeholder="185"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Kategorie</Label>
                  <Select value={newPlayer.category} onValueChange={(value) => setNewPlayer({...newPlayer, category: value})}>
                    <SelectTrigger className="mt-1.5">
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
                </div>

                <div className="col-span-2">
                  <Label htmlFor="transfermarkt_url">Transfermarkt.de Link</Label>
                  <Input
                    id="transfermarkt_url"
                    value={newPlayer.transfermarkt_url}
                    onChange={(e) => setNewPlayer({...newPlayer, transfermarkt_url: e.target.value})}
                    placeholder="https://www.transfermarkt.de/..."
                    className="mt-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="strengths">Stärken</Label>
                  <Textarea
                    id="strengths"
                    value={newPlayer.strengths}
                    onChange={(e) => setNewPlayer({...newPlayer, strengths: e.target.value})}
                    placeholder="z.B. Schnelligkeit, Technik, Kopfballstärke..."
                    className="mt-1.5 h-20"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea
                    id="notes"
                    value={newPlayer.notes}
                    onChange={(e) => setNewPlayer({...newPlayer, notes: e.target.value})}
                    placeholder="Weitere Informationen..."
                    className="mt-1.5 h-20"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleCreatePlayer}
                disabled={!newPlayer.name || !newPlayer.position || createPlayerMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {createPlayerMutation.isPending ? "Wird hinzugefügt..." : "Spieler hinzufügen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}