import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Building2, ExternalLink, Pencil, Trash2, UserCircle, Users } from "lucide-react";
import ClubNetworkForm from "@/components/clubNetwork/ClubNetworkForm";
import ContactList from "@/components/clubNetwork/ContactList";
import PlacementList from "@/components/clubNetwork/PlacementList";

export default function ClubNetworkDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const clubId = urlParams.get("id");
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: club, isLoading } = useQuery({
    queryKey: ["clubNetwork", clubId],
    queryFn: () => base44.entities.ClubNetwork.get(clubId),
    enabled: !!clubId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ClubNetwork.update(clubId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clubNetwork", clubId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.ClubNetwork.delete(clubId),
    onSuccess: () => {
      window.location.href = createPageUrl("ClubNetwork");
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-center text-slate-400">Lädt...</div>;
  }

  if (!club) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-center text-slate-400">Verein nicht gefunden</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <Link to={createPageUrl("ClubNetwork")} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Zurück zum Vereinsnetzwerk
        </Link>

        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">{club.club_name}</h1>
                  {(club.league || club.country) && (
                    <p className="text-sm text-slate-500">{[club.league, club.country].filter(Boolean).join(" · ")}</p>
                  )}
                  {club.transfermarkt_url && (
                    <a href={club.transfermarkt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-700 dark:text-blue-400 hover:underline mt-1">
                      <ExternalLink className="w-3.5 h-3.5" /> Kader auf Transfermarkt ansehen
                    </a>
                  )}
                  {club.notes && <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{club.notes}</p>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditOpen(true)}>
                  <Pencil className="w-3.5 h-3.5" /> Bearbeiten
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" /> Löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Verein löschen?</AlertDialogTitle>
                      <AlertDialogDescription>Alle Kontakte und Platzierungen zu "{club.club_name}" werden unwiderruflich gelöscht.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="contacts">
          <TabsList>
            <TabsTrigger value="contacts" className="gap-1"><UserCircle className="w-4 h-4" /> Kontakte</TabsTrigger>
            <TabsTrigger value="placements" className="gap-1"><Users className="w-4 h-4" /> Platzierungen</TabsTrigger>
          </TabsList>
          <TabsContent value="contacts" className="mt-4">
            <ContactList
              contacts={club.contacts || []}
              onChange={(contacts) => updateMutation.mutate({ contacts })}
            />
          </TabsContent>
          <TabsContent value="placements" className="mt-4">
            <PlacementList
              placements={club.placements || []}
              contacts={club.contacts || []}
              clubName={club.club_name}
              clubNetworkId={club.id}
              onChange={(placements) => updateMutation.mutate({ placements })}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ClubNetworkForm
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={club}
        onSave={(data) => {
          updateMutation.mutate(data);
          setEditOpen(false);
        }}
      />
    </div>
  );
}