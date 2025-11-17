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
  
  const currentPositions = Array.isArray(secondaryPositions) ? [...secondaryPositions] : [];

  const availablePositions = ALL_POSITIONS.filter(
    pos => pos !== mainPosition && !currentPositions.includes(pos)
  );

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("handleAdd called with selectedPosition:", selectedPosition);
    console.log("Current positions before add:", currentPositions);
    
    if (selectedPosition && selectedPosition !== "" && !currentPositions.includes(selectedPosition)) {
      const updated = [...currentPositions, selectedPosition];
      console.log("Calling onChange with updated array:", updated);
      onChange(updated);
      setSelectedPosition("");
    } else {
      console.log("Add blocked - selectedPosition:", selectedPosition, "already included:", currentPositions.includes(selectedPosition));
    }
  };

  const handleRemove = (position) => {
    const updated = currentPositions.filter(p => p !== position);
    console.log("Removing position:", position, "New array:", updated);
    onChange(updated);
  };

  console.log("SecondaryPositionsEditor render:", {
    mainPosition,
    currentPositions,
    selectedPosition,
    availablePositions: availablePositions.length
  });

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Nebenpositionen</Label>
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
              <SelectItem value="__none__" disabled>
                Keine weiteren Positionen verfügbar
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={handleAdd}
          disabled={!selectedPosition || selectedPosition === "" || availablePositions.length === 0}
          className="flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {currentPositions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentPositions.map((position, index) => (
            <Badge key={`${position}-${index}`} variant="secondary" className="bg-blue-50 text-blue-900 border border-blue-200">
              {position}
              <button
                type="button"
                onClick={() => handleRemove(position)}
                className="ml-2 hover:text-blue-700 transition-colors"
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