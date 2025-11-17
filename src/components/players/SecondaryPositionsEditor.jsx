import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

const positions = [
  "Torwart",
  "Innenverteidiger",
  "Außenverteidiger",
  "Defensives Mittelfeld",
  "Zentrales Mittelfeld",
  "Offensives Mittelfeld",
  "Flügelspieler",
  "Stürmer"
];

export default function SecondaryPositionsEditor({ mainPosition, secondaryPositions = [], onChange }) {
  const [selectedPosition, setSelectedPosition] = useState("");

  const availablePositions = positions.filter(
    pos => pos !== mainPosition && !secondaryPositions.includes(pos)
  );

  const handleAdd = () => {
    if (selectedPosition && !secondaryPositions.includes(selectedPosition)) {
      onChange([...secondaryPositions, selectedPosition]);
      setSelectedPosition("");
    }
  };

  const handleRemove = (position) => {
    onChange(secondaryPositions.filter(p => p !== position));
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm">Nebenpositionen</Label>
      <div className="flex gap-2">
        <Select value={selectedPosition} onValueChange={setSelectedPosition}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Nebenposition hinzufügen..." />
          </SelectTrigger>
          <SelectContent>
            {availablePositions.map(pos => (
              <SelectItem key={pos} value={pos}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={handleAdd}
          disabled={!selectedPosition}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {secondaryPositions.map((position) => (
          <Badge key={position} variant="secondary" className="bg-slate-100 text-slate-800">
            {position}
            <button
              type="button"
              onClick={() => handleRemove(position)}
              className="ml-2 hover:text-slate-900"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}