import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GitCompare, Loader2, Search, Globe, Database, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

function PlayerCard({ sp, isExternal }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isExternal ? (
            <Globe className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          ) : (
            <Database className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
          )}
          <span className="font-semibold text-slate-900 dark:text-white">{sp.player_name}</span>
          {isExternal && sp.current_club && (
            <span className="text-xs text-slate-500">({sp.current_club})</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isExternal && (
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 text-xs">
              Internet
            </Badge>
          )}
          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
            {sp.similarity_score}% ähnlich
          </Badge>
        </div>
      </div>

      {isExternal && (sp.age || sp.position || sp.market_value_eur) && (
        <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
          {sp.age && <span>Alter: {sp.age}</span>}
          {sp.position && <span>Position: {sp.position}</span>}
          {sp.market_value_eur && <span>Marktwert: €{(sp.market_value_eur / 1_000_000).toFixed(1)}M</span>}
          {sp.nationality && <span>{sp.nationality}</span>}
        </div>
      )}

      <p className="text-sm text-slate-600 dark:text-slate-400">{sp.verdict}</p>

      {isExternal && sp.stats_info && (
        <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1">
          📊 {sp.stats_info}
        </p>
      )}

      <div className="flex flex-wrap gap-1">
        {sp.similarity_reasons?.map((r, j) => (
          <Badge key={j} variant="outline" className="text-xs text-green-700 border-green-300">✓ {r}</Badge>
        ))}
        {sp.key_differences?.map((d, j) => (
          <Badge key={j} variant="outline" className="text-xs text-orange-700 border-orange-300">△ {d}</Badge>
        ))}
      </div>
    </div>
  );
}

export default function SimilarPlayersSearch({ players = [] }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const refPlayer = players.find(p => p.name.toLowerCase().includes(query.toLowerCase()));
      const response = await base44.functions.invoke('findSimilarPlayers', {
        referencePlayerName: query,
        referencePlayerId: refPlayer?.id
      });
      if (response.data.success) {
        setResult(response.data);
      } else {
        toast.error(response.data.error || 'Fehler');
      }
    } catch (e) {
      toast.error('Fehler bei der Suche');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="w-4 h-4 text-indigo-600" />
          Ähnliche Spielertypen finden
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Spieler eingeben (z.B. Erling Haaland)..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              list="players-list"
            />
            <datalist id="players-list">
              {players.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
            <Button onClick={handleSearch} disabled={loading || !query.trim()} size="sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Globe className="w-3 h-3" />
            KI recherchiert den Spieler im Internet und sucht ähnliche Spieler — auch außerhalb eures Systems
          </p>
        </div>

        {loading && (
          <div className="text-sm text-slate-500 flex items-center gap-2 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            KI recherchiert Spielerprofil und sucht ähnliche Spieler weltweit...
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.reference_profile_summary && (
              <p className="text-sm text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800 rounded p-2">
                🎯 Spielertyp: {result.reference_profile_summary}
              </p>
            )}

            {result.similar_players?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                  Aus eurem System
                </div>
                {result.similar_players.map((sp, i) => (
                  <PlayerCard key={i} sp={sp} isExternal={false} />
                ))}
              </div>
            )}

            {result.internet_players?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  Externe Spieler (Internet-Recherche)
                </div>
                {result.internet_players.map((sp, i) => (
                  <PlayerCard key={i} sp={sp} isExternal={true} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}