import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Archive as ArchiveIcon, 
  Users, 
  Building2, 
  FolderOpen,
  Undo2,
  Trash2,
  Eye,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const statusColors = {
  offen: "bg-slate-100 text-slate-800 border-slate-200",
  in_bearbeitung: "bg-blue-100 text-blue-800 border-blue-200",
  angebote_gesendet: "bg-purple-100 text-purple-800 border-purple-200",
  abgeschlossen: "bg-green-100 text-green-800 border-green-200",
  abgelehnt: "bg-red-100 text-red-800 border-red-200",
  noch_offen: "bg-slate-100 text-slate-800 border-slate-200",
  bei_verein_angeboten: "bg-purple-100 text-purple-800 border-purple-200",
};

export default function Archives() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("player");
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [unarchivingItem, setUnarchivingItem] = useState(null);
  const [deletingArchive, setDeletingArchive] = useState(null);

  // Daten laden
  const { data: archives = [] } = useQuery({
    queryKey: ['archives'],
    queryFn: () => base44.entities.Archive.list('-created_date'),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: clubRequests = [] } = useQuery({
    queryKey: ['clubRequests'],
    queryFn: () => base44.entities.ClubRequest.list('-created_date'),
  });

  const playerArchives = archives.filter(a => a.type === 'player');
  const clubArchives = archives.filter(a => a.type === 'club');

  // Mutations
  const unarchivePlayerMutation = useMutation({
    mutationFn: (playerId) => base44.entities.Player.update(playerId, { archive_id: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setUnarchivingItem(null);
      setSelectedArchive(null);
    },
  });

  const unarchiveClubRequestMutation = useMutation({
    mutationFn: (requestId) => base44.entities.ClubRequest.update(requestId, { archive_id: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubRequests'] });
      setUnarchivingItem(null);
      setSelectedArchive(null);
    },
  });

  const deleteArchiveMutation = useMutation({
    mutationFn: async (archiveId) => {
      const archive = archives.find(a => a.id === archiveId);
      
      if (archive.type === 'player') {
        const archivedPlayers = players.filter(p => p.archive_id === archiveId);
        await Promise.all(archivedPlayers.map(p => base44.entities.Player.delete(p.id)));
      } else {
        const archivedRequests = clubRequests.filter(r => r.archive_id === archiveId);
        await Promise.all(archivedRequests.map(r => base44.entities.ClubRequest.delete(r.id)));
      }
      
      await base44.entities.Archive.delete(archiveId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['clubRequests'] });
      setDeletingArchive(null);
      setSelectedArchive(null);
    },
  });

  const getArchivedPlayers = (archiveId) => {
    return players.filter(p => p.archive_id === archiveId);
  };

  const getArchivedClubRequests = (archiveId) => {
    return clubRequests.filter(r => r.archive_id === archiveId);
  };

  const handleUnarchive = (item, type) => {
    if (type === 'player') {
      unarchivePlayerMutation.mutate(item.id);
    } else {
      unarchiveClubRequestMutation.mutate(item.id);
    }
  };

  const handleViewDetail = (item, type) => {
    if (type === 'player') {
      navigate(createPageUrl("PlayerDetail") + "?id=" + item.id + "&back=" + encodeURIComponent(window.location.pathname));
    } else {
      navigate(createPageUrl("ClubRequestDetail") + "?id=" + item.id + "&back=" + encodeURIComponent(window.location.pathname));
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Archive</h1>
            <p className="text-slate-600 mt-1">
              {playerArchives.length} Spieler-Archive • {clubArchives.length} Vereinsanfragen-Archive
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="player" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Spieler-Archive ({playerArchives.length})
            </TabsTrigger>
            <TabsTrigger value="club" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Vereinsanfragen-Archive ({clubArchives.length})
            </TabsTrigger>
          </TabsList>

          {/* Spieler Archive */}
          <TabsContent value="player" className="space-y-4 mt-6">
            {playerArchives.length === 0 ? (
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-8 text-center">
                  <ArchiveIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Keine Spieler-Archive vorhanden</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {playerArchives.map(archive => {
                  const archivedPlayers = getArchivedPlayers(archive.id);
                  return (
                    <Card 
                      key={archive.id} 
                      className="border-slate-200 bg-white hover:shadow-md cursor-pointer transition-all"
                      onClick={() => setSelectedArchive({ ...archive, items: archivedPlayers, type: 'player' })}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FolderOpen className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{archive.name}</CardTitle>
                              <p className="text-sm text-slate-500 mt-1">
                                {format(new Date(archive.created_date), "dd.MM.yyyy", { locale: de })}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {archivedPlayers.length}
                          </Badge>
                        </div>
                      </CardHeader>
                      {archive.description && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-slate-600">{archive.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Vereinsanfragen Archive */}
          <TabsContent value="club" className="space-y-4 mt-6">
            {clubArchives.length === 0 ? (
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-8 text-center">
                  <ArchiveIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Keine Vereinsanfragen-Archive vorhanden</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {clubArchives.map(archive => {
                  const archivedRequests = getArchivedClubRequests(archive.id);
                  return (
                    <Card 
                      key={archive.id} 
                      className="border-slate-200 bg-white hover:shadow-md cursor-pointer transition-all"
                      onClick={() => setSelectedArchive({ ...archive, items: archivedRequests, type: 'club' })}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <FolderOpen className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{archive.name}</CardTitle>
                              <p className="text-sm text-slate-500 mt-1">
                                {format(new Date(archive.created_date), "dd.MM.yyyy", { locale: de })}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {archivedRequests.length}
                          </Badge>
                        </div>
                      </CardHeader>
                      {archive.description && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-slate-600">{archive.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Archive Detail Dialog */}
      <Dialog open={!!selectedArchive} onOpenChange={() => setSelectedArchive(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedArchive && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{selectedArchive.name}</DialogTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingArchive(selectedArchive)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Archiv löschen
                  </Button>
                </div>
                {selectedArchive.description && (
                  <p className="text-sm text-slate-600">{selectedArchive.description}</p>
                )}
              </DialogHeader>

              <div className="space-y-3 py-4">
                {selectedArchive.items.length === 0 ? (
                  <div className="text-center py-8">
                    <ArchiveIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">Keine Einträge in diesem Archiv</p>
                  </div>
                ) : (
                  selectedArchive.items.map(item => (
                    <Card key={item.id} className="border-slate-200 bg-white">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-slate-900">
                                {selectedArchive.type === 'player' ? item.name : item.club_name}
                              </h3>
                              {item.status && (
                                <Badge variant="secondary" className={statusColors[item.status] + " border text-xs"}>
                                  {item.status.replace(/_/g, ' ')}
                                </Badge>
                              )}
                            </div>
                            
                            {selectedArchive.type === 'player' ? (
                              <div className="flex items-center gap-4 text-sm text-slate-600">
                                <span>{item.position}</span>
                                {item.current_club && <span>• {item.current_club}</span>}
                                {item.age && <span>• {item.age} Jahre</span>}
                              </div>
                            ) : (
                              <div className="flex items-center gap-4 text-sm text-slate-600">
                                <span>{item.position_needed}</span>
                                {item.country && <span>• {item.country}</span>}
                                {item.league && <span>• {item.league}</span>}
                              </div>
                            )}

                            {item.notes && (
                              <p className="text-sm text-slate-500 mt-2 line-clamp-2">{item.notes}</p>
                            )}

                            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              Archiviert: {format(new Date(item.updated_date), "dd.MM.yyyy", { locale: de })}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetail(item, selectedArchive.type)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUnarchivingItem({ item, type: selectedArchive.type })}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Undo2 className="w-4 h-4 mr-1" />
                              Wiederherstellen
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Unarchive Confirmation */}
      <AlertDialog open={!!unarchivingItem} onOpenChange={() => setUnarchivingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aus Archiv wiederherstellen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie "{unarchivingItem?.item?.name || unarchivingItem?.item?.club_name}" aus dem Archiv wiederherstellen?
              Der Eintrag wird wieder in der normalen Ansicht angezeigt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleUnarchive(unarchivingItem.item, unarchivingItem.type)}
              className="bg-blue-900 hover:bg-blue-800"
            >
              Wiederherstellen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Archive Confirmation */}
      <AlertDialog open={!!deletingArchive} onOpenChange={() => setDeletingArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiv löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie das Archiv "{deletingArchive?.name}" wirklich löschen? 
              <br /><br />
              <strong className="text-red-600">Achtung: Alle {deletingArchive?.items?.length || 0} Einträge in diesem Archiv werden dauerhaft gelöscht!</strong>
              <br />
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteArchiveMutation.mutate(deletingArchive.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Archiv und alle Einträge löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}