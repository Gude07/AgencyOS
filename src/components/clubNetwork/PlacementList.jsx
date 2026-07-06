import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, User, CalendarDays } from "lucide-react";
import PlayerPickerDialog from "./PlayerPickerDialog";
import { base44 } from "@/api/base44Client";

const emptyForm = { player_id: "", player_name: "", position: "", contact_id: "", contact_name: "", date: "", notes: "" };

export default function PlacementList({ placements, contacts, onChange, clubName, clubNetworkId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleSelectPlayer = (player) => {
    setForm({ ...form, player_id: player.id, player_name: player.name, position: player.position || "" });
    setPickerOpen(false);
  };

  const handleContactChange = (contactId) => {
    const contact = contacts.find((c) => c.id === contactId);
    setForm({ ...form, contact_id: contactId, contact_name: contact?.name || "" });
  };

  const handleSave = async () => {
    if (!form.player_name.trim()) return;
    const newPlacement = { ...form, id: Date.now().toString() };
    onChange([...placements, newPlacement]);
    setDialogOpen(false);

    if (newPlacement.player_id) {
      const player = await base44.entities.Player.get(newPlacement.player_id);
      const existingPlacements = player.club_placements || [];
      await base44.entities.Player.update(newPlacement.player_id, {
        club_placements: [
          ...existingPlacements,
          {
            id: newPlacement.id,
            club_network_id: clubNetworkId,
            club_name: clubName,
            contact_name: newPlacement.contact_name,
            date: newPlacement.date,
            notes: newPlacement.notes,
          },
        ],
      });
    }
  };

  const handleDelete = async (id) => {
    const placement = placements.find((p) => p.id === id);
    onChange(placements.filter((p) => p.id !== id));

    if (placement?.player_id) {
      const player = await base44.entities.Player.get(placement.player_id);
      const existingPlacements = player.club_placements || [];
      await base44.entities.Player.update(placement.player_id, {
        club_placements: existingPlacements.filter((p) => p.id !== id),
      });
    }
  };

  const sorted = [...placements].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">Platzierte Spieler</h3>
        <Button size="sm" onClick={openNew} className="gap-1">
          <Plus className="w-4 h-4" /> Platzierung hinzufügen
        </Button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Noch keine Spieler platziert</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <User className="w-8 h-8 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    {p.player_id ? (
                      <Link to={createPageUrl(`PlayerDetail?id=${p.player_id}`)} className="font-medium text-blue-700 dark:text-blue-400 hover:underline">
                        {p.player_name}
                      </Link>
                    ) : (
                      <p className="font-medium text-slate-900 dark:text-white">{p.player_name}</p>
                    )}
                    <p className="text-xs text-slate-500">{p.position}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {p.date && (
                        <span className="text-xs text-slate-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" />{p.date}</span>
                      )}
                      {p.contact_name && (
                        <span className="text-xs text-slate-500">Kontakt: {p.contact_name}</span>
                      )}
                    </div>
                    {p.notes && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{p.notes}</p>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Platzierung</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Spieler *</Label>
              <div className="flex gap-2">
                <Input value={form.player_name} onChange={(e) => setForm({ ...form, player_id: "", player_name: e.target.value })} placeholder="Name eingeben oder aus System wählen" />
                <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>Aus System</Button>
              </div>
            </div>
            <div>
              <Label>Position</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="z.B. Stürmer" />
            </div>
            <div>
              <Label>Ansprechpartner beim Verein</Label>
              <Select value={form.contact_id} onValueChange={handleContactChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Kontakt wählen" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.role ? ` (${c.role})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Notizen</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Details zur Platzierung..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!form.player_name.trim()}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlayerPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={handleSelectPlayer} />
    </div>
  );
}