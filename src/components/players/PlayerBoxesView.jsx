import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X, Pencil, Users, Check } from "lucide-react";
import { differenceInYears } from "date-fns";

const BOX_COLORS = {
  blue:   { border: "border-blue-300",   bg: "bg-blue-50 dark:bg-blue-950",     text: "text-blue-800 dark:text-blue-200",   dot: "bg-blue-500" },
  green:  { border: "border-green-300",  bg: "bg-green-50 dark:bg-green-950",   text: "text-green-800 dark:text-green-200", dot: "bg-green-500" },
  purple: { border: "border-purple-300", bg: "bg-purple-50 dark:bg-purple-950", text: "text-purple-800 dark:text-purple-200",dot: "bg-purple-500" },
  orange: { border: "border-orange-300", bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-800 dark:text-orange-200",dot: "bg-orange-500" },
  red:    { border: "border-red-300",    bg: "bg-red-50 dark:bg-red-950",       text: "text-red-800 dark:text-red-200",     dot: "bg-red-500" },
  slate:  { border: "border-slate-300",  bg: "bg-slate-50 dark:bg-slate-900",   text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-500" },
};

const COLOR_OPTIONS = ["blue", "green", "purple", "orange", "red", "slate"];

function calculateAge(dob) {
  if (!dob) return null;
  return differenceInYears(new Date(), new Date(dob));
}

export default function PlayerBoxesView({ players, activeBox, onBoxSelect }) {
  const queryClient = useQueryClient();

  const [showCreateBox, setShowCreateBox] = useState(false);
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxColor, setNewBoxColor] = useState("blue");
  const [editingBox, setEditingBox] = useState(null);
  const [assignBox, setAssignBox] = useState(null);
  const [searchAssign, setSearchAssign] = useState("");
  const [draggedPlayerId, setDraggedPlayerId] = useState(null);
  const [dragOverBox, setDragOverBox] = useState(null);

  // Load boxes from DB
  const { data: boxes = [], isLoading: boxesLoading } = useQuery({
    queryKey: ["playerBoxes"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const all = await base44.entities.PlayerBox.list("order");
      return all.filter(b => b.agency_id === user.agency_id);
    },
    refetchInterval: 10000,
  });

  const createBoxMutation = useMutation({
    mutationFn: async (boxData) => {
      const user = await base44.auth.me();
      return base44.entities.PlayerBox.create({ ...boxData, agency_id: user.agency_id, order: boxes.length });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playerBoxes"] }),
  });

  const updateBoxMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlayerBox.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playerBoxes"] }),
  });

  const deleteBoxMutation = useMutation({
    mutationFn: (id) => base44.entities.PlayerBox.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playerBoxes"] }),
  });

  const updatePlayerMutation = useMutation({
    mutationFn: ({ playerId, newBoxes }) =>
      base44.entities.Player.update(playerId, { player_boxes: newBoxes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["players"] }),
  });

  // --- Drag & Drop ---
  const handleDragStart = (e, playerId) => {
    setDraggedPlayerId(playerId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (e, boxId) => {
    e.preventDefault();
    setDragOverBox(null);
    if (!draggedPlayerId) return;
    const player = players.find(p => p.id === draggedPlayerId);
    if (!player) return;
    const current = Array.isArray(player.player_boxes) ? player.player_boxes : [];
    if (current.includes(boxId)) return;
    updatePlayerMutation.mutate({ playerId: draggedPlayerId, newBoxes: [...current, boxId] });
    setDraggedPlayerId(null);
  };

  // --- Assign dialog helpers ---
  const playersInBox = (boxId) =>
    players.filter(p => !p.archive_id && Array.isArray(p.player_boxes) && p.player_boxes.includes(boxId));

  const isInBox = (player, boxId) =>
    Array.isArray(player.player_boxes) && player.player_boxes.includes(boxId);

  const togglePlayerInBox = (player, boxId) => {
    const current = Array.isArray(player.player_boxes) ? player.player_boxes : [];
    const newBoxes = current.includes(boxId)
      ? current.filter(b => b !== boxId)
      : [...current, boxId];
    updatePlayerMutation.mutate({ playerId: player.id, newBoxes });
  };

  const filteredAssignPlayers = players
    .filter(p => !p.archive_id)
    .filter(p => !searchAssign || p.name?.toLowerCase().includes(searchAssign.toLowerCase()) || p.current_club?.toLowerCase().includes(searchAssign.toLowerCase()));

  // --- Box CRUD ---
  const createBox = () => {
    if (!newBoxName.trim()) return;
    createBoxMutation.mutate({ name: newBoxName.trim(), color: newBoxColor });
    setNewBoxName(""); setNewBoxColor("blue"); setShowCreateBox(false);
  };

  const saveEditBox = () => {
    if (!editingBox) return;
    updateBoxMutation.mutate({ id: editingBox.id, data: { name: editingBox.name, color: editingBox.color } });
    setEditingBox(null);
  };

  const deleteBox = (box) => {
    // Remove box from all players
    players.forEach(p => {
      if (Array.isArray(p.player_boxes) && p.player_boxes.includes(box.id)) {
        updatePlayerMutation.mutate({ playerId: p.id, newBoxes: p.player_boxes.filter(b => b !== box.id) });
      }
    });
    deleteBoxMutation.mutate(box.id);
    if (activeBox === box.id) onBoxSelect(null);
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center">
        {/* "Alle" tile */}
        <button
          onClick={() => onBoxSelect(null)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-medium text-sm ${
            !activeBox
              ? "border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400"
          }`}
        >
          <Users className="w-4 h-4" />
          Alle Spieler
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${!activeBox ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
            {players.filter(p => !p.archive_id).length}
          </span>
        </button>

        {boxesLoading ? (
          <span className="text-xs text-slate-400">Boxen werden geladen...</span>
        ) : (
          boxes.map(box => {
            const colors = BOX_COLORS[box.color] || BOX_COLORS.blue;
            const count = playersInBox(box.id).length;
            const isActive = activeBox === box.id;
            const isOver = dragOverBox === box.id;

            return (
              <div
                key={box.id}
                className="relative group"
                onDragOver={(e) => { e.preventDefault(); setDragOverBox(box.id); }}
                onDragLeave={() => setDragOverBox(null)}
                onDrop={(e) => handleDrop(e, box.id)}
              >
                <button
                  onClick={() => onBoxSelect(isActive ? null : box.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-medium text-sm ${
                    isActive
                      ? `${colors.border} ${colors.bg} ${colors.text} shadow-sm`
                      : `border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300`
                  } ${isOver ? "ring-2 ring-blue-400 scale-105" : ""}`}
                >
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  {box.name}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/40 dark:bg-black/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                    {count}
                  </span>
                </button>

                <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 z-10">
                  <button
                    onClick={() => { setAssignBox(box); setSearchAssign(""); }}
                    className="w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow"
                    title="Spieler zuweisen"
                  >
                    <Users className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditingBox({ ...box })}
                    className="w-5 h-5 bg-slate-400 hover:bg-slate-500 text-white rounded-full flex items-center justify-center shadow"
                    title="Umbenennen"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteBox(box)}
                    className="w-5 h-5 bg-red-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow"
                    title="Box löschen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        <button
          onClick={() => setShowCreateBox(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Neue Box
        </button>
      </div>

      {/* Assign Players Dialog */}
      <Dialog open={!!assignBox} onOpenChange={() => setAssignBox(null)}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Spieler in „{assignBox?.name}" zuweisen</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Spieler suchen..."
            value={searchAssign}
            onChange={e => setSearchAssign(e.target.value)}
            className="mt-2"
          />
          <div className="flex-1 overflow-y-auto mt-2 space-y-1">
            {filteredAssignPlayers.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">Keine Spieler gefunden</p>
            )}
            {filteredAssignPlayers.map(player => {
              const inBox = assignBox && isInBox(player, assignBox.id);
              const age = player.age || calculateAge(player.date_of_birth);
              return (
                <label
                  key={player.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${inBox ? "bg-blue-600 border-blue-600" : "border-slate-300 dark:border-slate-600"}`}
                    onClick={() => assignBox && togglePlayerInBox(player, assignBox.id)}
                  >
                    {inBox && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => assignBox && togglePlayerInBox(player, assignBox.id)}>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{player.name}</p>
                    <p className="text-xs text-slate-500 truncate">{player.position}{age ? ` · ${age} J.` : ""}{player.current_club ? ` · ${player.current_club}` : ""}</p>
                  </div>
                  {inBox && <span className="text-xs text-blue-600 font-medium">✓ zugewiesen</span>}
                </label>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t flex justify-between items-center">
            <span className="text-xs text-slate-500">
              {assignBox && playersInBox(assignBox.id).length} Spieler zugewiesen
            </span>
            <Button onClick={() => setAssignBox(null)}>Fertig</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Box Dialog */}
      <Dialog open={showCreateBox} onOpenChange={setShowCreateBox}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Neue Box erstellen</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input value={newBoxName} onChange={e => setNewBoxName(e.target.value)} placeholder="z.B. Leihspieler, Talente..." onKeyDown={e => e.key === "Enter" && createBox()} autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Farbe</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button key={color} onClick={() => setNewBoxColor(color)}
                    className={`w-7 h-7 rounded-full border-2 border-transparent transition-all ${newBoxColor === color ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : ""}`}
                    style={{ backgroundColor: { blue: "#2563eb", green: "#16a34a", purple: "#9333ea", orange: "#ea580c", red: "#dc2626", slate: "#64748b" }[color] }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateBox(false)}>Abbrechen</Button>
            <Button onClick={createBox} disabled={!newBoxName.trim() || createBoxMutation.isPending} className="bg-blue-900 hover:bg-blue-800">Erstellen</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Box Dialog */}
      <Dialog open={!!editingBox} onOpenChange={() => setEditingBox(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Box bearbeiten</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input value={editingBox?.name || ""} onChange={e => setEditingBox({ ...editingBox, name: e.target.value })} onKeyDown={e => e.key === "Enter" && saveEditBox()} autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Farbe</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button key={color} onClick={() => setEditingBox({ ...editingBox, color })}
                    className={`w-7 h-7 rounded-full border-2 border-transparent transition-all ${editingBox?.color === color ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : ""}`}
                    style={{ backgroundColor: { blue: "#2563eb", green: "#16a34a", purple: "#9333ea", orange: "#ea580c", red: "#dc2626", slate: "#64748b" }[color] }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingBox(null)}>Abbrechen</Button>
            <Button onClick={saveEditBox} className="bg-blue-900 hover:bg-blue-800">Speichern</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}