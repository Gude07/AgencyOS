import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal } from "lucide-react";

const CRITERIA = [
  { key: "position_fit", label: "Positionspassung" },
  { key: "playing_style", label: "Spielstil-Übereinstimmung" },
  { key: "physical", label: "Physische Attribute" },
  { key: "technical", label: "Technische Fähigkeiten" },
  { key: "mental", label: "Mentale Stärke & Charakter" },
  { key: "age_potential", label: "Alter & Entwicklungspotenzial" },
  { key: "form", label: "Aktuelle Form" },
  { key: "culture_fit", label: "Kultureller Fit" },
];

export default function MatchingCriteriaWeights({ weights, onChange }) {
  const handleChange = (key, value) => {
    onChange({ ...weights, [key]: value[0] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="w-4 h-4 text-blue-600" />
          Kriterien-Gewichtung
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {CRITERIA.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">{label}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{weights[key] ?? 5}/10</span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[weights[key] ?? 5]}
              onValueChange={(v) => handleChange(key, v)}
              className="w-full"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}