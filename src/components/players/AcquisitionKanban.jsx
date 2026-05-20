import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Plus, ExternalLink, ChevronRight, ChevronLeft, Pencil, Trash2, Target, Phone, MessageSquare, Handshake, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { differenceInYears } from "date-fns";
import SecondaryPositionsEditor from "./SecondaryPositionsEditor";

const COLUMNS = [
  { id: "Zielidentifikation", label: "Zielidentifikation", icon: Target, color: "bg-slate-100 border-slate-300", headerColor: "bg-slate-600", badgeColor: "bg-slate-100 text-slate-700 border-slate-300" },
  { id: "Erstkontakt", label: "Erstkontakt", icon: Phone, color: "bg-blue-50 border-blue-200", headerColor: "bg-blue-600", badgeColor: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "In Gespräch", label: "In Gespräch", icon: MessageSquare, color: "bg-yellow-50 border-yellow-200", headerColor: "bg-yellow-500", badgeColor: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { id: "Verhandlung", label: "Verhandlung", icon: Handshake, color: "bg-orange-50 border-orange-200", headerColor: "bg-orange-500", badgeColor: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "Gewonnen", label: "Gewonnen", icon: CheckCircle, color: "bg-green-50 border-green-200", headerColor: "bg-green-600", badgeColor: "bg-green-100 text-green-700 border-green-200" },
  { id: "Abgelehnt", label: "Abgelehnt", icon: XCircle, color: "bg-red-50 border-red-200", headerColor: "bg-red-500", badgeColor: "bg-red-100 text-red-700 border-red-200" },
];

const POSITIONS = [
  { group: "Torwart", items: ["Torwart"] },
  { group: "Verteidigung", items: ["Innenverteidiger", "Außenverteidiger", "Linker Außenverteidiger", "Rechter Außenverteidiger"] },
  { group: "Mittelfeld", items: ["Defensives Mittelfeld", "Mittelfeld", "Linkes Mittelfeld", "Zentrales Mittelfeld", "Rechtes Mittelfeld", "Offensives Mittelfeld"] },
  { group: "Angriff", items: ["Flügelspieler", "Linksaußen", "Rechtsaußen", "Stürmer"] },
];

const calculateAge = (dob) => dob ? differenceInYears(new Date(), new Date(dob)) : null;

const emptyPlayer = {
  name: "",
  date_of_birth: "",
  nationality: "",
  position: "",
  secondary_positions: [],
  current_club: "",
  market_value: "",
  contract_until: "",
  transfermarkt_url: "",
  acquisition_status: "Zielidentifikation",
  acquisition_notes: "",
};

export default function AcquisitionKanban() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addToColumn, setAddToColumn] = useState("Zielidentifikation");
  const [newPlayer, setNewPlayer] = useState({ ...emptyPlayer });
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['acquisitionPlayers'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const all = await base44.entities.Player.list('-created_date');
      return all.filter(p => p.agency_id === user.agency_id && p.is_acquisition_target === true);
    },
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.Player.create({
        agency_id: user.agency_id,
        name: data.name,
        position: data.position,
        secondary_positions: data.secondary_positions || [],
        date_of_birth: data.date_of_birth || undefined,
        age: data.date_of_birth ? calculateAge(data.date_of_birth) : undefined,
        nationality: data.nationality || undefined,
        current_club: data.current_club || undefined,
        market_value: data.market_value ? parseFloat(data.market_value) : undefined,
        contract_until: data.contract_until || undefined,
        transfermarkt_url: data.transfermarkt_url || undefined,
        acquisition_notes: data.acquisition_notes || undefined,
        is_acquisition_target: true,
        acquisition_status: data.acquisition_status || "Zielidentifikation",
        category: "Beobachtungsliste",
        status: "noch_offen",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquisitionPlayers'] });
      setShowAddDialog(false);
      setNewPlayer({ ...emptyPlayer });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Player.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquisitionPlayers'] });
      setEditingPlayer(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Player.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquisitionPlayers'] });
      setDeleteCandidate(null);
    },
  });

  const movePlayer = (player, direction) => {
    const colIndex = COLUMNS.findIndex(c => c.id === player.acquisition_status);
    const newIndex = colIndex + direction;
    if (newIndex < 0 || newIndex >= COLUMNS.length) return;
    updateMutation.mutate({ id: player.id, data: { acquisition_status: COLUMNS[newIndex].id } });
  };

  const openAddDialog = (columnId) => {
    setAddToColumn(columnId);
    setNewPlayer({ ...emptyPlayer, acquisition_status: columnId });
    setShowAddDialog(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Akquise-Pipeline</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{players.length} Spieler im Akquiseprozess</p>
        </div>
        <Button
          onClick={() => openAddDialog("Zielidentifikation")}
          className="bg-blue-900 hover:bg-blue-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Akquise-Spieler hinzufügen
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {COLUMNS.map((col) => {
            const colPlayers = players.filter(p => p.acquisition_status === col.id);
            const Icon = col.icon;
            return (
              <div key={col.id} className={`w-72 rounded-xl border-2 ${col.color} flex flex-col`}>
                {/* Column header */}
                <div className={`${col.headerColor} rounded-t-lg px-4 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-white" />
                    <span className="text-white font-semibold text-sm">{col.label}</span>
                  </div>
                  <Badge className="bg-white/20 text-white border-0 text-xs">{colPlayers.length}</Badge>
                </div>

                {/* Cards */}
                <div className="p-3 space-y-3 flex-1 min-h-[200px]">
                  <AnimatePresence>
                    {colPlayers.map((player) => {
                      const colIndex = COLUMNS.findIndex(c => c.id === col.id);
                      return (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                        >
                          <Card className="bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 group">
                            <CardContent className="p-3 space-y-2">
                              {/* Name + actions */}
                              <div className="flex items-start justify-between gap-1">
                                <button
                                  className="font-semibold text-sm text-slate-900 dark:text-white hover:text-blue-700 text-left leading-tight"
                                  onClick={() => navigate(createPageUrl("PlayerDetail") + "?id=" + player.id)}
                                >
                                  {player.name}
                                </button>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <button
                                    onClick={() => setEditingPlayer(player)}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                                    title="Bearbeiten"
                                  >
                                    <Pencil className="w-3 h-3 text-slate-500" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteCandidate(player)}
                                    className="p-1 rounded hover:bg-red-50"
                                    title="Löschen"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-400" />
                                  </button>
                                </div>
                              </div>

                              {/* Club & position */}
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <span>{player.current_club || "–"}</span>
                                {player.transfermarkt_url && (
                                  <a href={player.transfermarkt_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-blue-600">
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-700">{player.position}</Badge>
                                {calculateAge(player.date_of_birth) && (
                                  <Badge variant="outline" className="text-xs">{calculateAge(player.date_of_birth)} J.</Badge>
                                )}
                                {player.nationality && (
                                  <Badge variant="outline" className="text-xs">{player.nationality}</Badge>
                                )}
                              </div>

                              {player.acquisition_notes && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 rounded p-2 line-clamp-2">
                                  {player.acquisition_notes}
                                </p>
                              )}

                              {/* Move buttons */}
                              <div className="flex justify-between pt-1">
                                <button
                                  onClick={() => movePlayer(player, -1)}
                                  disabled={colIndex === 0}
                                  className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <ChevronLeft className="w-3 h-3" /> Zurück
                                </button>
                                <button
                                  onClick={() => movePlayer(player, 1)}
                                  disabled={colIndex === COLUMNS.length - 1}
                                  className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  Weiter <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Add to column */}
                  <button
                    onClick={() => openAddDialog(col.id)}
                    className="w-full text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-300 rounded-lg py-2 flex items-center justify-center gap-1 hover:border-slate-400 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Hinzufügen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Akquise-Spieler hinzufügen</DialogTitle>
          </DialogHeader>
          <AcquisitionPlayerForm
            player={newPlayer}
            onChange={setNewPlayer}
            positions={POSITIONS}
            columns={COLUMNS}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Abbrechen</Button>
            <Button
              onClick={() => createMutation.mutate(newPlayer)}
              disabled={!newPlayer.name || !newPlayer.position || createMutation.isPending}
              className="bg-blue-900 hover:bg-blue-800"
            >
              {createMutation.isPending ? "Wird hinzugefügt..." : "Hinzufügen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Akquise-Spieler bearbeiten</DialogTitle>
          </DialogHeader>
          {editingPlayer && (
            <>
              <AcquisitionPlayerForm
                player={editingPlayer}
                onChange={setEditingPlayer}
                positions={POSITIONS}
                columns={COLUMNS}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditingPlayer(null)}>Abbrechen</Button>
                <Button
                  onClick={() => updateMutation.mutate({ id: editingPlayer.id, data: editingPlayer })}
                  disabled={!editingPlayer.name || !editingPlayer.position || updateMutation.isPending}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  {updateMutation.isPending ? "Wird gespeichert..." : "Speichern"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteCandidate} onOpenChange={() => setDeleteCandidate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Spieler löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Soll <strong>{deleteCandidate?.name}</strong> aus der Akquise-Pipeline entfernt werden? Dies kann nicht rückgängig gemacht werden.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteCandidate(null)}>Abbrechen</Button>
            <Button
              onClick={() => deleteMutation.mutate(deleteCandidate.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AcquisitionPlayerForm({ player, onChange, positions, columns }) {
  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Name *</Label>
          <Input
            value={player.name}
            onChange={e => onChange({ ...player, name: e.target.value })}
            placeholder="z.B. Max Mustermann"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>Position *</Label>
          <Select value={player.position} onValueChange={v => onChange({ ...player, position: v })}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Wählen..." />
            </SelectTrigger>
            <SelectContent>
              {positions.map(group => (
                <SelectGroup key={group.group}>
                  <SelectLabel>{group.group}</SelectLabel>
                  {group.items.map(pos => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Akquise-Phase</Label>
          <Select value={player.acquisition_status} onValueChange={v => onChange({ ...player, acquisition_status: v })}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.map(col => (
                <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <SecondaryPositionsEditor
            mainPosition={player.position}
            secondaryPositions={player.secondary_positions || []}
            onChange={positions => onChange({ ...player, secondary_positions: positions })}
          />
        </div>

        <div>
          <Label>Aktueller Verein</Label>
          <Input
            value={player.current_club || ""}
            onChange={e => onChange({ ...player, current_club: e.target.value })}
            placeholder="z.B. FC Bayern München"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>Geburtsdatum</Label>
          <Input
            type="date"
            value={player.date_of_birth || ""}
            onChange={e => onChange({ ...player, date_of_birth: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>Nationalität</Label>
          <Input
            value={player.nationality || ""}
            onChange={e => onChange({ ...player, nationality: e.target.value })}
            placeholder="z.B. Deutschland"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>Marktwert (€)</Label>
          <Input
            type="number"
            value={player.market_value || ""}
            onChange={e => onChange({ ...player, market_value: e.target.value })}
            placeholder="5000000"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>Vertrag bis</Label>
          <Input
            type="date"
            value={player.contract_until || ""}
            onChange={e => onChange({ ...player, contract_until: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>Transfermarkt.de Link</Label>
          <Input
            value={player.transfermarkt_url || ""}
            onChange={e => onChange({ ...player, transfermarkt_url: e.target.value })}
            placeholder="https://www.transfermarkt.de/..."
            className="mt-1.5"
          />
        </div>

        <div className="col-span-2">
          <Label>Akquise-Notizen</Label>
          <Textarea
            value={player.acquisition_notes || ""}
            onChange={e => onChange({ ...player, acquisition_notes: e.target.value })}
            placeholder="Ansprechpartner, nächste Schritte, Hintergrundinfos..."
            className="mt-1.5 h-24"
          />
        </div>
      </div>
    </div>
  );
}