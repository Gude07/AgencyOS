import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { calculateDetailedMatchScore } from "../../utils/matchmaking";

export default function MatchScoreBreakdown({ player, request, matchScore }) {
  const calculateBreakdown = () => {
    const { breakdown } = calculateDetailedMatchScore(player, request);
    return breakdown;
  };

  const getCriterionLabel = (criterion) => {
    const labels = {
      position: "Position",
      age: "Alter",
      market_value: "Marktwert",
      nationality: "Nationalität",
      foot: "Starker Fuß",
      height: "Größe",
      speed: "⚡ Tempo",
      strength: "💪 Stärke",
      stamina: "🏃 Ausdauer",
      agility: "🤸 Agilität",
      personality: "👤 Persönlichkeit",
      current_form: "📊 Aktuelle Form",
      contract_until: "Vertragsende",
      category: "Kategorie"
    };
    return labels[criterion] || criterion;
  };

  const breakdown = calculateBreakdown();
  const totalWeight = breakdown.reduce((sum, item) => sum + item.weight, 0);
  const achievedWeight = breakdown.reduce((sum, item) => sum + item.achieved, 0);
  const computedScore = totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : matchScore;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="flex items-center gap-1 px-2 py-1 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors">
          <Info className="w-3 h-3" />
          <span className="text-sm font-bold">{computedScore}%</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-96" side="left">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-slate-900">Match-Analyse</h4>
              <Badge variant="secondary" className="bg-blue-100 text-blue-900">
                {computedScore}% Match
              </Badge>
            </div>
            <Progress value={computedScore} className="h-2" />
            <p className="text-xs text-slate-500 mt-1">
              {achievedWeight.toFixed(1)} von {totalWeight} Punkten erreicht
            </p>
          </div>

          <div className="space-y-2">
            {breakdown.map((item, index) => (
              <div key={index} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {item.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    {item.status === 'partial' && <AlertCircle className="w-4 h-4 text-orange-500" />}
                    {item.status === 'fail' && <XCircle className="w-4 h-4 text-red-500" />}
                    <span className={`text-sm font-medium ${item.required ? 'text-slate-900' : 'text-slate-700'}`}>
                      {item.name}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    {item.achieved.toFixed(1)}/{item.weight}
                  </span>
                </div>
                <p className="text-xs text-slate-500 pl-6">{item.detail}</p>
                <div className="pl-6 mt-1">
                  <Progress 
                    value={(item.achieved / item.weight) * 100} 
                    className="h-1" 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              <span className="text-red-500">*</span> = Pflichtkriterium (bei Nichterfüllung = 0% Match)
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}