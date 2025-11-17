import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

export default function TaskSubtasks({ subtasks = [], onUpdate }) {
  const [newSubtask, setNewSubtask] = useState("");

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    const updatedSubtasks = [...subtasks, { title: newSubtask, completed: false }];
    onUpdate(updatedSubtasks);
    setNewSubtask("");
  };

  const handleToggleSubtask = (index) => {
    const updatedSubtasks = [...subtasks];
    updatedSubtasks[index].completed = !updatedSubtasks[index].completed;
    onUpdate(updatedSubtasks);
  };

  const handleDeleteSubtask = (index) => {
    const updatedSubtasks = subtasks.filter((_, i) => i !== index);
    onUpdate(updatedSubtasks);
  };

  return (
    <div>
      <Label className="text-sm font-semibold text-slate-700 mb-3 block">
        Unteraufgaben ({subtasks.filter(st => st.completed).length}/{subtasks.length})
      </Label>
      <div className="space-y-2">
        {subtasks.map((subtask, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Checkbox
              checked={subtask.completed}
              onCheckedChange={() => handleToggleSubtask(index)}
            />
            <span className={`flex-1 ${subtask.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
              {subtask.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteSubtask(index)}
              className="h-8 w-8 hover:bg-slate-200"
            >
              <Trash2 className="w-4 h-4 text-slate-500" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            placeholder="Neue Unteraufgabe..."
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
          />
          <Button onClick={handleAddSubtask} size="icon" className="bg-blue-900 hover:bg-blue-800">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}