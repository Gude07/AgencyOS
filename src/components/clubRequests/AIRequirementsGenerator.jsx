import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

export default function AIRequirementsGenerator({ requestData, onGenerated }) {
  const [loading, setLoading] = useState(false);

  const generateRequirements = async () => {
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Erstelle einen professionellen Anforderungstext für eine Spielersuche mit folgenden Parametern:

Position: ${requestData.position_needed}
Verein: ${requestData.club_name || 'Unbekannt'}
Liga: ${requestData.league || 'Unbekannt'}
Land: ${requestData.country || 'Unbekannt'}
Budget: ${requestData.budget_min ? `${(requestData.budget_min / 1000000).toFixed(2)}M` : '?'} - ${requestData.budget_max ? `${(requestData.budget_max / 1000000).toFixed(2)}M €` : '?'}
Gehalt: ${requestData.salary_min ? `${Math.round(requestData.salary_min / 1000)}K` : '?'} - ${requestData.salary_max ? `${Math.round(requestData.salary_max / 1000)}K €` : '?'} (${requestData.salary_period || 'jährlich'})
Alter: ${requestData.age_min || '?'} - ${requestData.age_max || '?'} Jahre
Transferperiode: ${requestData.transfer_period || 'Unbekannt'}
Priorität: ${requestData.priority || 'mittel'}

Erstelle einen detaillierten Anforderungstext der folgendes enthält:
- Gewünschte Spielereigenschaften für diese Position
- Technische und taktische Anforderungen
- Persönlichkeitsmerkmale
- Erfahrungslevel
- Anpassung an die Liga/den Verein

Der Text sollte professionell, präzise und hilfreich für die Spielersuche sein. Etwa 3-5 Sätze.`,
        add_context_from_internet: false
      });

      onGenerated(result);
    } catch (error) {
      console.error("Fehler beim Generieren des Texts:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={generateRequirements}
      disabled={loading}
      variant="outline"
      size="sm"
      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generiere...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-2" />
          KI-Anforderungen
        </>
      )}
    </Button>
  );
}