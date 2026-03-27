import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GitCompare, Loader2, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

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
        <div className="flex gap-2">
          <Input
            placeholder="Referenzspieler eingeben..."
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

        {result && (
          <div className="space-y-3">
            {result.reference_profile_summary && (
              <p className="text-sm text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800 rounded p-2">
                Spielertyp: {result.reference_profile_summary}
              </p>
            )}
            {result.similar_players?.map((sp, i) => (
              <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">{sp.player_name}</span>
                  <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                    {sp.similarity_score}% ähnlich
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{sp.verdict}</p>
                <div className="flex flex-wrap gap-1">
                  {sp.similarity_reasons?.map((r, j) => (
                    <Badge key={j} variant="outline" className="text-xs text-green-700 border-green-300">✓ {r}</Badge>
                  ))}
                  {sp.key_differences?.map((d, j) => (
                    <Badge key={j} variant="outline" className="text-xs text-orange-700 border-orange-300">△ {d}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}