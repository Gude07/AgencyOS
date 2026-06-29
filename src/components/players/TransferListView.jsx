import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Plus, Search, ExternalLink, CalendarDays, DoorOpen, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { differenceInYears, format, differenceInMonths } from "date-fns";
import SecondaryPositionsEditor from "./SecondaryPositionsEditor";

const POSITIONS = [
  { group: "Torwart", items: ["Torwart"] },
  { group: "Verteidigung", items: ["Innenverteidiger", "Außenverteidiger", "Linker Außenverteidiger", "Rechter Außenverteidiger"] },
  { group: "Mittelfeld", items: ["Defensives Mittelfeld", "Mittelfeld", "Linkes Mittelfeld", "Zentrales Mittelfeld", "Rechtes Mittelfeld", "Offensives Mittelfeld"] },
  { group: "Angriff", items: ["Flügelspieler", "Linksaußen", "Rechtsaußen", "Stürmer"] },
];

const calculateAge = (dob) => dob ? differenceInYears(new Date(), new Date(dob)) : null;

const isContractExpiringSoon = (contractUntil) => {
  if (!contractUntil) return false;
  const months = differenceInMonths(new Date(contractUntil), new Date());
  return months >= 0 && months <= 6;
};

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
  notes: "",
  foot: "",
  height: "",
};

export default function TransferListView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ ...emptyPlayer });
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPosition, setFilterPosition] = useState("alle");

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['transferListPlayers'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const all = await base44.entities.Player.list('-created_date');
      return all.filter(p => p.agency_id === user.agency_id && p.player_type === 'transfer_list' && !p.archive_id);
    },
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.Player.create({
        agency_id: user.agency_id,
        player_type: 'transfer_list',
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
        notes: data.notes || undefined,
        foot: data.foot || undefined,
        height: data.height ? parseFloat(data.height) : undefined,
        category: "Beobachtungsliste",
        status: "noch_offen",
        is_acquisition_target: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferListPlayers'] });
      setShowAddDialog(false);
      setNewPlayer({ ...emptyPlayer });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Player.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferListPlayers'] });
      setEditingPlayer(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Player.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferListPlayers'] });
      setDeleteCandidate(null);
    },
  });

  const filtered = players.filter(p => {
    const matchesSearch = !searchTerm ||
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.current_club?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = filterPosition === "alle" || p.position === filterPosition;
    return matchesSearch && matchesPosition;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-orange-500" />
            Abgangskandidaten
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Spieler, die von ihrem Verein nicht mehr eingeplant sind – {filtered.length} Spieler
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Name oder Verein..."
              className="pl-8 h-9 w-48 text-sm"
            />
          </div>
          <Select value={filterPosition} onValueChange={setFilterPosition}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="Alle Positionen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Positionen</SelectItem>
              {POSITIONS.map(group => (
                <SelectGroup key={group.group}>
                  <SelectLabel>{group.group}</SelectLabel>
                  {group.items.map(pos => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-orange-500 hover:bg-orange-600 h-9"
          >
            <Plus className="w-4 h-4 mr-2" />
            Abgangskandidat hinzufügen
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
        <DoorOpen className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-orange-800">Was ist die Abgangsliste?</p>
          <p className="text-sm text-orange-700 mt-0.5">
            Hier pflegen Sie Spieler, die von Bundesliga-Vereinen oder anderen Clubs auf der Abgangsliste stehen und aktiv einen neuen Verein suchen. 
            Diese Spieler werden beim Club-Matching speziell gekennzeichnet.
          </p>
        </div>
      </div>

      {/* Player Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <DoorOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">Keine Abgangskandidaten</p>
          <p className="text-slate-500 text-sm mt-1">Fügen Sie Spieler hinzu, die von ihrem Verein gehen sollen.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtered.map(player => (
              <motion.div key={player.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Card className="hover:shadow-xl transition-all duration-200 bg-white dark:bg-slate-900 relative rounded-xl overflow-hidden border-2 border-orange-200 dark:border-orange-800 group">
                  {/* Orange accent bar */}
                  <div className="h-1.5 w-full bg-orange-500" />

                  {/* Action buttons */}
                  <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingPlayer(player)}
                      className="p-1.5 bg-white/95 hover:bg-blue-50 rounded-lg shadow-sm border border-slate-200 transition-colors"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    <button
                      onClick={() => setDeleteCandidate(player)}
                      className="p-1.5 bg-white/95 hover:bg-red-50 rounded-lg shadow-sm border border-slate-200 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>

                  <div
                    onClick={() => navigate(createPageUrl("PlayerDetail") + "?id=" + player.id)}
                    className="cursor-pointer"
                  >
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="pr-16">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{player.name}</h3>
                          <Badge className="bg-orange-100 text-orange-700 border border-orange-300 text-xs flex items-center gap-1">
                            <DoorOpen className="w-3 h-3" /> Abgangskandidat
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          {player.current_club || <span className="italic">Kein Verein</span>}
                          {player.transfermarkt_url && (
                            <a href={player.transfermarkt_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-blue-600">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-800 font-semibold text-xs">{player.position}</Badge>
                        {Array.isArray(player.secondary_positions) && player.secondary_positions.slice(0, 1).map(pos => (
                          <Badge key={pos} variant="outline" className="border-slate-200 text-xs">{pos}</Badge>
                        ))}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 pb-3 px-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-slate-100 dark:border-slate-800 pt-2.5">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 uppercase tracking-wide">Alter</span>
                          <span className="font-semibold text-slate-800 dark:text-white">{calculateAge(player.date_of_birth) || '–'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 uppercase tracking-wide">Nationalität</span>
                          <span className="font-semibold text-slate-800 dark:text-white truncate">{player.nationality || '–'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 uppercase tracking-wide">Marktwert</span>
                          <span className="font-semibold text-slate-800 dark:text-white">{player.market_value ? `${(player.market_value / 1000000).toFixed(1).replace(/\.0$/, '')}M €` : '–'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 uppercase tracking-wide">Vertrag bis</span>
                          <span className={`font-semibold flex items-center gap-1 ${isContractExpiringSoon(player.contract_until) ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>
                            {player.contract_until ? format(new Date(player.contract_until), "MM/yyyy") : '–'}
                            {isContractExpiringSoon(player.contract_until) && <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-1 rounded font-normal">⚠️ bald</span>}
                          </span>
                        </div>
                      </div>
                      {player.notes && (
                        <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 line-clamp-2">{player.notes}</p>
                      )}
                      <div className="flex items-center mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          Hinzugefügt: {player.created_date ? format(new Date(player.created_date), "dd.MM.yyyy") : '–'}
                        </span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-orange-500" />
              Abgangskandidat hinzufügen
            </DialogTitle>
          </DialogHeader>
          <TransferPlayerForm player={newPlayer} onChange={setNewPlayer} positions={POSITIONS} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Abbrechen</Button>
            <Button
              onClick={() => createMutation.mutate(newPlayer)}
              disabled={!newPlayer.name || !newPlayer.position || createMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
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
            <DialogTitle>Abgangskandidat bearbeiten</DialogTitle>
          </DialogHeader>
          {editingPlayer && (
            <>
              <TransferPlayerForm player={editingPlayer} onChange={setEditingPlayer} positions={POSITIONS} />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditingPlayer(null)}>Abbrechen</Button>
                <Button
                  onClick={() => updateMutation.mutate({ id: editingPlayer.id, data: editingPlayer })}
                  disabled={!editingPlayer.name || !editingPlayer.position || updateMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600"
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
            <DialogTitle>Spieler entfernen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Soll <strong>{deleteCandidate?.name}</strong> aus der Abgangsliste entfernt werden?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteCandidate(null)}>Abbrechen</Button>
            <Button
              onClick={() => deleteMutation.mutate(deleteCandidate.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Entfernen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransferPlayerForm({ player, onChange, positions }) {
  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Name *</Label>
          <Input value={player.name} onChange={e => onChange({ ...player, name: e.target.value })} placeholder="z.B. Max Mustermann" className="mt-1.5" />
        </div>

        <div>
          <Label>Position *</Label>
          <Select value={player.position} onValueChange={v => onChange({ ...player, position: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Wählen..." /></SelectTrigger>
            <SelectContent>
              {positions.map(group => (
                <SelectGroup key={group.group}>
                  <SelectLabel>{group.group}</SelectLabel>
                  {group.items.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Aktueller Verein</Label>
          <Input value={player.current_club || ""} onChange={e => onChange({ ...player, current_club: e.target.value })} placeholder="z.B. Borussia Dortmund" className="mt-1.5" />
        </div>

        <div className="col-span-2">
          <SecondaryPositionsEditor
            mainPosition={player.position}
            secondaryPositions={player.secondary_positions || []}
            onChange={positions => onChange({ ...player, secondary_positions: positions })}
          />
        </div>

        <div>
          <Label>Geburtsdatum</Label>
          <Input type="date" value={player.date_of_birth || ""} onChange={e => onChange({ ...player, date_of_birth: e.target.value })} className="mt-1.5" />
        </div>

        <div>
          <Label>Nationalität</Label>
          <Input value={player.nationality || ""} onChange={e => onChange({ ...player, nationality: e.target.value })} placeholder="z.B. Deutschland" className="mt-1.5" />
        </div>

        <div>
          <Label>Marktwert (€)</Label>
          <Input type="number" value={player.market_value || ""} onChange={e => onChange({ ...player, market_value: e.target.value })} placeholder="5000000" className="mt-1.5" />
        </div>

        <div>
          <Label>Vertrag bis</Label>
          <Input type="date" value={player.contract_until || ""} onChange={e => onChange({ ...player, contract_until: e.target.value })} className="mt-1.5" />
        </div>

        <div>
          <Label>Starker Fuß</Label>
          <Select value={player.foot || ""} onValueChange={v => onChange({ ...player, foot: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Wählen..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rechts">Rechts</SelectItem>
              <SelectItem value="links">Links</SelectItem>
              <SelectItem value="beidfüßig">Beidfüßig</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Größe (cm)</Label>
          <Input type="number" value={player.height || ""} onChange={e => onChange({ ...player, height: e.target.value })} placeholder="185" className="mt-1.5" />
        </div>

        <div className="col-span-2">
          <Label>Transfermarkt.de Link</Label>
          <Input value={player.transfermarkt_url || ""} onChange={e => onChange({ ...player, transfermarkt_url: e.target.value })} placeholder="https://www.transfermarkt.de/..." className="mt-1.5" />
        </div>

        <div className="col-span-2">
          <Label>Notizen</Label>
          <Textarea value={player.notes || ""} onChange={e => onChange({ ...player, notes: e.target.value })} placeholder="Hintergrundinfos, Konditionen, Ansprechpartner..." className="mt-1.5 h-24" />
        </div>
      </div>
    </div>
  );
}