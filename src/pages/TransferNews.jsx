import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Newspaper, RefreshCw, CheckCircle, XCircle, ArrowRight, 
  ExternalLink, Loader2, TrendingUp, AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const statusColors = {
  neu: "bg-blue-100 text-blue-800",
  "geprüft": "bg-yellow-100 text-yellow-800",
  zu_anfrage: "bg-green-100 text-green-800",
  abgelehnt: "bg-red-100 text-red-800",
};

const confidenceColor = (score) => {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-500";
};

export default function TransferNews() {
  const [statusFilter, setStatusFilter] = useState("alle");
  const [isFetching, setIsFetching] = useState(false);
  const [filterClub, setFilterClub] = useState("");
  const [filterLeague, setFilterLeague] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: rumors = [], isLoading } = useQuery({
    queryKey: ["transferRumors", user?.agency_id],
    queryFn: () => base44.entities.TransferRumor.filter({ agency_id: user.agency_id }, "-created_date", 50),
    enabled: !!user?.agency_id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TransferRumor.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(["transferRumors"]),
  });

  const handleFetchNews = async () => {
    setIsFetching(true);
    try {
      const payload = {};
      if (filterClub.trim()) payload.club = filterClub.trim();
      if (filterLeague.trim()) payload.league = filterLeague.trim();

      const res = await base44.functions.invoke("fetchTransferNews", payload);
      toast({
        title: "News aktualisiert",
        description: `${res.data.created} neue Gerüchte gefunden (${res.data.total_analyzed} Artikel analysiert).`,
      });
      queryClient.invalidateQueries(["transferRumors"]);
    } catch (e) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
    setIsFetching(false);
  };

  const handleCreateRequest = async (rumor) => {
    await updateMutation.mutateAsync({ id: rumor.id, data: { status: "zu_anfrage" } });
    const params = new URLSearchParams({
      prefill_club: rumor.to_club || "",
      prefill_position: rumor.position || "",
      prefill_league: rumor.league || "",
    });
    window.location.href = `/ClubRequests?${params.toString()}`;
  };

  const handleReject = (id) => updateMutation.mutate({ id, data: { status: "abgelehnt" } });
  const handleMarkReviewed = (id) => updateMutation.mutate({ id, data: { status: "geprüft" } });

  const filtered = statusFilter === "alle" ? rumors : rumors.filter(r => r.status === statusFilter);
  const newCount = rumors.filter(r => r.status === "neu").length;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Newspaper className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transfer-News</h1>
            <p className="text-sm text-slate-500">KI-aggregierte Transfergerüchte aus Sport-Newsquellen</p>
          </div>
          {newCount > 0 && (
            <Badge className="bg-blue-600 text-white">{newCount} neu</Badge>
          )}
        </div>
        <Button onClick={handleFetchNews} disabled={isFetching} className="bg-blue-700 hover:bg-blue-800 text-white gap-2">
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          News abrufen
        </Button>
      </div>

      {/* Filter inputs for club / league */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Suche eingrenzen (optional)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Verein</label>
            <Input
              placeholder="z.B. Bayern München, Real Madrid..."
              value={filterClub}
              onChange={(e) => setFilterClub(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Liga</label>
            <Input
              placeholder="z.B. Bundesliga, Premier League..."
              value={filterLeague}
              onChange={(e) => setFilterLeague(e.target.value)}
            />
          </div>
        </div>
        {(filterClub || filterLeague) && (
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Die KI wird beim nächsten Abruf speziell nach <strong>{[filterClub, filterLeague].filter(Boolean).join(" · ")}</strong> suchen.
          </p>
        )}
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-700 dark:text-blue-300">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Die KI analysiert RSS-Feeds von Kicker, Transfermarkt, Sport1, Sky Sports und Goal.com. Klicke auf <strong>„News abrufen"</strong> um die neuesten Meldungen zu laden.</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Filter:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle</SelectItem>
            <SelectItem value="neu">Neu</SelectItem>
            <SelectItem value="geprüft">Geprüft</SelectItem>
            <SelectItem value="zu_anfrage">→ Anfrage</SelectItem>
            <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-400">{filtered.length} Gerüchte</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Noch keine Gerüchte vorhanden</p>
          <p className="text-sm mt-1">Klicke auf „News abrufen" um zu starten</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rumor) => (
            <Card key={rumor.id} className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-bold text-slate-900 dark:text-white text-lg">{rumor.player_name}</span>
                      <Badge className={statusColors[rumor.status]}>{rumor.status}</Badge>
                      {rumor.source_name && (
                        <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {rumor.source_name}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {rumor.from_club && <span className="font-medium">{rumor.from_club}</span>}
                      {rumor.from_club && rumor.to_club && <ArrowRight className="w-3.5 h-3.5" />}
                      {rumor.to_club && <span className="font-semibold text-blue-700 dark:text-blue-400">{rumor.to_club}</span>}
                      {rumor.league && <span className="text-slate-400">· {rumor.league}</span>}
                      {rumor.position && <span className="text-slate-400">· {rumor.position}</span>}
                    </div>
                    {rumor.summary && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{rumor.summary}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {rumor.confidence_score != null && (
                        <span className={`font-semibold flex items-center gap-1 ${confidenceColor(rumor.confidence_score)}`}>
                          <TrendingUp className="w-3 h-3" />
                          {rumor.confidence_score}% Wahrscheinlichkeit
                        </span>
                      )}
                      {rumor.fee_estimate && <span className="text-slate-500">~{rumor.fee_estimate} Mio €</span>}
                      {rumor.transfer_period && <span className="text-slate-500">{rumor.transfer_period}</span>}
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                    {rumor.status === "neu" && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkReviewed(rumor.id)} className="text-xs gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Geprüft
                      </Button>
                    )}
                    {rumor.status !== "abgelehnt" && rumor.status !== "zu_anfrage" && (
                      <>
                        <Button size="sm" onClick={() => handleCreateRequest(rumor)}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white gap-1">
                          <ArrowRight className="w-3.5 h-3.5" /> Anfrage
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(rumor.id)}
                          className="text-xs text-red-500 border-red-200 hover:bg-red-50 gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Ablehnen
                        </Button>
                      </>
                    )}
                    {rumor.source_url && (
                      <a href={rumor.source_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="text-xs gap-1 w-full">
                          <ExternalLink className="w-3.5 h-3.5" /> Artikel
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}