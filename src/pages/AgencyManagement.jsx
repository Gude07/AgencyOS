import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Users, Pencil, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AgencyManagement() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAgency, setEditingAgency] = useState(null);
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
                    <Button variant="ghost" size="icon" onClick={() => startEdit(agency)} className="h-8 w-8">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
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
                      <div className="space-y-0.5">
                        {agencyUsers.slice(0, 3).map(u => (
                          <p key={u.id} className="text-xs text-slate-600 truncate">{u.full_name} ({u.role})</p>
                        ))}
                        {agencyUsers.length > 3 && (
                          <p className="text-xs text-slate-400">+{agencyUsers.length - 3} weitere</p>
                        )}
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