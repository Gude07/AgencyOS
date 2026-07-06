import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, User } from "lucide-react";

export default function PlayerPickerDialog({ open, onOpenChange, onSelect }) {
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.auth.me().then(async (user) => {
      const all = await base44.entities.Player.filter({ agency_id: user.agency_id });
      setPlayers(all);
      setLoading(false);
    });
  }, [open]);

  const filtered = players.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Spieler aus dem System wählen</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Spieler suchen..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1">
          {loading && <p className="text-sm text-slate-400 text-center py-4">Lädt...</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Keine Spieler gefunden</p>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
            >
              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</p>
                <p className="text-xs text-slate-500">{p.position} · {p.current_club || "kein Verein"}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}