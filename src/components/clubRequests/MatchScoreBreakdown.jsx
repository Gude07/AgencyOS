import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Info
} from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export default function MatchScoreBreakdown({ player, request, matchScore }) {
  const calculateBreakdown = () => {
    const breakdown = [];
    
    // Position Check
    const checkPositionMatch = (playerPos, requestedPos) => {
      if (playerPos === requestedPos) return 'main';
      if (requestedPos === "Außenverteidiger" && 
          (playerPos === "Linker Außenverteidiger" || playerPos === "Rechter Außenverteidiger")) return 'main';
      if (requestedPos === "Mittelfeld" && 
          (playerPos === "Linkes Mittelfeld" || playerPos === "Rechtes Mittelfeld")) return 'main';
      if (requestedPos === "Flügelspieler" && 
          (playerPos === "Linksaußen" || playerPos === "Rechtsaußen")) return 'main';
      return null;
    };

    const mainPositionMatch = checkPositionMatch(player.position, request.position_needed);
    const secondaryPositionMatch = player.secondary_positions?.some(pos => 
      checkPositionMatch(pos, request.position_needed)
    );

    const playerAge = player.date_of_birth ? 
      Math.floor((new Date() - new Date(player.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 
      null;

    // Wenn keine custom Kriterien, Standard-Matching
    if (!request.matching_criteria || request.matching_criteria.length === 0) {
      breakdown.push({
        name: "Position",
        weight: 50,
        achieved: mainPositionMatch ? 50 : (secondaryPositionMatch ? 25 : 0),
        status: mainPositionMatch ? 'success' : (secondaryPositionMatch ? 'partial' : 'fail'),
        detail: mainPositionMatch 
          ? `Hauptposition passt: ${player.position}` 
          : (secondaryPositionMatch ? `Nebenposition passt` : `Position passt nicht`),
        required: true
      });

      const ageMatch = request.age_min && request.age_max && playerAge && 
        playerAge >= request.age_min && playerAge <= request.age_max;
      breakdown.push({
        name: "Alter",
        weight: 25,
        achieved: ageMatch ? 25 : 0,
        status: ageMatch ? 'success' : 'fail',
        detail: playerAge 
          ? `${playerAge} Jahre (Anforderung: ${request.age_min}-${request.age_max})` 
          : 'Alter unbekannt',
        required: false
      });

      const valueMatch = request.budget_max && player.market_value && 
        player.market_value <= request.budget_max;
      breakdown.push({
        name: "Marktwert",
        weight: 25,
        achieved: valueMatch ? 25 : 0,
        status: valueMatch ? 'success' : 'fail',
        detail: player.market_value 
          ? `${(player.market_value / 1000000).toFixed(1)}M € (Max: ${(request.budget_max / 1000000).toFixed(1)}M €)` 
          : 'Marktwert unbekannt',
        required: false
      });
    } else {
      // Custom Kriterien
      for (const criterion of request.matching_criteria) {
        let matches = false;
        let detail = '';
        let achieved = 0;

        switch (criterion.criterion) {
          case "position":
            if (mainPositionMatch) {
              matches = true;
              achieved = criterion.weight;
              detail = `Hauptposition: ${player.position}`;
            } else if (secondaryPositionMatch) {
              matches = true;
              achieved = criterion.weight * 0.5;
              detail = `Nebenposition passt`;
            } else {
              detail = `Position passt nicht`;
            }
            break;

          case "age":
            matches = playerAge && request.age_min && request.age_max && 
              playerAge >= request.age_min && playerAge <= request.age_max;
            achieved = matches ? criterion.weight : 0;
            detail = playerAge 
              ? `${playerAge} Jahre (Anforderung: ${request.age_min || '?'}-${request.age_max || '?'})` 
              : 'Alter unbekannt';
            break;

          case "market_value":
            matches = request.budget_max && player.market_value && 
              player.market_value <= request.budget_max;
            achieved = matches ? criterion.weight : 0;
            detail = player.market_value 
              ? `${(player.market_value / 1000000).toFixed(1)}M € (Max: ${(request.budget_max / 1000000).toFixed(1)}M €)` 
              : 'Marktwert unbekannt';
            break;

          case "nationality":
            matches = player.nationality === request.country;
            achieved = matches ? criterion.weight : 0;
            detail = player.nationality 
              ? `${player.nationality} ${matches ? '✓' : '(benötigt: ' + request.country + ')'}` 
              : 'Nationalität unbekannt';
            break;

          case "foot":
            matches = !!player.foot;
            achieved = matches ? criterion.weight : 0;
            detail = player.foot ? `${player.foot}` : 'Fuß nicht angegeben';
            break;

          case "height":
            matches = !!player.height;
            achieved = matches ? criterion.weight : 0;
            detail = player.height ? `${player.height} cm` : 'Größe nicht angegeben';
            break;

          case "contract_until":
            matches = !!player.contract_until;
            achieved = matches ? criterion.weight : 0;
            detail = player.contract_until 
              ? `Vertrag bis ${new Date(player.contract_until).toLocaleDateString('de-DE')}` 
              : 'Vertragsende unbekannt';
            break;

          case "category":
            matches = player.category === "Wintertransferperiode" || 
              player.category === "Sommertransferperiode";
            achieved = matches ? criterion.weight : 0;
            detail = player.category || 'Kategorie nicht gesetzt';
            break;

          default:
            detail = 'Unbekanntes Kriterium';
        }

        breakdown.push({
          name: getCriterionLabel(criterion.criterion),
          weight: criterion.weight,
          achieved: achieved,
          status: matches ? 'success' : 'fail',
          detail: detail,
          required: criterion.required || false
        });
      }
    }

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
      contract_until: "Vertragsende",
      category: "Kategorie"
    };
    return labels[criterion] || criterion;
  };

  const breakdown = calculateBreakdown();
  const totalWeight = breakdown.reduce((sum, item) => sum + item.weight, 0);
  const achievedWeight = breakdown.reduce((sum, item) => sum + item.achieved, 0);

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="flex items-center gap-1 px-2 py-1 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors">
          <Info className="w-3 h-3" />
          <span className="text-sm font-bold">{matchScore}%</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-96" side="left">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-slate-900">Match-Analyse</h4>
              <Badge variant="secondary" className="bg-blue-100 text-blue-900">
                {matchScore}% Match
              </Badge>
            </div>
            <Progress value={matchScore} className="h-2" />
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