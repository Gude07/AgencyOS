import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, TrendingUp, User, Building2, Clock, DollarSign, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import MultiUserSelect from "../components/tasks/MultiUserSelect";

const statusColors = {
  interesse: "bg-slate-100 text-slate-800 border-slate-200",
  verhandlung: "bg-blue-100 text-blue-800 border-blue-200",
  angebot_erhalten: "bg-purple-100 text-purple-800 border-purple-200",
  medizincheck: "bg-yellow-100 text-yellow-800 border-yellow-200",
  vertragsunterzeichnung: "bg-orange-100 text-orange-800 border-orange-200",
  abgeschlossen: "bg-green-100 text-green-800 border-green-200",
  abgelehnt: "bg-red-100 text-red-800 border-red-200",
  pausiert: "bg-gray-100 text-gray-800 border-gray-200",
};

const priorityColors = {
  kritisch: "bg-red-100 text-red-800 border-red-200",
  hoch: "bg-orange-100 text-orange-800 border-orange-200",
  mittel: "bg-yellow-100 text-yellow-800 border-yellow-200",
  niedrig: "bg-green-100 text-green-800 border-green-200",
};

export default function Deals() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const [newDeal, setNewDeal] = useState({
    title: "",
    player_id: "",
    player_name: "",
    club_request_id: "",
    receiving_club: "",
    releasing_club: "",
    status: "interesse",
    transfer_type: "transfer",
    transfer_fee: "",
    annual_salary: "",
    contract_length: "",
    agent_name: "",
    transfer_window: "Sommer 2026",
    priority: "mittel",
    assigned_to: [],
    probability: 50,
    notes: "",
  });

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list('-created_date'),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: clubRequests = [] } = useQuery({
    queryKey: ['clubRequests'],
    queryFn: () => base44.entities.ClubRequest.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createDealMutation = useMutation({
    mutationFn: (dealData) => base44.entities.Deal.create(dealData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setShowCreateDialog(false);
      setNewDeal({
        title: "",
        player_id: "",
        player_name: "",
        club_request_id: "",
        receiving_club: "",
        releasing_club: "",
        status: "interesse",
        transfer_type: "transfer",
        transfer_fee: "",
        annual_salary: "",
        contract_length: "",
        agent_name: "",
        transfer_window: "Sommer 2026",
        priority: "mittel",
        assigned_to: [],
        probability: 50,
        notes: "",
      });
    },
  });

  const handleCreateDeal = () => {
    const dealData = {
      ...newDeal,
      transfer_fee: newDeal.transfer_fee ? parseFloat(newDeal.transfer_fee) : undefined,
      annual_salary: newDeal.annual_salary ? parseFloat(newDeal.annual_salary) : undefined,
      contract_length: newDeal.contract_length ? parseFloat(newDeal.contract_length) : undefined,
    };
    createDealMutation.mutate(dealData);
  };

  const handlePlayerSelect = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setNewDeal({
        ...newDeal,
        player_id: playerId,
        player_name: player.name,
        releasing_club: player.current_club || "",
        title: `${player.name} → ${newDeal.receiving_club || "..."}`,
      });
    }
  };

  const handleClubRequestSelect = (requestId) => {
    const request = clubRequests.find(r => r.id === requestId);
    if (request) {
      setNewDeal({
        ...newDeal,
        club_request_id: requestId,
        receiving_club: request.club_name,
        title: `${newDeal.player_name || "..."} → ${request.club_name}`,
      });
    }
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.player_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.receiving_club?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || deal.status === filterStatus;
    const matchesPriority = filterPriority === "all" || deal.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = [
    {
      label: "Aktive Deals",
      value: deals.filter(d => !["abgeschlossen", "abgelehnt"].includes(d.status)).length,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      label: "Abgeschlossen",
      value: deals.filter(d => d.status === "abgeschlossen").length,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      label: "Gesamtvolumen",
      value: `${(deals.filter(d => d.status === "abgeschlossen").reduce((sum, d) => sum + (d.transfer_fee || 0), 0) / 1000000).toFixed(1)}M €`,
      icon: DollarSign,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Transfer Management</h1>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-900 hover:bg-blue-800">
            <Plus className="w-5 h-5 mr-2" />
            Neuer Deal
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Suche nach Spieler, Verein..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="interesse">Interesse</SelectItem>
                  <SelectItem value="verhandlung">Verhandlung</SelectItem>
                  <SelectItem value="angebot_erhalten">Angebot erhalten</SelectItem>
                  <SelectItem value="medizincheck">Medizincheck</SelectItem>
                  <SelectItem value="vertragsunterzeichnung">Vertragsunterzeichnung</SelectItem>
                  <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                  <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Priorität" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Prioritäten</SelectItem>
                  <SelectItem value="kritisch">Kritisch</SelectItem>
                  <SelectItem value="hoch">Hoch</SelectItem>
                  <SelectItem value="mittel">Mittel</SelectItem>
                  <SelectItem value="niedrig">Niedrig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
          </div>
        ) : filteredDeals.length === 0 ? (
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-12 text-center">
              <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">
                {deals.length === 0 ? "Noch keine Deals erfasst" : "Keine Deals gefunden"}
              </p>
              <p className="text-sm text-slate-500 mt-2">
                {deals.length === 0 ? "Erstellen Sie Ihren ersten Transfer-Deal" : "Versuchen Sie andere Filter"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDeals.map((deal) => (
              <Card
                key={deal.id}
                className="border-slate-200 bg-white hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(createPageUrl("DealDetail") + "?id=" + deal.id)}
              >
                <CardHeader className="border-b border-slate-100">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{deal.title}</CardTitle>
                      {deal.probability && (
                        <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-900">
                          {deal.probability}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className={statusColors[deal.status] + " border text-xs"}>
                        {deal.status.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="secondary" className={priorityColors[deal.priority] + " border text-xs"}>
                        {deal.priority}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-700">{deal.player_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-700">{deal.receiving_club}</span>
                  </div>
                  {deal.transfer_fee && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-700 font-semibold">
                        {(deal.transfer_fee / 1000000).toFixed(2)}M €
                      </span>
                    </div>
                  )}
                  {deal.expected_completion_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">
                        {format(new Date(deal.expected_completion_date), "dd.MM.yyyy")}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neuen Deal erstellen</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Spieler auswählen (optional)</Label>
                  <Select value={newDeal.player_id} onValueChange={handlePlayerSelect}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Spieler aus System wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} ({player.current_club || "Vereinslos"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="player_name">Spielername *</Label>
                  <Input
                    id="player_name"
                    value={newDeal.player_name}
                    onChange={(e) => setNewDeal({...newDeal, player_name: e.target.value})}
                    placeholder="Name des Spielers"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label>Vereinsanfrage verknüpfen (optional)</Label>
                  <Select value={newDeal.club_request_id} onValueChange={handleClubRequestSelect}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Anfrage wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clubRequests.map(request => (
                        <SelectItem key={request.id} value={request.id}>
                          {request.club_name} - {request.position_needed}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="receiving_club">Aufnehmender Verein *</Label>
                  <Input
                    id="receiving_club"
                    value={newDeal.receiving_club}
                    onChange={(e) => {
                      setNewDeal({
                        ...newDeal,
                        receiving_club: e.target.value,
                        title: `${newDeal.player_name || "..."} → ${e.target.value}`,
                      });
                    }}
                    placeholder="Name des Vereins"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="releasing_club">Abgebender Verein</Label>
                  <Input
                    id="releasing_club"
                    value={newDeal.releasing_club}
                    onChange={(e) => setNewDeal({...newDeal, releasing_club: e.target.value})}
                    placeholder="Aktueller Verein"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newDeal.status} onValueChange={(value) => setNewDeal({...newDeal, status: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interesse">Interesse</SelectItem>
                      <SelectItem value="verhandlung">Verhandlung</SelectItem>
                      <SelectItem value="angebot_erhalten">Angebot erhalten</SelectItem>
                      <SelectItem value="medizincheck">Medizincheck</SelectItem>
                      <SelectItem value="vertragsunterzeichnung">Vertragsunterzeichnung</SelectItem>
                      <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                      <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priorität</Label>
                  <Select value={newDeal.priority} onValueChange={(value) => setNewDeal({...newDeal, priority: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="niedrig">Niedrig</SelectItem>
                      <SelectItem value="mittel">Mittel</SelectItem>
                      <SelectItem value="hoch">Hoch</SelectItem>
                      <SelectItem value="kritisch">Kritisch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="transfer_type">Transfer-Art</Label>
                  <Select value={newDeal.transfer_type} onValueChange={(value) => setNewDeal({...newDeal, transfer_type: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="leihe">Leihe</SelectItem>
                      <SelectItem value="ablösefrei">Ablösefrei</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="transfer_fee">Ablösesumme (€)</Label>
                  <Input
                    id="transfer_fee"
                    type="number"
                    value={newDeal.transfer_fee}
                    onChange={(e) => setNewDeal({...newDeal, transfer_fee: e.target.value})}
                    placeholder="z.B. 5000000"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="annual_salary">Jahresgehalt (€)</Label>
                  <Input
                    id="annual_salary"
                    type="number"
                    value={newDeal.annual_salary}
                    onChange={(e) => setNewDeal({...newDeal, annual_salary: e.target.value})}
                    placeholder="z.B. 500000"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="contract_length">Vertragslaufzeit (Jahre)</Label>
                  <Input
                    id="contract_length"
                    type="number"
                    value={newDeal.contract_length}
                    onChange={(e) => setNewDeal({...newDeal, contract_length: e.target.value})}
                    placeholder="z.B. 3"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="agent_name">Berater</Label>
                  <Input
                    id="agent_name"
                    value={newDeal.agent_name}
                    onChange={(e) => setNewDeal({...newDeal, agent_name: e.target.value})}
                    placeholder="Name des Beraters"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="transfer_window">Transferfenster</Label>
                  <Select value={newDeal.transfer_window} onValueChange={(value) => setNewDeal({...newDeal, transfer_window: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Winter 2025/26">Winter 2025/26</SelectItem>
                      <SelectItem value="Sommer 2026">Sommer 2026</SelectItem>
                      <SelectItem value="Winter 2026/27">Winter 2026/27</SelectItem>
                      <SelectItem value="Sommer 2027">Sommer 2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="probability">Wahrscheinlichkeit (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={newDeal.probability}
                    onChange={(e) => setNewDeal({...newDeal, probability: parseInt(e.target.value) || 0})}
                    className="mt-1.5"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Zuständige Personen</Label>
                  <div className="mt-1.5">
                    <MultiUserSelect
                      selectedUsers={newDeal.assigned_to}
                      users={users}
                      onChange={(users) => setNewDeal({...newDeal, assigned_to: users})}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea
                    id="notes"
                    value={newDeal.notes}
                    onChange={(e) => setNewDeal({...newDeal, notes: e.target.value})}
                    placeholder="Zusätzliche Details..."
                    className="mt-1.5 h-24"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleCreateDeal}
                disabled={!newDeal.player_name || !newDeal.receiving_club || createDealMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {createDealMutation.isPending ? "Wird erstellt..." : "Deal erstellen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}