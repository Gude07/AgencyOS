import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Pencil, Check, X, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function TaskSubtasks({ subtasks = [], onUpdate }) {
  const [newSubtask, setNewSubtask] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const now = () => new Date().toISOString();

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    const updatedSubtasks = [...subtasks, { title: newSubtask, completed: false, last_modified: now() }];
    onUpdate(updatedSubtasks);
    setNewSubtask("");
  };

  const handleToggleSubtask = (index) => {
    const updatedSubtasks = subtasks.map((st, i) =>
      i === index ? { ...st, completed: !st.completed, last_modified: now() } : st
    );
    onUpdate(updatedSubtasks);
  };

  const handleDeleteSubtask = (index) => {
    const updatedSubtasks = subtasks.filter((_, i) => i !== index);
    onUpdate(updatedSubtasks);
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditingTitle(subtasks[index].title);
  };

  const confirmEdit = (index) => {
    if (!editingTitle.trim()) return;
    const updatedSubtasks = subtasks.map((st, i) =>
      i === index ? { ...st, title: editingTitle.trim(), last_modified: now() } : st
    );
    onUpdate(updatedSubtasks);
    setEditingIndex(null);
    setEditingTitle("");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingTitle("");
  };

  return (
    <div>
      <Label className="text-sm font-semibold text-slate-700 mb-3 block">
        Unteraufgaben ({subtasks.filter(st => st.completed).length}/{subtasks.length})
      </Label>
      <div className="space-y-2">
        {subtasks.map((subtask, index) => (
          <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={subtask.completed}
                onCheckedChange={() => handleToggleSubtask(index)}
              />
              {editingIndex === index ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") confirmEdit(index);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-50" onClick={() => confirmEdit(index)}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:bg-slate-200" onClick={cancelEdit}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${subtask.completed ? "line-through text-slate-400" : "text-slate-700"}`}>
                    {subtask.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(index)}
                    className="h-7 w-7 hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSubtask(index)}
                    className="h-7 w-7 hover:bg-red-50 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
            {subtask.last_modified && editingIndex !== index && (
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1 ml-7">
                <Clock className="w-3 h-3" />
                Zuletzt bearbeitet: {formatDistanceToNow(new Date(subtask.last_modified), { addSuffix: true, locale: de })}
              </p>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            placeholder="Neue Unteraufgabe..."
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
          />
          <Button onClick={handleAddSubtask} size="icon" className="bg-blue-900 hover:bg-blue-800 shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}