import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X, Pencil, GripVertical, Users, Boxes } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { differenceInYears } from "date-fns";

const DEFAULT_BOXES = [
  { id: "jugendspieler", name: "Jugendspieler", color: "green" },
  { id: "eigene_spieler", name: "Eigene Spieler", color: "blue" },
];

const BOX_COLORS = {
  blue: { border: "border-blue-300", bg: "bg-blue-50 dark:bg-blue-950", header: "bg-blue-100 dark:bg-blue-900", text: "text-blue-800 dark:text-blue-200", badge: "bg-blue-600" },
  green: { border: "border-green-300", bg: "bg-green-50 dark:bg-green-950", header: "bg-green-100 dark:bg-green-900", text: "text-green-800 dark:text-green-200", badge: "bg-green-600" },
  purple: { border: "border-purple-300", bg: "bg-purple-50 dark:bg-purple-950", header: "bg-purple-100 dark:bg-purple-900", text: "text-purple-800 dark:text-purple-200", badge: "bg-purple-600" },
  orange: { border: "border-orange-300", bg: "bg-orange-50 dark:bg-orange-950", header: "bg-orange-100 dark:bg-orange-900", text: "text-orange-800 dark:text-orange-200", badge: "bg-orange-600" },
  red: { border: "border-red-300", bg: "bg-red-50 dark:bg-red-950", header: "bg-red-100 dark:bg-red-900", text: "text-red-800 dark:text-red-200", badge: "bg-red-600" },
  slate: { border: "border-slate-300", bg: "bg-slate-50 dark:bg-slate-900", header: "bg-slate-100 dark:bg-slate-800", text: "text-slate-800 dark:text-slate-200", badge: "bg-slate-600" },
};

const COLOR_OPTIONS = ["blue", "green", "purple", "orange", "red", "slate"];

const STORAGE_KEY = "player_boxes_config";

function getStoredBoxes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_BOXES;
}

function saveBoxes(boxes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes));
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  return differenceInYears(new Date(), new Date(dateOfBirth));
}

export default function PlayerBoxesView({ players, onPlayersChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [boxes, setBoxes] = useState(getStoredBoxes);
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const [dragOverBox, setDragOverBox] = useState(null);
  const [showCreateBox, setShowCreateBox] = useState(false);
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxColor, setNewBoxColor] = useState("blue");
  const [editingBox, setEditingBox] = useState(null);

  const updatePlayerMutation = useMutation({
    mutationFn: ({ playerId, boxes }) =>
      base44.entities.Player.update(playerId, { player_boxes: boxes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });

  const updateBoxesState = (newBoxes) => {
    setBoxes(newBoxes);
    saveBoxes(newBoxes);
  };

  const handleDragStart = (e, player) => {
    setDraggedPlayer(player);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e, boxId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverBox(boxId);
  };

  const handleDragLeave = () => {
    setDragOverBox(null);
  };

  const handleDrop = (e, boxId) => {
    e.preventDefault();
    setDragOverBox(null);
    if (!draggedPlayer) return;

    const currentBoxes = Array.isArray(draggedPlayer.player_boxes) ? draggedPlayer.player_boxes : [];
    if (currentBoxes.includes(boxId)) return; // already in box

    const newBoxes = [...currentBoxes, boxId];
    updatePlayerMutation.mutate({ playerId: draggedPlayer.id, boxes: newBoxes });
    setDraggedPlayer(null);
  };

  const handleDropOnUnassigned = (e) => {
    e.preventDefault();
    setDragOverBox(null);
    if (!draggedPlayer) return;
    if (!Array.isArray(draggedPlayer.player_boxes) || draggedPlayer.player_boxes.length === 0) return;
    updatePlayerMutation.mutate({ playerId: draggedPlayer.id, boxes: [] });
    setDraggedPlayer(null);
  };

  const removePlayerFromBox = (player, boxId) => {
    const current = Array.isArray(player.player_boxes) ? player.player_boxes : [];
    updatePlayerMutation.mutate({ playerId: player.id, boxes: current.filter(b => b !== boxId) });
  };

  const createBox = () => {
    if (!newBoxName.trim()) return;
    const id = "box_" + Date.now();
    const newBoxes = [...boxes, { id, name: newBoxName.trim(), color: newBoxColor }];
    updateBoxesState(newBoxes);
    setNewBoxName("");
    setNewBoxColor("blue");
    setShowCreateBox(false);
  };

  const deleteBox = (boxId) => {
    updateBoxesState(boxes.filter(b => b.id !== boxId));
    // Remove boxId from all players who have it
    players.forEach(p => {
      if (Array.isArray(p.player_boxes) && p.player_boxes.includes(boxId)) {
        updatePlayerMutation.mutate({ playerId: p.id, boxes: p.player_boxes.filter(b => b !== boxId) });
      }
    });
  };

  const saveEditBox = () => {
    if (!editingBox) return;
    updateBoxesState(boxes.map(b => b.id === editingBox.id ? editingBox : b));
    setEditingBox(null);
  };

  const unassignedPlayers = players.filter(p => !p.archive_id && (!Array.isArray(p.player_boxes) || p.player_boxes.length === 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Spieler per Drag &amp; Drop in Boxen ziehen. Ein Spieler kann in mehreren Boxen sein.
        </p>
        <Button size="sm" onClick={() => setShowCreateBox(true)} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Neue Box
        </Button>
      </div>

      {/* Boxes */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {boxes.map(box => {
          const colors = BOX_COLORS[box.color] || BOX_COLORS.blue;
          const boxPlayers = players.filter(p => !p.archive_id && Array.isArray(p.player_boxes) && p.player_boxes.includes(box.id));
          const isOver = dragOverBox === box.id;

          return (
            <div
              key={box.id}
              onDragOver={(e) => handleDragOver(e, box.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, box.id)}
              className={`rounded-xl border-2 transition-all ${colors.border} ${colors.bg} ${isOver ? "ring-2 ring-offset-1 ring-blue-400 scale-[1.01]" : ""}`}
            >
              {/* Box header */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${colors.header}`}>
                <div className="flex items-center gap-2">
                  <Boxes className={`w-4 h-4 ${colors.text}`} />
                  <span className={`font-semibold ${colors.text}`}>{box.name}</span>
                  <span className={`text-xs text-white px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                    {boxPlayers.length}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingBox({ ...box })}
                    className="p-1 hover:bg-white/40 rounded transition-colors"
                    title="Box umbenennen"
                  >
                    <Pencil className={`w-3.5 h-3.5 ${colors.text}`} />
                  </button>
                  <button
                    onClick={() => deleteBox(box.id)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                    title="Box löschen"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Players in box */}
              <div className="p-3 min-h-[80px] space-y-2">
                {boxPlayers.length === 0 && (
                  <div className={`text-xs text-center py-4 ${colors.text} opacity-50`}>
                    Spieler hierher ziehen
                  </div>
                )}
                {boxPlayers.map(player => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player)}
                    className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all group"
                  >
                    <div
                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(createPageUrl("PlayerDetail") + "?id=" + player.id + "&back=/Players")}
                    >
                      <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{player.name}</p>
                        <p className="text-xs text-slate-500 truncate">{player.position}{player.age || calculateAge(player.date_of_birth) ? ` · ${player.age || calculateAge(player.date_of_birth)} J.` : ""}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removePlayerFromBox(player, box.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                      title="Aus dieser Box entfernen"
                    >
                      <X className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unassigned players */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOverBox("unassigned"); }}
        onDragLeave={() => setDragOverBox(null)}
        onDrop={handleDropOnUnassigned}
        className={`rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all ${dragOverBox === "unassigned" ? "ring-2 ring-slate-400 bg-slate-50" : ""}`}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-600 dark:text-slate-300">Nicht zugeordnet</span>
          <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full">
            {unassignedPlayers.length}
          </span>
        </div>
        <div className="p-3 grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {unassignedPlayers.length === 0 && (
            <div className="col-span-full text-xs text-center py-4 text-slate-400">
              Alle aktiven Spieler sind einer Box zugeordnet
            </div>
          )}
          {unassignedPlayers.map(player => (
            <div
              key={player.id}
              draggable
              onDragStart={(e) => handleDragStart(e, player)}
              className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all"
            >
              <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => navigate(createPageUrl("PlayerDetail") + "?id=" + player.id + "&back=/Players")}
              >
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{player.name}</p>
                <p className="text-xs text-slate-500 truncate">{player.position}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Box Dialog */}
      <Dialog open={showCreateBox} onOpenChange={setShowCreateBox}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Neue Box erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Name</label>
              <Input
                value={newBoxName}
                onChange={(e) => setNewBoxName(e.target.value)}
                placeholder="z.B. Leihspieler, Talente..."
                onKeyDown={(e) => e.key === "Enter" && createBox()}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Farbe</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(color => {
                  const c = BOX_COLORS[color];
                  return (
                    <button
                      key={color}
                      onClick={() => setNewBoxColor(color)}
                      className={`w-7 h-7 rounded-full border-2 ${c.badge.replace("bg-", "bg-")} ${newBoxColor === color ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
                      style={{ backgroundColor: color === "slate" ? "#64748b" : color === "blue" ? "#2563eb" : color === "green" ? "#16a34a" : color === "purple" ? "#9333ea" : color === "orange" ? "#ea580c" : "#dc2626" }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateBox(false)}>Abbrechen</Button>
            <Button onClick={createBox} disabled={!newBoxName.trim()} className="bg-blue-900 hover:bg-blue-800">
              Erstellen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Box Dialog */}
      <Dialog open={!!editingBox} onOpenChange={() => setEditingBox(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Box bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Name</label>
              <Input
                value={editingBox?.name || ""}
                onChange={(e) => setEditingBox({ ...editingBox, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && saveEditBox()}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Farbe</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    onClick={() => setEditingBox({ ...editingBox, color })}
                    className={`w-7 h-7 rounded-full border-2 ${editingBox?.color === color ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
                    style={{ backgroundColor: color === "slate" ? "#64748b" : color === "blue" ? "#2563eb" : color === "green" ? "#16a34a" : color === "purple" ? "#9333ea" : color === "orange" ? "#ea580c" : "#dc2626" }}
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
    </div>
  );
}