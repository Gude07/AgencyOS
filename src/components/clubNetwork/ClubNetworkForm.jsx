import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ClubNetworkForm({ open, onOpenChange, initialData, onSave }) {
  const [form, setForm] = useState(
    initialData || { club_name: "", transfermarkt_url: "", league: "", country: "", notes: "" }
  );

  const handleSave = () => {
    if (!form.club_name.trim()) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Verein bearbeiten" : "Neuer Verein"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Vereinsname *</Label>
            <Input value={form.club_name} onChange={(e) => setForm({ ...form, club_name: e.target.value })} placeholder="z.B. Borussia Dortmund" />
          </div>
          <div>
            <Label>Transfermarkt-Link (Kader)</Label>
            <Input value={form.transfermarkt_url} onChange={(e) => setForm({ ...form, transfermarkt_url: e.target.value })} placeholder="https://www.transfermarkt.de/..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Liga</Label>
              <Input value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })} placeholder="z.B. Bundesliga" />
            </div>
            <div>
              <Label>Land</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="z.B. Deutschland" />
            </div>
          </div>
          <div>
            <Label>Notizen</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Allgemeine Notizen zum Verein..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={!form.club_name.trim()}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}