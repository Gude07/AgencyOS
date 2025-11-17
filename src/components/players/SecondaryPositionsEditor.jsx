import React, { useState, useEffect } from "react";
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

const ALL_POSITIONS = [
  "Torwart",
  "Innenverteidiger",
  "Außenverteidiger",
  "Defensives Mittelfeld",
  "Zentrales Mittelfeld",
  "Offensives Mittelfeld",
  "Flügelspieler",
  "Stürmer"
];

export default function SecondaryPositionsEditor({ mainPosition, secondaryPositions, onChange }) {
  const [selectedPosition, setSelectedPosition] = useState("");
  
  const currentPositions = Array.isArray(secondaryPositions) ? secondaryPositions : [];

  const availablePositions = ALL_POSITIONS.filter(
    pos => pos !== mainPosition && !currentPositions.includes(pos)
  );

  const handleAdd = () => {
    console.log("=== HANDLE ADD CLICKED ===");
    console.log("selectedPosition:", selectedPosition);
    console.log("currentPositions:", currentPositions);
    console.log("availablePositions:", availablePositions);
    
    if (!selectedPosition) {
      console.log("ERROR: selectedPosition is empty!");
      return;
    }
    
    if (currentPositions.includes(selectedPosition)) {
      console.log("ERROR: position already exists!");
      return;
    }
    
    const updated = [...currentPositions, selectedPosition];
    console.log("Calling onChange with:", updated);
    onChange(updated);
    setSelectedPosition("");
    console.log("=== HANDLE ADD COMPLETE ===");
  };

  const handleRemove = (position) => {
    console.log("=== HANDLE REMOVE ===");
    console.log("Removing:", position);
    const updated = currentPositions.filter(p => p !== position);
    console.log("New array:", updated);
    onChange(updated);
  };

  console.log("SecondaryPositionsEditor render - current positions:", currentPositions);
  console.log("SecondaryPositionsEditor render - selectedPosition:", selectedPosition);

  return (
    <div className="space-y-3">
      <Label className="text-sm">Nebenpositionen</Label>
      <div className="flex gap-2">
        <Select 
          value={selectedPosition} 
          onValueChange={(value) => {
            console.log("Select changed to:", value);
            setSelectedPosition(value);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Nebenposition hinzufügen..." />
          </SelectTrigger>
          <SelectContent>
            {availablePositions.length > 0 ? (
              availablePositions.map(pos => (
                <SelectItem key={pos} value={pos}>
                  {pos}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                Keine weiteren Positionen verfügbar
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => {
            console.log("Plus button clicked!");
            handleAdd();
          }}
          disabled={!selectedPosition || availablePositions.length === 0}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {currentPositions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentPositions.map((position) => (
            <Badge key={position} variant="secondary" className="bg-slate-100 text-slate-800 border border-slate-200">
              {position}
              <button
                type="button"
                onClick={() => handleRemove(position)}
                className="ml-2 hover:text-slate-900 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}