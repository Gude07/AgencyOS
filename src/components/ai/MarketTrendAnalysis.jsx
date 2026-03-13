import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function MarketTrendAnalysis({ player }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('getMarketTrends', {
        entityType: 'player',
        entityId: player.id,
        playerName: player.name,
        position: player.position,
        league: player.current_club,
        marketValue: player.market_value
      });
      
      if (response.data.success) {
        setAnalysis(response.data.analysis);
        toast.success('Marktanalyse abgeschlossen!');
      } else {
        toast.error('Analyse fehlgeschlagen');
      }
    } catch (error) {
      console.error('Error analyzing market:', error);
      toast.error('Fehler bei der Marktanalyse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <TrendingUp className="w-4 h-4 mr-2" />
          Markttrends analysieren
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Markttrend-Analyse für {player.name}</DialogTitle>
        </DialogHeader>

        {!analysis ? (
          <div className="text-center py-12">
            <Button 
              onClick={handleAnalyze}
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analysiere Markt...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Analyse starten
                </>
              )}
            </Button>
            <p className="text-sm text-slate-600 mt-4">
              Die KI recherchiert aktuelle Transfer-Nachrichten und Markttrends
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {analysis.current_news?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Aktuelle Nachrichten</h3>
                <div className="space-y-3">
                  {analysis.current_news.map((news, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <p className="font-medium">{news.headline}</p>
                      <p className="text-sm text-slate-600 mt-1">{news.summary}</p>
                      {news.source && (
                        <p className="text-xs text-slate-500 mt-2">Quelle: {news.source}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.market_value_assessment && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">Marktwert-Einschätzung</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {analysis.market_value_assessment.current_estimate}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Trend: {analysis.market_value_assessment.trend}
                </p>
                <p className="text-sm text-slate-700 mt-2">
                  {analysis.market_value_assessment.reasoning}
                </p>
              </div>
            )}

            {analysis.comparable_transfers?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Vergleichbare Transfers</h3>
                <div className="space-y-2">
                  {analysis.comparable_transfers.map((transfer, idx) => (
                    <div key={idx} className="p-3 border rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium">{transfer.player}</p>
                        <p className="text-sm text-slate-600">
                          {transfer.from_club} → {transfer.to_club}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge>{transfer.fee}</Badge>
                        <p className="text-xs text-slate-500 mt-1">{transfer.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.risks_opportunities && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <h3 className="font-semibold mb-2 text-red-900">Risiken</h3>
                  <ul className="space-y-1">
                    {analysis.risks_opportunities.risks?.map((risk, idx) => (
                      <li key={idx} className="text-sm text-red-800">• {risk}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold mb-2 text-green-900">Chancen</h3>
                  <ul className="space-y-1">
                    {analysis.risks_opportunities.opportunities?.map((opp, idx) => (
                      <li key={idx} className="text-sm text-green-800">• {opp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {analysis.overall_recommendation && (
              <div className="p-4 bg-slate-100 rounded-lg">
                <h3 className="font-semibold mb-2">Gesamtempfehlung</h3>
                <p className="text-slate-700">{analysis.overall_recommendation}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}