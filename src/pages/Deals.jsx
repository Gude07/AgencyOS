import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { 
  Plus, 
  Search, 
  TrendingUp, 
  DollarSign, 
  FileCheck, 
  BarChart3,
  Trash2,
  Edit,
  ArrowLeft
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import DealCard from "@/components/deals/DealCard";
import DealForm from "@/components/deals/DealForm";
import FinancialOverview from "@/components/deals/FinancialOverview";

const statusOrder = [
  'interesse',
  'verhandlung', 
  'angebot_erhalten',
  'medizincheck',
  'vertragsunterzeichnung',
  'abgeschlossen',
  'pausiert',
  'abgelehnt'
];

export default function Deals() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  
  const [activeTab, setActiveTab] = useState(urlParams.get('tab') || "deals");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("alle");
  const [filterPriority, setFilterPriority] = useState("alle");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [deletingDeal, setDeletingDeal] = useState(null);

  // Daten laden
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list('-created_date'),
    refetchInterval: 10000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  // Mutations
  const createDealMutation = useMutation({
    mutationFn: (data) => base44.entities.Deal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setShowCreateDialog(false);
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setEditingDeal(null);
      setSelectedDeal(null);
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: (id) => base44.entities.Deal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setDeletingDeal(null);
      setSelectedDeal(null);
    },
  });

  // Filtern
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const matchesSearch = searchTerm === "" || 
        deal.player_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.receiving_club?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "alle" || deal.status === filterStatus;
      const matchesPriority = filterPriority === "alle" || deal.priority === filterPriority;
      
      return matchesSearch && matchesStatus && matchesPriority;
    }).sort((a, b) => {
      // Erst nach Status, dann nach Datum
      const statusA = statusOrder.indexOf(a.status);
      const statusB = statusOrder.indexOf(b.status);
      if (statusA !== statusB) return statusA - statusB;
      return new Date(b.created_date) - new Date(a.created_date);
    });
  }, [deals, searchTerm, filterStatus, filterPriority]);

  // Statistiken
  const stats = useMemo(() => {
    const active = deals.filter(d => !['abgeschlossen', 'abgelehnt'].includes(d.status)).length;
    const completed = deals.filter(d => d.status === 'abgeschlossen').length;
    const totalValue = deals.filter(d => d.status === 'abgeschlossen')
      .reduce((sum, d) => sum + (d.transfer_fee || 0), 0);
    
    return { active, completed, totalValue };
  }, [deals]);

  const handleDealClick = (deal) => {
    setSelectedDeal(deal);
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Deals</h1>
            <p className="text-slate-600 mt-1">
              {deals.length} Deals • {stats.active} aktiv • {stats.completed} abgeschlossen
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-900 hover:bg-blue-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neuer Deal
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="deals" className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Deals
            </TabsTrigger>
            <TabsTrigger value="finanzen" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Finanzübersicht
            </TabsTrigger>
          </TabsList>

          {/* Deals Tab */}
          <TabsContent value="deals" className="space-y-4">
            {/* Kurzstatistiken */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Aktive Deals</p>
                    <p className="text-xl font-bold text-slate-900">{stats.active}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Abgeschlossen</p>
                    <p className="text-xl font-bold text-slate-900">{stats.completed}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Transfervolumen</p>
                    <p className="text-xl font-bold text-slate-900">
                      {stats.totalValue >= 1000000 
                        ? `${(stats.totalValue / 1000000).toFixed(1)}M €`
                        : `${(stats.totalValue / 1000).toFixed(0)}K €`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter */}
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-4">
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Spieler, Verein suchen..."
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
                      <SelectItem value="interesse">Interesse</SelectItem>
                      <SelectItem value="verhandlung">Verhandlung</SelectItem>
                      <SelectItem value="angebot_erhalten">Angebot erhalten</SelectItem>
                      <SelectItem value="medizincheck">Medizincheck</SelectItem>
                      <SelectItem value="vertragsunterzeichnung">Vertragsunterzeichnung</SelectItem>
                      <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                      <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                      <SelectItem value="pausiert">Pausiert</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priorität" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alle">Alle Prioritäten</SelectItem>
                      <SelectItem value="kritisch">Kritisch</SelectItem>
                      <SelectItem value="hoch">Hoch</SelectItem>
                      <SelectItem value="mittel">Mittel</SelectItem>
                      <SelectItem value="niedrig">Niedrig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Deal Liste */}
            {filteredDeals.length === 0 ? (
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-8 text-center">
                  <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Keine Deals gefunden</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ersten Deal erstellen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredDeals.map(deal => (
                    <DealCard 
                      key={deal.id} 
                      deal={deal} 
                      onClick={() => handleDealClick(deal)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Finanzen Tab */}
          <TabsContent value="finanzen">
            <FinancialOverview deals={deals} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuen Deal erstellen</DialogTitle>
          </DialogHeader>
          <DealForm
            onSave={(data) => createDealMutation.mutate(data)}
            onCancel={() => setShowCreateDialog(false)}
            users={users}
            players={players}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingDeal} onOpenChange={() => setEditingDeal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deal bearbeiten</DialogTitle>
          </DialogHeader>
          {editingDeal && (
            <DealForm
              deal={editingDeal}
              onSave={(data) => updateDealMutation.mutate({ id: editingDeal.id, data })}
              onCancel={() => setEditingDeal(null)}
              users={users}
              players={players}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedDeal && !editingDeal} onOpenChange={() => setSelectedDeal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedDeal && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{selectedDeal.title || selectedDeal.player_name}</DialogTitle>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Spieler</p>
                    <p className="font-semibold">{selectedDeal.player_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Neuer Verein</p>
                    <p className="font-semibold">{selectedDeal.receiving_club}</p>
                  </div>
                  {selectedDeal.releasing_club && (
                    <div>
                      <p className="text-sm text-slate-500">Abgebender Verein</p>
                      <p className="font-semibold">{selectedDeal.releasing_club}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <Badge className="mt-1">{selectedDeal.status}</Badge>
                  </div>
                </div>

                {(selectedDeal.transfer_fee || selectedDeal.annual_salary) && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Finanzen</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedDeal.transfer_fee && (
                        <div>
                          <p className="text-sm text-slate-500">Ablöse</p>
                          <p className="font-semibold">{(selectedDeal.transfer_fee / 1000000).toFixed(2)}M €</p>
                        </div>
                      )}
                      {selectedDeal.annual_salary && (
                        <div>
                          <p className="text-sm text-slate-500">Jahresgehalt</p>
                          <p className="font-semibold">{(selectedDeal.annual_salary / 1000).toFixed(0)}K €</p>
                        </div>
                      )}
                      {selectedDeal.agency_commission && (
                        <div>
                          <p className="text-sm text-slate-500">Provision</p>
                          <p className="font-semibold text-green-600">{(selectedDeal.agency_commission / 1000).toFixed(0)}K €</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedDeal.documents && selectedDeal.documents.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Dokumente</h4>
                    <div className="space-y-2">
                      {selectedDeal.documents.map((doc, index) => (
                        <a
                          key={index}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <span>📄</span>
                          <span className="text-sm text-blue-600 underline">{doc.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDeal.notes && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Notizen</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedDeal.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeletingDeal(selectedDeal)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
                <Button
                  onClick={() => {
                    setEditingDeal(selectedDeal);
                  }}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Bearbeiten
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingDeal} onOpenChange={() => setDeletingDeal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deal löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Deal "{deletingDeal?.title || deletingDeal?.player_name}" wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDealMutation.mutate(deletingDeal.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}