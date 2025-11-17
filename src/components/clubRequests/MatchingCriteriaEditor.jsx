import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Save } from "lucide-react";

const availableCriteria = [
  { value: "position", label: "Position" },
  { value: "age", label: "Alter" },
  { value: "market_value", label: "Marktwert" },
  { value: "nationality", label: "Nationalität" },
  { value: "foot", label: "Starker Fuß" },
  { value: "height", label: "Größe" },
  { value: "contract_until", label: "Vertragsende" },
  { value: "category", label: "Kategorie" },
];

export default function MatchingCriteriaEditor({ criteria = [], onSave }) {
  const [editedCriteria, setEditedCriteria] = useState(
    criteria.length > 0 
      ? criteria 
      : [{ criterion: "position", weight: 5, required: true }]
  );

  const addCriterion = () => {
    setEditedCriteria([
      ...editedCriteria,
      { criterion: "", weight: 3, required: false }
    ]);
  };

  const removeCriterion = (index) => {
    setEditedCriteria(editedCriteria.filter((_, i) => i !== index));
  };

  const updateCriterion = (index, field, value) => {
    const newCriteria = [...editedCriteria];
    newCriteria[index][field] = value;
    setEditedCriteria(newCriteria);
  };

  const handleSave = () => {
    onSave(editedCriteria);
  };

  const usedCriteria = editedCriteria.map(c => c.criterion);

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Matching-Kriterien konfigurieren</CardTitle>
          <Button onClick={handleSave} size="sm" className="bg-blue-900 hover:bg-blue-800">
            <Save className="w-4 h-4 mr-2" />
            Speichern
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-sm text-slate-600">
          Definieren Sie, welche Spielerattribute für diese Anfrage wichtig sind und wie stark sie gewichtet werden sollen.
        </p>

        {editedCriteria.map((item, index) => (
          <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-sm mb-1.5 block">Kriterium</Label>
                  <Select 
                    value={item.criterion} 
                    onValueChange={(value) => updateCriterion(index, 'criterion', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCriteria.map(crit => (
                        <SelectItem 
                          key={crit.value} 
                          value={crit.value}
                          disabled={usedCriteria.includes(crit.value) && item.criterion !== crit.value}
                        >
                          {crit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">
                    Gewichtung: {item.weight} / 5
                  </Label>
                  <Slider
                    value={[item.weight]}
                    onValueChange={(value) => updateCriterion(index, 'weight', value[0])}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Niedrig</span>
                    <span>Mittel</span>
                    <span>Hoch</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={item.required}
                    onCheckedChange={(checked) => updateCriterion(index, 'required', checked)}
                  />
                  <Label className="text-sm cursor-pointer">
                    Pflichtkriterium (K.O.-Kriterium)
                  </Label>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCriterion(index)}
                className="flex-shrink-0 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={addCriterion}
          className="w-full"
          disabled={editedCriteria.length >= availableCriteria.length}
        >
          <Plus className="w-4 h-4 mr-2" />
          Kriterium hinzufügen
        </Button>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 text-sm mb-2">Wie funktioniert das Matching?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Höhere Gewichtung = größerer Einfluss auf den Match-Score</li>
            <li>• Pflichtkriterien müssen erfüllt sein, sonst wird der Spieler nicht angezeigt</li>
            <li>• Match-Score: 0-100%, basierend auf erfüllten gewichteten Kriterien</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}