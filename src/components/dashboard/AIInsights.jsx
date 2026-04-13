import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";

const ICON_MAP = { tip: Lightbulb, alert: AlertCircle, trend: TrendingUp };
const COLOR_MAP = {
  tip: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300",
  alert: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300",
  trend: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
};

export default function AIInsights({ tasks = [], players = [], clubRequests = [] }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    const overdueTasks = tasks.filter(t => t.status !== 'abgeschlossen' && t.deadline && new Date(t.deadline) < new Date());
    const openRequests = clubRequests.filter(r => r.status === 'offen');
    const expiringContracts = players.filter(p => {
      if (!p.contract_until) return false;
      const expiry = new Date(p.contract_until);
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      return expiry <= threeMonths && expiry > new Date();
    });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein KI-Assistent für eine Fußball-Spieleragentur. Analysiere die folgende Datenlage und gib 3 konkrete, praxisnahe Empfehlungen auf Deutsch:

Überfällige Aufgaben: ${overdueTasks.length} (Beispiele: ${overdueTasks.slice(0,3).map(t=>t.title).join(', ')})
Offene Vereinsanfragen: ${openRequests.length} (Vereine: ${openRequests.slice(0,3).map(r=>r.club_name).join(', ')})
Spieler mit ablaufendem Vertrag (< 3 Monate): ${expiringContracts.length} (${expiringContracts.slice(0,3).map(p=>p.name).join(', ')})
Gesamtzahl Spieler: ${players.length}

Gib genau 3 Empfehlungen zurück. Jede hat: type (tip/alert/trend), title (kurz, max 8 Wörter), text (1-2 Sätze, konkret und actionable).`,
      response_json_schema: {
        type: "object",
        properties: {
          insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                title: { type: "string" },
                text: { type: "string" }
              }
            }
          }
        }
      }
    });
    setInsights(result.insights || []);
    setLoading(false);
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            KI-Einblicke
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={generateInsights}
            disabled={loading}
            className="text-purple-700 border-purple-200 hover:bg-purple-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Analysiere..." : insights ? "Aktualisieren" : "Analyse starten"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {!insights && !loading && (
          <div className="text-center py-6 text-slate-400">
            <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Klicke auf "Analyse starten" für KI-basierte Handlungsempfehlungen</p>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-8 gap-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">KI analysiert deine Agentur-Daten...</span>
          </div>
        )}
        {insights && (
          <div className="space-y-3">
            {insights.map((insight, i) => {
              const Icon = ICON_MAP[insight.type] || Lightbulb;
              const colorClass = COLOR_MAP[insight.type] || COLOR_MAP.tip;
              return (
                <div key={i} className={`flex gap-3 p-3 rounded-lg border ${colorClass}`}>
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{insight.title}</p>
                    <p className="text-xs mt-0.5 opacity-90">{insight.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}