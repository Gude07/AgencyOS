import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Building2, ExternalLink, Users, UserCircle } from "lucide-react";
import ClubNetworkForm from "@/components/clubNetwork/ClubNetworkForm";

export default function ClubNetwork() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ["clubNetwork"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.ClubNetwork.filter({ agency_id: user.agency_id }, "-created_date");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.ClubNetwork.create({ ...data, agency_id: user.agency_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clubNetwork"] });
      setFormOpen(false);
    },
  });

  const filtered = clubs.filter((c) => c.club_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              Vereinsnetzwerk
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kontakte pflegen und Spieler-Platzierungen bei Vereinen nachverfolgen</p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="gap-2 bg-blue-900 hover:bg-blue-800">
            <Plus className="w-4 h-4" /> Neuer Verein
          </Button>
        </div>

        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Verein suchen..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <p className="text-slate-400 text-center py-12">Lädt...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Noch keine Vereine im Netzwerk hinterlegt</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((club) => (
              <Link key={club.id} to={createPageUrl(`ClubNetworkDetail?id=${club.id}`)}>
                <Card className="hover:border-blue-400 transition-colors h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{club.club_name}</h3>
                      {club.transfermarkt_url && <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    </div>
                    {(club.league || club.country) && (
                      <p className="text-xs text-slate-500 mb-3">{[club.league, club.country].filter(Boolean).join(" · ")}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><UserCircle className="w-3.5 h-3.5" /> {club.contacts?.length || 0} Kontakte</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {club.placements?.length || 0} Platzierungen</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ClubNetworkForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={(data) => createMutation.mutate(data)}
      />
    </div>
  );
}