import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, X, Plus } from "lucide-react";
import { POSITIONS } from "./positions";

export default function WhatIfScenario({ onApply, onReset, isActive }) {
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [positions, setPositions] = useState([]);
  const [posInput, setPosInput] = useState("");

  const handleApply = () => {
    const whatIfBudget = (budgetMin || budgetMax) ? {
      min: Number(budgetMin) || 0,
      max: Number(budgetMax) || 0,
      average: (Number(budgetMin) + Number(budgetMax)) / 2
    } : null;
    onApply({ whatIfBudget, whatIfPositions: positions });
  };

  const addPosition = (pos) => {
    if (pos && !positions.includes(pos)) {
      setPositions([...positions, pos]);
    }
    setPosInput("");
  };

  const removePosition = (pos) => setPositions(positions.filter(p => p !== pos));

  return (
    <Card className={`border-2 ${isActive ? 'border-amber-400 bg-amber-50 dark:bg-amber-950' : 'border-slate-200 dark:border-slate-700'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-slate-500'}`} />
          Was-wäre-wenn Szenario
          {isActive && <Badge className="bg-amber-500 text-white text-xs">Aktiv</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Budget überschreiben (in €)</p>
          <div className="flex gap-2">
            <Input placeholder="Min Budget" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} type="number" className="text-sm" />
            <Input placeholder="Max Budget" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} type="number" className="text-sm" />
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Positionen überschreiben</p>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Position eingeben..."
              value={posInput}
              onChange={e => setPosInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPosition(posInput)}
              className="text-sm"
              list="positions-list"
            />
            <datalist id="positions-list">
              {POSITIONS.map(p => <option key={p} value={p} />)}
            </datalist>
            <Button size="sm" variant="outline" onClick={() => addPosition(posInput)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {positions.map(p => (
              <Badge key={p} variant="outline" className="gap-1 cursor-pointer" onClick={() => removePosition(p)}>
                {p} <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleApply} className="bg-amber-500 hover:bg-amber-600 text-white">
            Szenario anwenden
          </Button>
          {isActive && (
            <Button size="sm" variant="outline" onClick={onReset}>
              Zurücksetzen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}