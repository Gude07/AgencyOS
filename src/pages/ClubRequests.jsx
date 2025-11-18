import React, { useState } from "react";
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
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Building2, Mail, Phone, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

export default function ClubRequests() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("alle");

  const [newRequest, setNewRequest] = useState({
    club_name: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    position_needed: "",
    league: "",
    country: "",
    budget_min: "",
    budget_max: "",
    age_min: "",
    age_max: "",
    transfer_period: "",
    requirements: "",
    priority: "mittel",
    status: "offen",
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['clubRequests'],
    queryFn: () => base44.entities.ClubRequest.list('-created_date'),
  });

  const createRequestMutation = useMutation({
    mutationFn: (requestData) => base44.entities.ClubRequest.create(requestData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubRequests'] });
      setShowCreateDialog(false);
      setNewRequest({
        club_name: "",
        contact_person: "",
        contact_email: "",
        contact_phone: "",
        position_needed: "",
        league: "",
        country: "",
        budget_min: "",
        budget_max: "",
        age_min: "",
        age_max: "",
        transfer_period: "",
        requirements: "",
        priority: "mittel",
        status: "offen",
      });
    },
  });

  const handleCreateRequest = () => {
    const requestData = {
      ...newRequest,
      budget_min: newRequest.budget_min ? parseFloat(newRequest.budget_min) : undefined,
      budget_max: newRequest.budget_max ? parseFloat(newRequest.budget_max) : undefined,
      age_min: newRequest.age_min ? parseInt(newRequest.age_min) : undefined,
      age_max: newRequest.age_max ? parseInt(newRequest.age_max) : undefined,
    };
    createRequestMutation.mutate(requestData);
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.club_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.position_needed?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "alle" || request.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: "Gesamt", value: requests.length },
    { label: "Offen", value: requests.filter(r => r.status === "offen").length },
    { label: "In Bearbeitung", value: requests.filter(r => r.status === "in_bearbeitung").length },
    { label: "Abgeschlossen", value: requests.filter(r => r.status === "abgeschlossen").length },
  ];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Vereinsanfragen</h1>
            <p className="text-slate-600 mt-1">{filteredRequests.length} Anfragen im System</p>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-900 hover:bg-blue-800 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Anfrage hinzufügen
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Verein oder Position suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px] border-slate-200">
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
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredRequests.map(request => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card 
                  className="hover:shadow-md transition-all duration-200 cursor-pointer border border-slate-200 bg-white"
                  onClick={() => navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-blue-900 flex-shrink-0" />
                          <h3 className="font-bold text-lg text-slate-900 truncate">{request.club_name}</h3>
                        </div>
                        <p className="text-sm text-slate-600">{request.league} • {request.country}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="secondary" className={priorityColors[request.priority] + " border"}>
                            {request.priority}
                          </Badge>
                          <Badge variant="secondary" className={statusColors[request.status] + " border"}>
                            {request.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Gesuchte Position</p>
                      <p className="font-semibold text-slate-900">{request.position_needed}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600">Budget</p>
                        <p className="font-semibold text-slate-900">
                          {request.budget_min ? `${(request.budget_min / 1000000).toFixed(1)}M` : '?'} - 
                          {request.budget_max ? ` ${(request.budget_max / 1000000).toFixed(1)}M €` : ' ?'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Alter</p>
                        <p className="font-semibold text-slate-900">
                          {request.age_min || '?'} - {request.age_max || '?'} Jahre
                        </p>
                      </div>
                    </div>

                    {request.transfer_period && (
                      <Badge variant="outline" className="w-full justify-center border-slate-200">
                        {request.transfer_period}
                      </Badge>
                    )}

                    {request.contact_person && (
                      <div className="pt-2 border-t border-slate-100 text-sm">
                        <p className="text-slate-600">{request.contact_person}</p>
                        {request.contact_email && (
                          <p className="text-slate-500 text-xs mt-1 truncate">{request.contact_email}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredRequests.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">Keine Anfragen gefunden</p>
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Neue Vereinsanfrage</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="club_name">Vereinsname *</Label>
                  <Input
                    id="club_name"
                    value={newRequest.club_name}
                    onChange={(e) => setNewRequest({...newRequest, club_name: e.target.value})}
                    placeholder="z.B. FC Beispiel"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="league">Liga</Label>
                  <Input
                    id="league"
                    value={newRequest.league}
                    onChange={(e) => setNewRequest({...newRequest, league: e.target.value})}
                    placeholder="z.B. 2. Bundesliga"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="country">Land</Label>
                  <Input
                    id="country"
                    value={newRequest.country}
                    onChange={(e) => setNewRequest({...newRequest, country: e.target.value})}
                    placeholder="z.B. Deutschland"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_person">Ansprechpartner</Label>
                  <Input
                    id="contact_person"
                    value={newRequest.contact_person}
                    onChange={(e) => setNewRequest({...newRequest, contact_person: e.target.value})}
                    placeholder="Name"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_email">E-Mail</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={newRequest.contact_email}
                    onChange={(e) => setNewRequest({...newRequest, contact_email: e.target.value})}
                    placeholder="email@beispiel.de"
                    className="mt-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="contact_phone">Telefon</Label>
                  <Input
                    id="contact_phone"
                    value={newRequest.contact_phone}
                    onChange={(e) => setNewRequest({...newRequest, contact_phone: e.target.value})}
                    placeholder="+49 123 456789"
                    className="mt-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="position_needed">Gesuchte Position *</Label>
                  <Select value={newRequest.position_needed} onValueChange={(value) => setNewRequest({...newRequest, position_needed: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Wählen..." />
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

                <div>
                  <Label htmlFor="budget_min">Min. Budget (€)</Label>
                  <Input
                    id="budget_min"
                    type="number"
                    value={newRequest.budget_min}
                    onChange={(e) => setNewRequest({...newRequest, budget_min: e.target.value})}
                    placeholder="500000"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="budget_max">Max. Budget (€)</Label>
                  <Input
                    id="budget_max"
                    type="number"
                    value={newRequest.budget_max}
                    onChange={(e) => setNewRequest({...newRequest, budget_max: e.target.value})}
                    placeholder="2000000"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="age_min">Min. Alter</Label>
                  <Input
                    id="age_min"
                    type="number"
                    value={newRequest.age_min}
                    onChange={(e) => setNewRequest({...newRequest, age_min: e.target.value})}
                    placeholder="18"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="age_max">Max. Alter</Label>
                  <Input
                    id="age_max"
                    type="number"
                    value={newRequest.age_max}
                    onChange={(e) => setNewRequest({...newRequest, age_max: e.target.value})}
                    placeholder="28"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="transfer_period">Transferperiode</Label>
                  <Select value={newRequest.transfer_period} onValueChange={(value) => setNewRequest({...newRequest, transfer_period: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Winter 2024/25">Winter 2024/25</SelectItem>
                      <SelectItem value="Sommer 2025">Sommer 2025</SelectItem>
                      <SelectItem value="Winter 2025/26">Winter 2025/26</SelectItem>
                      <SelectItem value="Sommer 2026">Sommer 2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priorität</Label>
                  <Select value={newRequest.priority} onValueChange={(value) => setNewRequest({...newRequest, priority: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="niedrig">Niedrig</SelectItem>
                      <SelectItem value="mittel">Mittel</SelectItem>
                      <SelectItem value="hoch">Hoch</SelectItem>
                      <SelectItem value="dringend">Dringend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="requirements">Weitere Anforderungen</Label>
                  <Textarea
                    id="requirements"
                    value={newRequest.requirements}
                    onChange={(e) => setNewRequest({...newRequest, requirements: e.target.value})}
                    placeholder="Detaillierte Anforderungen und Wünsche..."
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
                onClick={handleCreateRequest}
                disabled={!newRequest.club_name || !newRequest.position_needed || createRequestMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {createRequestMutation.isPending ? "Wird erstellt..." : "Anfrage erstellen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}