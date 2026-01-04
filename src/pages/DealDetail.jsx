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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Edit2, Trash2, Plus, Clock, DollarSign, User, Building2, FileText, TrendingUp, ExternalLink } from "lucide-react";
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

export default function DealDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('id');

  const [editMode, setEditMode] = useState(false);
  const [editedDeal, setEditedDeal] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    update_type: "note",
    title: "",
    description: "",
  });

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: async () => {
      const deals = await base44.entities.Deal.list();
      return deals.find(d => d.id === dealId);
    },
    enabled: !!dealId,
  });

  const { data: updates = [] } = useQuery({
    queryKey: ['dealUpdates', dealId],
    queryFn: async () => {
      const allUpdates = await base44.entities.DealUpdate.list('-created_date');
      return allUpdates.filter(u => u.deal_id === dealId);
    },
    enabled: !!dealId,
  });

  const { data: linkedPlayer } = useQuery({
    queryKey: ['player', deal?.player_id],
    queryFn: async () => {
      if (!deal?.player_id) return null;
      const players = await base44.entities.Player.list();
      return players.find(p => p.id === deal.player_id);
    },
    enabled: !!deal?.player_id,
  });

  const { data: linkedRequest } = useQuery({
    queryKey: ['clubRequest', deal?.club_request_id],
    queryFn: async () => {
      if (!deal?.club_request_id) return null;
      const requests = await base44.entities.ClubRequest.list();
      return requests.find(r => r.id === deal.club_request_id);
    },
    enabled: !!deal?.club_request_id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateDealMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setEditMode(false);
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: (id) => base44.entities.Deal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      navigate(createPageUrl("Deals"));
    },
  });

  const createUpdateMutation = useMutation({
    mutationFn: (updateData) => base44.entities.DealUpdate.create(updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealUpdates', dealId] });
      setShowUpdateDialog(false);
      setNewUpdate({
        update_type: "note",
        title: "",
        description: "",
      });
    },
  });

  const handleSaveDeal = () => {
    const dealData = {
      ...editedDeal,
      transfer_fee: editedDeal.transfer_fee ? parseFloat(editedDeal.transfer_fee) : undefined,
      annual_salary: editedDeal.annual_salary ? parseFloat(editedDeal.annual_salary) : undefined,
      contract_length: editedDeal.contract_length ? parseFloat(editedDeal.contract_length) : undefined,
      signing_bonus: editedDeal.signing_bonus ? parseFloat(editedDeal.signing_bonus) : undefined,
      agent_commission: editedDeal.agent_commission ? parseFloat(editedDeal.agent_commission) : undefined,
      loan_fee: editedDeal.loan_fee ? parseFloat(editedDeal.loan_fee) : undefined,
    };
    updateDealMutation.mutate({ id: dealId, data: dealData });
  };

  const handleAddUpdate = () => {
    createUpdateMutation.mutate({
      ...newUpdate,
      deal_id: dealId,
    });
  };

  const handleStatusChange = (newStatus) => {
    const oldStatus = deal.status;
    updateDealMutation.mutate({
      id: dealId,
      data: { status: newStatus }
    });
    
    createUpdateMutation.mutate({
      deal_id: dealId,
      update_type: "status_change",
      title: `Status geändert: ${oldStatus} → ${newStatus}`,
      description: `Der Deal-Status wurde von "${oldStatus}" auf "${newStatus}" aktualisiert.`,
      old_status: oldStatus,
      new_status: newStatus,
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Deal nicht gefunden</p>
      </div>
    );
  }

  const currentDealData = editMode ? editedDeal : deal;
  const totalCost = (currentDealData.transfer_fee || 0) + 
                    (currentDealData.agent_commission || 0) + 
                    (currentDealData.signing_bonus || 0);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Deals"))}
            className="hover:bg-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Deal Details</h1>
          </div>
          {!editMode ? (
            <div className="flex gap-2">
              <Button onClick={() => setShowDeleteDialog(true)} variant="outline" className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
              <Button onClick={() => { setEditMode(true); setEditedDeal(deal); }} variant="outline">
                <Edit2 className="w-4 h-4 mr-2" />
                Bearbeiten
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveDeal} className="bg-blue-900 hover:bg-blue-800">
                Speichern
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="finances">Finanzen</TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({updates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <div className="space-y-3">
                  {editMode ? (
                    <Input
                      value={editedDeal?.title || ""}
                      onChange={(e) => setEditedDeal({...editedDeal, title: e.target.value})}
                      className="text-xl font-bold"
                    />
                  ) : (
                    <CardTitle className="text-2xl">{currentDealData.title}</CardTitle>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {editMode ? (
                      <>
                        <Select value={editedDeal?.status} onValueChange={(value) => setEditedDeal({...editedDeal, status: value})}>
                          <SelectTrigger className="w-48">
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
                        <Select value={editedDeal?.priority} onValueChange={(value) => setEditedDeal({...editedDeal, priority: value})}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="niedrig">Niedrig</SelectItem>
                            <SelectItem value="mittel">Mittel</SelectItem>
                            <SelectItem value="hoch">Hoch</SelectItem>
                            <SelectItem value="kritisch">Kritisch</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <>
                        <Badge variant="secondary" className={statusColors[currentDealData.status] + " border"}>
                          {currentDealData.status.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="secondary" className={priorityColors[currentDealData.priority] + " border"}>
                          {currentDealData.priority}
                        </Badge>
                        <Badge variant="outline">{currentDealData.transfer_type}</Badge>
                        <Badge variant="outline">{currentDealData.transfer_window}</Badge>
                        {currentDealData.probability && (
                          <Badge className="bg-blue-600 text-white">{currentDealData.probability}% Chance</Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-2 block">Spieler</Label>
                    {editMode ? (
                      <Input
                        value={editedDeal?.player_name || ""}
                        onChange={(e) => setEditedDeal({...editedDeal, player_name: e.target.value})}
                      />
                    ) : (
                      <div className="space-y-2">
                        <p className="font-semibold text-slate-900">{currentDealData.player_name}</p>
                        {linkedPlayer && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(createPageUrl("PlayerDetail") + "?id=" + linkedPlayer.id)}
                          >
                            <ExternalLink className="w-3 h-3 mr-2" />
                            Spielerprofil anzeigen
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-2 block">Aufnehmender Verein</Label>
                    {editMode ? (
                      <Input
                        value={editedDeal?.receiving_club || ""}
                        onChange={(e) => setEditedDeal({...editedDeal, receiving_club: e.target.value})}
                      />
                    ) : (
                      <div className="space-y-2">
                        <p className="font-semibold text-slate-900">{currentDealData.receiving_club}</p>
                        {linkedRequest && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(createPageUrl("ClubRequestDetail") + "?id=" + linkedRequest.id)}
                          >
                            <ExternalLink className="w-3 h-3 mr-2" />
                            Vereinsanfrage anzeigen
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-2 block">Abgebender Verein</Label>
                    {editMode ? (
                      <Input
                        value={editedDeal?.releasing_club || ""}
                        onChange={(e) => setEditedDeal({...editedDeal, releasing_club: e.target.value})}
                      />
                    ) : (
                      <p className="text-slate-700">{currentDealData.releasing_club || "-"}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-2 block">Berater</Label>
                    {editMode ? (
                      <Input
                        value={editedDeal?.agent_name || ""}
                        onChange={(e) => setEditedDeal({...editedDeal, agent_name: e.target.value})}
                      />
                    ) : (
                      <p className="text-slate-700">{currentDealData.agent_name || "-"}</p>
                    )}
                  </div>

                  {editMode && (
                    <>
                      <div>
                        <Label>Erwartetes Abschlussdatum</Label>
                        <Input
                          type="date"
                          value={editedDeal?.expected_completion_date || ""}
                          onChange={(e) => setEditedDeal({...editedDeal, expected_completion_date: e.target.value})}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Vertragslaufzeit (Jahre)</Label>
                        <Input
                          type="number"
                          value={editedDeal?.contract_length || ""}
                          onChange={(e) => setEditedDeal({...editedDeal, contract_length: e.target.value})}
                          className="mt-1.5"
                        />
                      </div>
                    </>
                  )}
                </div>

                {!editMode && (
                  <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                    {currentDealData.expected_completion_date && (
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Erwartetes Datum</p>
                        <p className="font-semibold text-slate-900">
                          {format(new Date(currentDealData.expected_completion_date), "dd.MM.yyyy")}
                        </p>
                      </div>
                    )}
                    {currentDealData.contract_length && (
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Vertragslaufzeit</p>
                        <p className="font-semibold text-slate-900">{currentDealData.contract_length} Jahre</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Zuständige Personen</Label>
                  {editMode ? (
                    <MultiUserSelect
                      selectedUsers={editedDeal?.assigned_to || []}
                      users={users}
                      onChange={(users) => setEditedDeal({...editedDeal, assigned_to: users})}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(currentDealData.assigned_to || []).map((email) => {
                        const user = users.find(u => u.email === email);
                        return (
                          <Badge key={email} variant="outline">
                            {user?.full_name || email}
                          </Badge>
                        );
                      })}
                      {(!currentDealData.assigned_to || currentDealData.assigned_to.length === 0) && (
                        <p className="text-slate-500 text-sm">Keine Zuständigen</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Notizen</Label>
                  {editMode ? (
                    <Textarea
                      value={editedDeal?.notes || ""}
                      onChange={(e) => setEditedDeal({...editedDeal, notes: e.target.value})}
                      className="h-32"
                    />
                  ) : (
                    <p className="text-slate-700 whitespace-pre-wrap">{currentDealData.notes || "Keine Notizen"}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finances" className="space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Finanzübersicht
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Ablösesumme</Label>
                    {editMode ? (
                      <Input
                        type="number"
                        value={editedDeal?.transfer_fee || ""}
                        onChange={(e) => setEditedDeal({...editedDeal, transfer_fee: e.target.value})}
                      />
                    ) : (
                      <p className="text-2xl font-bold text-slate-900">
                        {currentDealData.transfer_fee 
                          ? `${(currentDealData.transfer_fee / 1000000).toFixed(2)}M €`
                          : "-"
                        }
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Jahresgehalt</Label>
                    {editMode ? (
                      <Input
                        type="number"
                        value={editedDeal?.annual_salary || ""}
                        onChange={(e) => setEditedDeal({...editedDeal, annual_salary: e.target.value})}
                      />
                    ) : (
                      <p className="text-2xl font-bold text-slate-900">
                        {currentDealData.annual_salary 
                          ? `${(currentDealData.annual_salary / 1000).toFixed(0)}k €`
                          : "-"
                        }
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Handgeld</Label>
                    {editMode ? (
                      <Input
                        type="number"
                        value={editedDeal?.signing_bonus || ""}
                        onChange={(e) => setEditedDeal({...editedDeal, signing_bonus: e.target.value})}
                      />
                    ) : (
                      <p className="text-xl font-semibold text-slate-900">
                        {currentDealData.signing_bonus 
                          ? `${(currentDealData.signing_bonus / 1000).toFixed(0)}k €`
                          : "-"
                        }
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Beraterkommission</Label>
                    {editMode ? (
                      <Input
                        type="number"
                        value={editedDeal?.agent_commission || ""}
                        onChange={(e) => setEditedDeal({...editedDeal, agent_commission: e.target.value})}
                      />
                    ) : (
                      <p className="text-xl font-semibold text-slate-900">
                        {currentDealData.agent_commission 
                          ? `${(currentDealData.agent_commission / 1000).toFixed(0)}k €`
                          : "-"
                        }
                      </p>
                    )}
                  </div>
                </div>

                {!editMode && totalCost > 0 && (
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold text-slate-700">Gesamtkosten</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(totalCost / 1000000).toFixed(2)}M €
                      </p>
                    </div>
                  </div>
                )}

                {editMode && (
                  <>
                    <div>
                      <Label>Bonusvereinbarungen</Label>
                      <Textarea
                        value={editedDeal?.bonuses || ""}
                        onChange={(e) => setEditedDeal({...editedDeal, bonuses: e.target.value})}
                        placeholder="z.B. 100k € bei 10 Toren, 50k € bei Champions League Qualifikation..."
                        className="mt-1.5 h-24"
                      />
                    </div>

                    <div>
                      <Label>Zahlungsplan</Label>
                      <Textarea
                        value={editedDeal?.payment_schedule || ""}
                        onChange={(e) => setEditedDeal({...editedDeal, payment_schedule: e.target.value})}
                        placeholder="z.B. 50% sofort, 25% nach 6 Monaten, 25% nach 12 Monaten..."
                        className="mt-1.5 h-24"
                      />
                    </div>
                  </>
                )}

                {!editMode && (
                  <>
                    {currentDealData.bonuses && (
                      <div>
                        <Label className="text-sm font-semibold text-slate-700 mb-2 block">Bonusvereinbarungen</Label>
                        <p className="text-slate-700 whitespace-pre-wrap">{currentDealData.bonuses}</p>
                      </div>
                    )}

                    {currentDealData.payment_schedule && (
                      <div>
                        <Label className="text-sm font-semibold text-slate-700 mb-2 block">Zahlungsplan</Label>
                        <p className="text-slate-700 whitespace-pre-wrap">{currentDealData.payment_schedule}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => setShowUpdateDialog(true)} className="bg-blue-900 hover:bg-blue-800">
                <Plus className="w-4 h-4 mr-2" />
                Update hinzufügen
              </Button>
            </div>

            {updates.length === 0 ? (
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Noch keine Updates</p>
                  <p className="text-sm text-slate-500 mt-2">Fügen Sie den ersten Eintrag zur Timeline hinzu</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {updates.map((update) => (
                  <Card key={update.id} className="border-slate-200 bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-slate-900">{update.title}</h4>
                            <span className="text-xs text-slate-500 flex-shrink-0">
                              {format(new Date(update.created_date), "dd.MM.yyyy HH:mm", { locale: de })}
                            </span>
                          </div>
                          {update.description && (
                            <p className="text-slate-700 whitespace-pre-wrap">{update.description}</p>
                          )}
                          <Badge variant="outline" className="mt-2 text-xs">
                            {update.update_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Update zur Timeline hinzufügen</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="update_type">Update-Typ</Label>
                <Select value={newUpdate.update_type} onValueChange={(value) => setNewUpdate({...newUpdate, update_type: value})}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Notiz</SelectItem>
                    <SelectItem value="communication">Kommunikation</SelectItem>
                    <SelectItem value="financial_update">Finanz-Update</SelectItem>
                    <SelectItem value="document_added">Dokument hinzugefügt</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="update_title">Titel *</Label>
                <Input
                  id="update_title"
                  value={newUpdate.title}
                  onChange={(e) => setNewUpdate({...newUpdate, title: e.target.value})}
                  placeholder="z.B. Telefonat mit Berater"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="update_description">Beschreibung</Label>
                <Textarea
                  id="update_description"
                  value={newUpdate.description}
                  onChange={(e) => setNewUpdate({...newUpdate, description: e.target.value})}
                  placeholder="Details zum Update..."
                  className="mt-1.5 h-32"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleAddUpdate}
                disabled={!newUpdate.title || createUpdateMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {createUpdateMutation.isPending ? "Wird hinzugefügt..." : "Hinzufügen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deal löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Sind Sie sicher, dass Sie "{deal.title}" dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteDealMutation.mutate(dealId)} className="bg-red-600 hover:bg-red-700">
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}