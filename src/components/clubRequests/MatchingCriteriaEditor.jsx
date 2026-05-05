import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Save, CheckCircle2 } from "lucide-react";

const availableCriteria = [
  { value: "position", label: "Position", group: "Basis" },
  { value: "age", label: "Alter", group: "Basis" },
  { value: "market_value", label: "Marktwert", group: "Basis" },
  { value: "nationality", label: "Nationalität", group: "Basis" },
  { value: "foot", label: "Starker Fuß", group: "Basis" },
  { value: "height", label: "Größe", group: "Physisch" },
  { value: "speed", label: "⚡ Tempo", group: "Physisch" },
  { value: "strength", label: "💪 Stärke", group: "Physisch" },
  { value: "stamina", label: "🏃 Ausdauer", group: "Physisch" },
  { value: "agility", label: "🤸 Agilität", group: "Physisch" },
  { value: "personality", label: "👤 Persönlichkeit/Charakter", group: "Charakter & Form" },
  { value: "current_form", label: "📊 Aktuelle Form", group: "Charakter & Form" },
  { value: "contract_until", label: "Vertragsende", group: "Basis" },
  { value: "category", label: "Kategorie", group: "Basis" },
];

export default function MatchingCriteriaEditor({ criteria = [], onSave }) {
  const [editedCriteria, setEditedCriteria] = useState(
    criteria.length > 0
      ? criteria.map(c => ({ ...c }))
      : [{ criterion: "position", weight: 5, required: true }]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addCriterion = () => {
    setEditedCriteria(prev => [...prev, { criterion: "", weight: 3, required: false }]);
  };

  const removeCriterion = (index) => {
    setEditedCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const updateCriterion = (index, field, value) => {
    setEditedCriteria(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await onSave(editedCriteria);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const usedCriteria = editedCriteria.map(c => c.criterion);

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Matching-Kriterien konfigurieren</CardTitle>
          <Button onClick={handleSave} size="sm" disabled={isSaving} className={saved ? "bg-green-600 hover:bg-green-600" : "bg-blue-900 hover:bg-blue-800"}>
            {saved ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {isSaving ? "Speichert..." : saved ? "Gespeichert!" : "Speichern"}
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

                {item.criterion === 'height' && (
                  <div>
                    <Label className="text-sm mb-1.5 block">Mindestgröße (cm)</Label>
                    <Input
                      type="number"
                      min={140}
                      max={220}
                      placeholder="z.B. 185"
                      value={item.min_height || ''}
                      onChange={(e) => updateCriterion(index, 'min_height', e.target.value ? Number(e.target.value) : null)}
                      className="w-32"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Spieler bis 5 cm darunter erhalten Teilpunkte, bis 10 cm wenige Punkte.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={!!item.required}
                    onCheckedChange={(checked) => updateCriterion(index, 'required', checked === true)}
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