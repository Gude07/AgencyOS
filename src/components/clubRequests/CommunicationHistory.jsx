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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Phone, Mail, Calendar, MessageSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const communicationTypeIcons = {
  telefonat: Phone,
  email: Mail,
  meeting: Calendar,
  whatsapp: MessageSquare,
  sonstiges: MessageSquare,
};

const communicationTypeColors = {
  telefonat: "bg-blue-100 text-blue-800 border-blue-200",
  email: "bg-purple-100 text-purple-800 border-purple-200",
  meeting: "bg-green-100 text-green-800 border-green-200",
  whatsapp: "bg-emerald-100 text-emerald-800 border-emerald-200",
  sonstiges: "bg-slate-100 text-slate-800 border-slate-200",
};

export default function CommunicationHistory({ clubRequestId, players = [] }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const [newCommunication, setNewCommunication] = useState({
    date: new Date().toISOString().slice(0, 16),
    type: "telefonat",
    subject: "",
    details: "",
    discussed_players: [],
    next_steps: "",
    contact_person: "",
  });

  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['communications', clubRequestId],
    queryFn: () => base44.entities.Communication.filter({ club_request_id: clubRequestId }, '-date'),
    enabled: !!clubRequestId,
  });

  const createCommunicationMutation = useMutation({
    mutationFn: async (data) => {
      const comm = await base44.entities.Communication.create(data);
      
      // Auto-Update: Request-Status von "offen" auf "in_bearbeitung"
      const requests = await base44.entities.ClubRequest.list();
      const request = requests.find(r => r.id === clubRequestId);
      if (request && request.status === 'offen') {
        await base44.entities.ClubRequest.update(clubRequestId, { status: 'in_bearbeitung' });
      }
      
      // Benachrichtigung an ALLE Benutzer
      const currentUser = await base44.auth.me();
      const allUsers = await base44.entities.User.list();
      
      for (const user of allUsers) {
        if (user.email !== currentUser.email) {
          await base44.entities.Notification.create({
            user_email: user.email,
            type: 'neue_antwort',
            title: 'Neue Kommunikation',
            message: `Neue Kommunikation für ${request.club_name}: ${data.subject}`,
            link: `ClubRequestDetail?id=${clubRequestId}&tab=communication`,
            entity_id: clubRequestId,
            entity_type: 'ClubRequest'
          });
        }
      }
      
      return comm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', clubRequestId] });
      queryClient.invalidateQueries({ queryKey: ['clubRequest', clubRequestId] });
      queryClient.invalidateQueries({ queryKey: ['clubRequests'] });
      setShowAddDialog(false);
      setNewCommunication({
        date: new Date().toISOString().slice(0, 16),
        type: "telefonat",
        subject: "",
        details: "",
        discussed_players: [],
        next_steps: "",
        contact_person: "",
      });
    },
  });

  const deleteCommunicationMutation = useMutation({
    mutationFn: (id) => base44.entities.Communication.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', clubRequestId] });
    },
  });

  const handleAddCommunication = () => {
    createCommunicationMutation.mutate({
      ...newCommunication,
      club_request_id: clubRequestId,
    });
  };

  const toggleDiscussedPlayer = (playerId) => {
    const discussed = newCommunication.discussed_players || [];
    const newDiscussed = discussed.includes(playerId)
      ? discussed.filter(id => id !== playerId)
      : [...discussed, playerId];
    setNewCommunication({ ...newCommunication, discussed_players: newDiscussed });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Kommunikationshistorie ({communications.length})
        </h3>
        <Button 
          onClick={() => setShowAddDialog(true)}
          size="sm"
          className="bg-blue-900 hover:bg-blue-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Eintrag hinzufügen
        </Button>
      </div>

      {communications.length === 0 ? (
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Noch keine Kommunikation protokolliert</p>
            <p className="text-sm text-slate-500 mt-1">
              Fügen Sie Einträge hinzu, um den Überblick über alle Gespräche zu behalten
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {communications.map((comm) => {
              const Icon = communicationTypeIcons[comm.type];
              const discussedPlayersList = players.filter(p => 
                comm.discussed_players?.includes(p.id)
              );

              return (
                <motion.div
                  key={comm.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="border-slate-200 bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${communicationTypeColors[comm.type]} flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h4 className="font-semibold text-slate-900">{comm.subject}</h4>
                              <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                                <span>{format(new Date(comm.date), "d. MMM yyyy, HH:mm", { locale: de })}</span>
                                {comm.contact_person && (
                                  <>
                                    <span>•</span>
                                    <span>{comm.contact_person}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCommunicationMutation.mutate(comm.id)}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {comm.details && (
                            <p className="text-sm text-slate-700 mb-3">{comm.details}</p>
                          )}

                          {discussedPlayersList.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-slate-600 mb-1.5">Besprochene Spieler:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {discussedPlayersList.map(player => (
                                  <Badge key={player.id} variant="outline" className="text-xs">
                                    {player.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {comm.next_steps && (
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-xs font-semibold text-slate-700 mb-1">Nächste Schritte:</p>
                              <p className="text-sm text-slate-600">{comm.next_steps}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kommunikation protokollieren</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Datum & Uhrzeit *</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={newCommunication.date}
                  onChange={(e) => setNewCommunication({...newCommunication, date: e.target.value})}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="type">Art der Kommunikation *</Label>
                <Select 
                  value={newCommunication.type} 
                  onValueChange={(value) => setNewCommunication({...newCommunication, type: value})}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="telefonat">Telefonat</SelectItem>
                    <SelectItem value="email">E-Mail</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="contact_person">Kontaktperson</Label>
              <Input
                id="contact_person"
                value={newCommunication.contact_person}
                onChange={(e) => setNewCommunication({...newCommunication, contact_person: e.target.value})}
                placeholder="Name des Ansprechpartners"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="subject">Betreff *</Label>
              <Input
                id="subject"
                value={newCommunication.subject}
                onChange={(e) => setNewCommunication({...newCommunication, subject: e.target.value})}
                placeholder="z.B. Erstgespräch Spielervermittlung"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="details">Details</Label>
              <Textarea
                id="details"
                value={newCommunication.details}
                onChange={(e) => setNewCommunication({...newCommunication, details: e.target.value})}
                placeholder="Was wurde besprochen?"
                className="mt-1.5 h-24"
              />
            </div>

            {players.length > 0 && (
              <div>
                <Label className="mb-2 block">Besprochene Spieler</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-lg">
                  {players.map(player => (
                    <div key={player.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`player-${player.id}`}
                        checked={newCommunication.discussed_players?.includes(player.id)}
                        onChange={() => toggleDiscussedPlayer(player.id)}
                        className="rounded border-slate-300"
                      />
                      <label htmlFor={`player-${player.id}`} className="text-sm text-slate-700 cursor-pointer">
                        {player.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="next_steps">Nächste Schritte / Ergebnis</Label>
              <Textarea
                id="next_steps"
                value={newCommunication.next_steps}
                onChange={(e) => setNewCommunication({...newCommunication, next_steps: e.target.value})}
                placeholder="Was sind die nächsten Schritte?"
                className="mt-1.5 h-20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleAddCommunication}
              disabled={!newCommunication.subject || !newCommunication.date || createCommunicationMutation.isPending}
              className="bg-blue-900 hover:bg-blue-800"
            >
              {createCommunicationMutation.isPending ? "Wird gespeichert..." : "Speichern"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}