import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Users, Pencil, Save, X, Layers, UserPlus, Trash2, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import LeagueTierEditor from "../components/agency/LeagueTierEditor";

export default function AgencyManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAgency, setEditingAgency] = useState(null);
  const [leagueTierAgencyId, setLeagueTierAgencyId] = useState(null);
  const [inviteAgency, setInviteAgency] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [moveUser, setMoveUser] = useState(null);
  const [moveTargetAgency, setMoveTargetAgency] = useState("");
  const [deleteAgency, setDeleteAgency] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteStep, setDeleteStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    website: "",
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => base44.entities.Agency.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createAgencyMutation = useMutation({
    mutationFn: (data) => base44.entities.Agency.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateAgencyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agency.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      setEditingAgency(null);
      resetForm();
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role, agencyId }) => {
      await base44.users.inviteUser(email, role);
      const allUsers = await base44.entities.User.list();
      const newUser = allUsers.find(u => u.email === email);
      if (newUser) {
        await base44.entities.User.update(newUser.id, { agency_id: agencyId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setInviteAgency(null);
      setInviteEmail("");
      setInviteRole("user");
      toast({ title: "Einladung gesendet", description: `Nutzer wurde zu ${inviteAgency.name} eingeladen.` });
    },
    onError: (err) => {
      toast({ title: "Fehler", description: err.message || "Einladung fehlgeschlagen", variant: "destructive" });
    },
  });

  const moveUserMutation = useMutation({
    mutationFn: async ({ userId, targetAgencyId }) => {
      await base44.entities.User.update(userId, { agency_id: targetAgencyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Nutzer verschoben", description: "Die Agentur-Zuweisung wurde aktualisiert." });
      setMoveUser(null);
      setMoveTargetAgency("");
    },
    onError: (err) => {
      toast({ title: "Fehler", description: err.message || "Verschieben fehlgeschlagen", variant: "destructive" });
    },
  });

  const deleteAgencyMutation = useMutation({
    mutationFn: async (agencyId) => {
      await base44.entities.Agency.delete(agencyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Agentur gelöscht", description: "Die Agentur wurde entfernt.", variant: "destructive" });
      setDeleteAgency(null);
      setDeleteConfirmText("");
      setDeleteStep(1);
    },
    onError: (err) => {
      toast({ title: "Fehler", description: err.message || "Löschen fehlgeschlagen", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      logo_url: "",
      contact_email: "",
      contact_phone: "",
      address: "",
      website: "",
    });
  };

  const handleCreate = () => {
    createAgencyMutation.mutate(formData);
  };

  const handleUpdate = () => {
    updateAgencyMutation.mutate({ id: editingAgency.id, data: formData });
  };

  const startEdit = (agency) => {
    setEditingAgency(agency);
    setFormData({
      name: agency.name || "",
      logo_url: agency.logo_url || "",
      contact_email: agency.contact_email || "",
      contact_phone: agency.contact_phone || "",
      address: agency.address || "",
      website: agency.website || "",
    });
  };

  const getAgencyUsers = (agencyId) => {
    return users.filter(u => u.agency_id === agencyId);
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Agenturen-Verwaltung</h1>
              <p className="text-slate-500 text-sm">Multi-Tenancy Management - Verwaltung aller Agenturen im System</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-900 hover:bg-blue-800">
            <Plus className="w-4 h-4 mr-2" />
            Neue Agentur
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agencies.map((agency) => {
            const agencyUsers = getAgencyUsers(agency.id);
            const isEditing = editingAgency?.id === agency.id;

            return (
              <Card key={agency.id} className="border-slate-200 bg-white">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {agency.logo_url ? (
                        <img src={agency.logo_url} alt={agency.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{agency.name}</CardTitle>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3" />
                          {agencyUsers.length} Benutzer
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setInviteAgency(agency)} className="h-8 w-8" title="Nutzer einladen">
                        <UserPlus className="w-3.5 h-3.5 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setLeagueTierAgencyId(agency.id)} className="h-8 w-8" title="Liga-Tier konfigurieren">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(agency)} className="h-8 w-8">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setDeleteAgency(agency); setDeleteStep(1); setDeleteConfirmText(""); }} className="h-8 w-8 hover:bg-red-50" title="Agentur löschen">
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-sm">
                  {agency.contact_email && (
                    <div>
                      <span className="text-slate-500 text-xs">E-Mail:</span>
                      <p className="text-slate-700">{agency.contact_email}</p>
                    </div>
                  )}
                  {agency.contact_phone && (
                    <div>
                      <span className="text-slate-500 text-xs">Telefon:</span>
                      <p className="text-slate-700">{agency.contact_phone}</p>
                    </div>
                  )}
                  {agency.website && (
                    <div>
                      <span className="text-slate-500 text-xs">Website:</span>
                      <p className="text-slate-700 truncate">{agency.website}</p>
                    </div>
                  )}
                  {agencyUsers.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-500 text-xs block mb-1">Benutzer:</span>
                      <div className="space-y-1">
                        {agencyUsers.map(u => (
                          <div key={u.id} className="flex items-center justify-between gap-2">
                            <p className="text-xs text-slate-600 truncate flex-1">{u.full_name} ({u.role})</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-xs text-slate-500 hover:text-blue-700"
                              onClick={() => { setMoveUser(u); setMoveTargetAgency(""); }}
                              title="Nutzer verschieben"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {agencies.length === 0 && (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-semibold">Noch keine Agenturen vorhanden</p>
              <p className="text-slate-400 text-sm mt-2">Erstellen Sie die erste Agentur, um zu beginnen</p>
            </CardContent>
          </Card>
        )}

        {/* Liga-Tier Config Dialog */}
        <Dialog open={!!leagueTierAgencyId} onOpenChange={(open) => { if (!open) setLeagueTierAgencyId(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Liga-Tier Konfiguration
              </DialogTitle>
            </DialogHeader>
            {leagueTierAgencyId && (
              <LeagueTierEditor
                agencyId={leagueTierAgencyId}
                onClose={() => setLeagueTierAgencyId(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Neue Agentur erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name der Agentur *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. STS Sports"
                />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Kontakt E-Mail</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="info@agentur.de"
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+49 ..."
                />
              </div>
              <div>
                <Label>Adresse</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Straße, PLZ Ort"
                  className="h-16"
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.agentur.de"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name} className="bg-blue-900 hover:bg-blue-800">
                <Save className="w-4 h-4 mr-2" />
                Erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invite User Dialog */}
        <Dialog open={!!inviteAgency} onOpenChange={(open) => { if (!open) { setInviteAgency(null); setInviteEmail(""); setInviteRole("user"); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-600" />
                Nutzer einladen — {inviteAgency?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>E-Mail-Adresse *</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="neuer.nutzer@firma.de"
                />
              </div>
              <div>
                <Label>Rolle</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Benutzer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">Der Nutzer wird fest der Agentur „{inviteAgency?.name}" zugewiesen.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setInviteAgency(null); setInviteEmail(""); setInviteRole("user"); }}>
                Abbrechen
              </Button>
              <Button
                onClick={() => inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole, agencyId: inviteAgency.id })}
                disabled={!inviteEmail || inviteUserMutation.isPending}
                className="bg-green-700 hover:bg-green-600"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Einladen
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Move User Dialog */}
        <Dialog open={!!moveUser} onOpenChange={(open) => { if (!open) { setMoveUser(null); setMoveTargetAgency(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                Nutzer verschieben
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500">Nutzer</p>
                <p className="font-medium text-slate-900">{moveUser?.full_name}</p>
                <p className="text-xs text-slate-500">{moveUser?.email}</p>
              </div>
              <div>
                <Label>Ziel-Agentur *</Label>
                <Select value={moveTargetAgency} onValueChange={setMoveTargetAgency}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Agentur auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.filter(a => a.id !== moveUser?.agency_id).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">Der Nutzer sieht nach dem Verschieben nur noch die Daten der Ziel-Agentur.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setMoveUser(null); setMoveTargetAgency(""); }}>
                Abbrechen
              </Button>
              <Button
                onClick={() => moveUserMutation.mutate({ userId: moveUser.id, targetAgencyId: moveTargetAgency })}
                disabled={!moveTargetAgency || moveUserMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Verschieben
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Agency Dialog (Two-Step) */}
        <Dialog open={!!deleteAgency} onOpenChange={(open) => { if (!open) { setDeleteAgency(null); setDeleteConfirmText(""); setDeleteStep(1); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Agentur löschen
              </DialogTitle>
            </DialogHeader>
            {deleteStep === 1 && (
              <div className="space-y-4 py-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-red-800">Achtung: Diese Aktion kann nicht rückgängig gemacht werden!</p>
                  <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                    <li>Die Agentur „{deleteAgency?.name}" wird dauerhaft entfernt.</li>
                    <li>Alle verknüpften Daten (Spieler, Anfragen, Deals etc.) bleiben bestehen, werden aber verwaist.</li>
                    {getAgencyUsers(deleteAgency?.id).length > 0 && (
                      <li className="font-semibold">Dieser Agentur sind {getAgencyUsers(deleteAgency?.id).length} Nutzer zugewiesen — verschieben Sie diese zuerst!</li>
                    )}
                  </ul>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setDeleteAgency(null); setDeleteConfirmText(""); }}>
                    Abbrechen
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteStep(2)}
                    disabled={getAgencyUsers(deleteAgency?.id).length > 0}
                    title={getAgencyUsers(deleteAgency?.id).length > 0 ? "Erst alle Nutzer verschieben" : ""}
                  >
                    Weiter
                  </Button>
                </div>
              </div>
            )}
            {deleteStep === 2 && (
              <div className="space-y-4 py-4">
                <p className="text-sm text-slate-700">
                  Geben Sie zur Bestätigung den Namen der Agentur exakt ein:
                </p>
                <p className="font-mono font-bold text-slate-900 bg-slate-100 rounded px-3 py-2 text-center">{deleteAgency?.name}</p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Agenturname eingeben"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDeleteStep(1)}>
                    Zurück
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteAgencyMutation.mutate(deleteAgency.id)}
                    disabled={deleteConfirmText !== deleteAgency?.name || deleteAgencyMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Endgültig löschen
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingAgency} onOpenChange={() => { setEditingAgency(null); resetForm(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Agentur bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name der Agentur *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                />
              </div>
              <div>
                <Label>Kontakt E-Mail</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Adresse</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="h-16"
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditingAgency(null); resetForm(); }}>
                <X className="w-4 h-4 mr-2" />
                Abbrechen
              </Button>
              <Button onClick={handleUpdate} disabled={!formData.name} className="bg-blue-900 hover:bg-blue-800">
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}