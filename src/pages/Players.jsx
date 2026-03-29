import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, ExternalLink, Calendar, TrendingUp, Users as UsersIcon, Star, MessageCircle, IdCard, Download, GitCompare, Grid3x3, List, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInYears } from "date-fns";
import { de } from "date-fns/locale";
import SecondaryPositionsEditor from "../components/players/SecondaryPositionsEditor";
import TemplateManager from "../components/templates/TemplateManager";
import DataExtractor from "../components/ai/DataExtractor";
import PlayerComparisonTool from "../components/players/PlayerComparisonTool";
import PlayersTableView from "../components/players/PlayersTableView";
import PlayerBoxesView from "../components/players/PlayerBoxesView";

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  return differenceInYears(new Date(), new Date(dateOfBirth));
};

const categoryColors = {
  "Wintertransferperiode": "bg-blue-100 text-blue-800 border-blue-200",
  "Sommertransferperiode": "bg-orange-100 text-orange-800 border-orange-200",
  "Zukunft": "bg-purple-100 text-purple-800 border-purple-200",
  "Beobachtungsliste": "bg-slate-100 text-slate-800 border-slate-200",
  "Top-Priorität": "bg-red-100 text-red-800 border-red-200",
  "Vertragsende": "bg-green-100 text-green-800 border-green-200",
};

export default function Players() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState(urlParams.get('search') || "");
  const [filterCategory, setFilterCategory] = useState(urlParams.get('category') || "alle");
  const [filterPosition, setFilterPosition] = useState(urlParams.get('position') || "alle");
  const [filterStatus, setFilterStatus] = useState(urlParams.get('status') || "alle");
  const [filterFavorites, setFilterFavorites] = useState(urlParams.get('favorites') || "alle");
  const [filterHasMatches, setFilterHasMatches] = useState(urlParams.get('hasMatches') || "alle");
  const [filterArchive, setFilterArchive] = useState(urlParams.get('archive') || "active");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveAction, setArchiveAction] = useState(null);
  const [newArchiveName, setNewArchiveName] = useState("");
  const [showManageArchivesDialog, setShowManageArchivesDialog] = useState(false);
  const [editingArchive, setEditingArchive] = useState(null);
  const [archiveToDelete, setArchiveToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [showComparisonTool, setShowComparisonTool] = useState(false);
  const [displayMode, setDisplayMode] = useState(urlParams.get('display') || 'grid');

  // Restore scroll position on mount
  React.useEffect(() => {
    const scrollY = urlParams.get('scrollY');
    if (scrollY) {
      setTimeout(() => window.scrollTo(0, parseInt(scrollY)), 100);
    }
  }, []);

  const [newPlayer, setNewPlayer] = useState({
    name: "",
    date_of_birth: "",
    age: "",
    nationality: "",
    position: "",
    secondary_positions: [],
    current_club: "",
    market_value: "",
    contract_until: "",
    transfermarkt_url: "",
    category: "Beobachtungsliste",
    potential_clubs: [],
    notes: "",
    status: "aktiv",
    strengths: "",
    foot: "",
    height: "",
    has_player_card: false,
    });

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const all = await base44.entities.Player.list('-created_date');
      return all.filter(p => p.agency_id === user.agency_id);
    },
    refetchInterval: 3000,
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ['playerComments'],
    queryFn: () => base44.entities.PlayerComment.list(),
    refetchInterval: 5000,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    refetchInterval: 10000,
  });

  const { data: archives = [] } = useQuery({
    queryKey: ['archives', 'player'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const allArchives = await base44.entities.Archive.list();
      return allArchives.filter(a => a.type === 'player' && a.agency_id === user.agency_id);
    },
    refetchInterval: 5000,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (playerId) => {
      const favorites = currentUser?.favorite_players || [];
      const newFavorites = favorites.includes(playerId)
        ? favorites.filter(id => id !== playerId)
        : [...favorites, playerId];
      await base44.auth.updateMe({ favorite_players: newFavorites });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const createArchiveMutation = useMutation({
    mutationFn: async (archiveData) => {
      const user = await base44.auth.me();
      return base44.entities.Archive.create({ ...archiveData, agency_id: user.agency_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
    },
  });

  const archivePlayersMutation = useMutation({
    mutationFn: async ({ playerIds, archiveId }) => {
      await Promise.all(
        playerIds.map(id => base44.entities.Player.update(id, { archive_id: archiveId }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setSelectionMode(false);
      setSelectedPlayers(new Set());
      setShowArchiveDialog(false);
    },
  });

  const unarchivePlayersMutation = useMutation({
    mutationFn: async (playerIds) => {
      await Promise.all(
        playerIds.map(id => base44.entities.Player.update(id, { archive_id: null }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setSelectionMode(false);
      setSelectedPlayers(new Set());
    },
  });

  const updateArchiveMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Archive.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      setEditingArchive(null);
    },
  });

  const deleteArchiveMutation = useMutation({
    mutationFn: async (archiveId) => {
      // Alle Spieler aus diesem Archiv löschen
      const playersInArchive = players.filter(p => p.archive_id === archiveId);
      await Promise.all(
        playersInArchive.map(p => base44.entities.Player.delete(p.id))
      );
      // Dann das Archiv löschen
      await base44.entities.Archive.delete(archiveId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setArchiveToDelete(null);
      setDeleteConfirmationText("");
      setShowManageArchivesDialog(false);
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: (playerData) => base44.entities.Player.create(playerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setShowCreateDialog(false);
      setNewPlayer({
        name: "",
        date_of_birth: "",
        age: "",
        nationality: "",
        position: "",
        secondary_positions: [],
        current_club: "",
        market_value: "",
        contract_until: "",
        transfermarkt_url: "",
        category: "Beobachtungsliste",
        potential_clubs: [],
        notes: "",
        status: "noch_offen",
        strengths: "",
        foot: "",
        height: "",
      });
    },
  });

  const handleCreatePlayer = async () => {
    const user = await base44.auth.me();
    const playerData = {
      agency_id: user.agency_id,
      name: newPlayer.name,
      position: newPlayer.position,
      secondary_positions: Array.isArray(newPlayer.secondary_positions) ? newPlayer.secondary_positions : [],
      date_of_birth: newPlayer.date_of_birth || undefined,
      age: newPlayer.date_of_birth ? calculateAge(newPlayer.date_of_birth) : undefined,
      nationality: newPlayer.nationality || undefined,
      current_club: newPlayer.current_club || undefined,
      market_value: newPlayer.market_value ? parseFloat(newPlayer.market_value) : undefined,
      contract_until: newPlayer.contract_until || undefined,
      transfermarkt_url: newPlayer.transfermarkt_url || undefined,
      category: newPlayer.category,
      potential_clubs: newPlayer.potential_clubs,
      notes: newPlayer.notes || undefined,
      status: newPlayer.status,
      strengths: newPlayer.strengths || undefined,
      foot: newPlayer.foot || undefined,
      height: newPlayer.height ? parseFloat(newPlayer.height) : undefined,
    };
    
    createPlayerMutation.mutate(playerData);
  };

  const userFavorites = currentUser?.favorite_players || [];

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterCategory !== 'alle') params.set('category', filterCategory);
    if (filterPosition !== 'alle') params.set('position', filterPosition);
    if (filterStatus !== 'alle') params.set('status', filterStatus);
    if (filterFavorites !== 'alle') params.set('favorites', filterFavorites);
    if (filterHasMatches !== 'alle') params.set('hasMatches', filterHasMatches);
    if (filterArchive !== 'active') params.set('archive', filterArchive);
    if (displayMode !== 'grid') params.set('display', displayMode);

    const newSearch = params.toString();
    const currentSearch = window.location.search.slice(1);

    if (newSearch !== currentSearch) {
      window.history.replaceState(null, '', `?${newSearch}`);
    }
  }, [searchTerm, filterCategory, filterPosition, filterStatus, filterFavorites, filterHasMatches, filterArchive, displayMode]);

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.current_club?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "alle" || player.category === filterCategory;
    const matchesPosition = filterPosition === "alle" || player.position === filterPosition;
    const matchesStatus = filterStatus === "alle" || player.status === filterStatus;
    // Bei Favoriten-Filter: nur nicht-archivierte Spieler anzeigen
    const matchesFavorites = filterFavorites === "alle" || 
                            (filterFavorites === "favoriten" && userFavorites.includes(player.id) && !player.archive_id);
    const matchesHasMatches = filterHasMatches === "alle" || 
                             (filterHasMatches === "mit_matches" && Array.isArray(player.favorite_matches) && player.favorite_matches.length > 0) ||
                             (filterHasMatches === "ohne_matches" && (!Array.isArray(player.favorite_matches) || player.favorite_matches.length === 0));
    
    const matchesArchive = filterArchive === "active" ? !player.archive_id :
                          filterArchive === "alle_archiviert" ? !!player.archive_id :
                          player.archive_id === filterArchive;

    return matchesSearch && matchesCategory && matchesPosition && matchesStatus && matchesFavorites && matchesHasMatches && matchesArchive;
  });

  const activePlayers = players.filter(p => !p.archive_id);
  const stats = [
    { label: "Aktiv", value: activePlayers.length },
    { label: "Wintertransfer", value: activePlayers.filter(p => p.category === "Wintertransferperiode").length },
    { label: "Sommertransfer", value: activePlayers.filter(p => p.category === "Sommertransferperiode").length },
    { label: "Archiviert", value: players.filter(p => !!p.archive_id).length },
  ];

  const handleArchiveSelected = async (archiveId) => {
    if (archiveId === 'new') {
      setArchiveAction('create');
      setShowArchiveDialog(true);
    } else {
      await archivePlayersMutation.mutateAsync({
        playerIds: Array.from(selectedPlayers),
        archiveId
      });
    }
  };

  const handleCreateAndArchive = async () => {
    if (!newArchiveName) return;
    const archive = await createArchiveMutation.mutateAsync({
      name: newArchiveName,
      type: 'player'
    });
    await archivePlayersMutation.mutateAsync({
      playerIds: Array.from(selectedPlayers),
      archiveId: archive.id
    });
    setNewArchiveName("");
  };

  const handleUnarchiveSelected = async () => {
    await unarchivePlayersMutation.mutateAsync(Array.from(selectedPlayers));
  };

  const togglePlayerSelection = (playerId) => {
    const newSelection = new Set(selectedPlayers);
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId);
    } else {
      newSelection.add(playerId);
    }
    setSelectedPlayers(newSelection);
  };

  const escapeCsvField = (field) => {
    if (field == null) return '';
    const str = String(field);
    // Escape Anführungszeichen und wrappe Feld wenn nötig
    if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const exportFavoritePlayers = () => {
    const favoritePlayers = players.filter(p => userFavorites.includes(p.id));
    
    // Kommentare für jeden Spieler sammeln
    const playerComments = {};
    favoritePlayers.forEach(p => {
      const comments = allComments.filter(c => c.player_id === p.id);
      playerComments[p.id] = comments.map(c => 
        `${c.created_by} (${format(new Date(c.created_date), "dd.MM.yyyy")}): ${c.content}`
      ).join(' | ');
    });
    
    const headers = ['Name', 'Position', 'Nebenpositionen', 'Alter', 'Nationalität', 'Aktueller Verein', 'Marktwert', 'Vertrag bis', 'Kategorie', 'Status', 'Stärken', 'Notizen', 'Kommentare'];
    
    const rows = favoritePlayers.map(p => [
      escapeCsvField(p.name),
      escapeCsvField(p.position),
      escapeCsvField(Array.isArray(p.secondary_positions) ? p.secondary_positions.join(', ') : ''),
      escapeCsvField(calculateAge(p.date_of_birth) || ''),
      escapeCsvField(p.nationality || ''),
      escapeCsvField(p.current_club || ''),
      escapeCsvField(p.market_value ? (p.market_value / 1000000).toFixed(2) + 'M €' : ''),
      escapeCsvField(p.contract_until ? format(new Date(p.contract_until), "MM/yyyy") : ''),
      escapeCsvField(p.category || ''),
      escapeCsvField(p.status?.replace(/_/g, ' ') || ''),
      escapeCsvField(p.strengths || ''),
      escapeCsvField(p.notes || ''),
      escapeCsvField(playerComments[p.id] || '')
    ].join(';'));
    
    const csvData = [headers.join(';'), ...rows].join('\n');
    
    const blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Favorisierte_Spieler_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Spielerverwaltung</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {filteredPlayers.length} Spieler {selectionMode && `(${selectedPlayers.size} ausgewählt)`}
            </p>
          </div>
          <div className="flex gap-2">
            {!selectionMode ? (
              <>
                <Button 
                  onClick={() => setShowComparisonTool(true)}
                  variant="outline"
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Vergleichen
                </Button>
                <Button 
                  onClick={() => setShowManageArchivesDialog(true)}
                  variant="outline"
                >
                  Archive verwalten
                </Button>
                <Button 
                  onClick={() => setSelectionMode(true)}
                  variant="outline"
                >
                  Mehrfachauswahl
                </Button>
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-blue-900 hover:bg-blue-800 shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Spieler hinzufügen
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedPlayers(new Set());
                  }}
                  variant="outline"
                >
                  Abbrechen
                </Button>
                {selectedPlayers.size > 0 && (
                  <>
                    {filterArchive === "active" ? (
                      <Select onValueChange={handleArchiveSelected}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Archivieren..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">+ Neues Archiv</SelectItem>
                          {archives.map(archive => (
                            <SelectItem key={archive.id} value={archive.id}>
                              {archive.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button 
                        onClick={handleUnarchiveSelected}
                        className="bg-blue-900 hover:bg-blue-800"
                      >
                        Entarchivieren
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Tabs value={filterFavorites} onValueChange={setFilterFavorites}>
              <TabsList className="bg-slate-100">
                <TabsTrigger value="alle">Alle</TabsTrigger>
                <TabsTrigger value="favoriten" className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Favoriten ({userFavorites.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {filterFavorites === "favoriten" && userFavorites.length > 0 && (
              <Button
                onClick={exportFavoritePlayers}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Spieler oder Verein suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <Button
                variant={displayMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayMode('grid')}
                className={displayMode === 'grid' ? 'bg-white shadow-sm' : ''}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={displayMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayMode('table')}
                className={displayMode === 'table' ? 'bg-white shadow-sm' : ''}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={displayMode === 'boxes' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayMode('boxes')}
                className={displayMode === 'boxes' ? 'bg-white shadow-sm' : ''}
                title="Boxen-Ansicht"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Tabs value={filterCategory} onValueChange={setFilterCategory}>
            <TabsList className="bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="alle">Alle</TabsTrigger>
              <TabsTrigger value="Wintertransferperiode">Winter</TabsTrigger>
              <TabsTrigger value="Sommertransferperiode">Sommer</TabsTrigger>
              <TabsTrigger value="Top-Priorität">Top-Priorität</TabsTrigger>
              <TabsTrigger value="Beobachtungsliste">Beobachtung</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={filterPosition} onValueChange={setFilterPosition}>
            <SelectTrigger className="w-[200px] border-slate-200">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Positionen</SelectItem>
              <SelectGroup>
                <SelectLabel>Torwart</SelectLabel>
                <SelectItem value="Torwart">Torwart</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Verteidigung</SelectLabel>
                <SelectItem value="Innenverteidiger">Innenverteidiger</SelectItem>
                <SelectItem value="Außenverteidiger">Außenverteidiger (beide Seiten)</SelectItem>
                <SelectItem value="Linker Außenverteidiger">Linker Außenverteidiger</SelectItem>
                <SelectItem value="Rechter Außenverteidiger">Rechter Außenverteidiger</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Mittelfeld</SelectLabel>
                <SelectItem value="Defensives Mittelfeld">Defensives Mittelfeld</SelectItem>
                <SelectItem value="Mittelfeld">Mittelfeld (beide Seiten)</SelectItem>
                <SelectItem value="Linkes Mittelfeld">Linkes Mittelfeld</SelectItem>
                <SelectItem value="Zentrales Mittelfeld">Zentrales Mittelfeld</SelectItem>
                <SelectItem value="Rechtes Mittelfeld">Rechtes Mittelfeld</SelectItem>
                <SelectItem value="Offensives Mittelfeld">Offensives Mittelfeld</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Angriff</SelectLabel>
                <SelectItem value="Flügelspieler">Flügelspieler (beide Seiten)</SelectItem>
                <SelectItem value="Linksaußen">Linksaußen</SelectItem>
                <SelectItem value="Rechtsaußen">Rechtsaußen</SelectItem>
                <SelectItem value="Stürmer">Stürmer</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[200px] border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Status</SelectItem>
              <SelectItem value="noch_offen">Noch offen</SelectItem>
              <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
              <SelectItem value="bei_verein_angeboten">Bei Verein angeboten</SelectItem>
              <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterHasMatches} onValueChange={setFilterHasMatches}>
            <SelectTrigger className="w-[200px] border-slate-200">
              <SelectValue placeholder="Favorisierte Matches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Spieler</SelectItem>
              <SelectItem value="mit_matches">Mit favorisierten Matches</SelectItem>
              <SelectItem value="ohne_matches">Ohne favorisierte Matches</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterArchive} onValueChange={setFilterArchive}>
            <SelectTrigger className="w-[200px] border-slate-200">
              <SelectValue placeholder="Archiv" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktive Spieler</SelectItem>
              <SelectItem value="alle_archiviert">Alle Archivierten</SelectItem>
              {archives.map(archive => (
                <SelectItem key={archive.id} value={archive.id}>
                  📁 {archive.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>

        {displayMode === 'boxes' ? (
          <PlayerBoxesView players={players.filter(p => !p.archive_id)} />
        ) : displayMode === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredPlayers.map(player => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card 
                  className={`hover:shadow-md transition-all duration-200 border bg-white dark:bg-slate-900 relative ${
                    selectionMode && selectedPlayers.has(player.id) 
                      ? 'border-blue-500 ring-2 ring-blue-200' 
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {selectionMode ? (
                    <div className="absolute top-3 right-3 z-10">
                      <input
                        type="checkbox"
                        checked={selectedPlayers.has(player.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          togglePlayerSelection(player.id);
                        }}
                        className="w-5 h-5 rounded border-slate-300"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteMutation.mutate(player.id);
                      }}
                      className="absolute top-3 right-3 z-10 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Star 
                        className={`w-5 h-5 ${userFavorites.includes(player.id) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`}
                      />
                    </button>
                  )}
                  <div onClick={() => {
                    if (selectionMode) {
                      togglePlayerSelection(player.id);
                      return;
                    }
                    const params = new URLSearchParams();
                    if (searchTerm) params.set('search', searchTerm);
                    if (filterCategory !== 'alle') params.set('category', filterCategory);
                    if (filterPosition !== 'alle') params.set('position', filterPosition);
                    if (filterStatus !== 'alle') params.set('status', filterStatus);
                    if (filterFavorites !== 'alle') params.set('favorites', filterFavorites);
                    if (filterHasMatches !== 'alle') params.set('hasMatches', filterHasMatches);
                    if (filterArchive !== 'active') params.set('archive', filterArchive);
                    params.set('scrollY', window.scrollY.toString());
                    navigate(createPageUrl("PlayerDetail") + "?id=" + player.id + "&back=" + encodeURIComponent(window.location.pathname + "?" + params.toString()));
                    }} className={selectionMode ? "cursor-pointer" : "cursor-pointer"}>
                  <CardHeader className="pb-3">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white">{player.name}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{player.current_club}</p>
                        </div>
                        {player.transfermarkt_url && (
                          <a
                            href={player.transfermarkt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-slate-500" />
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className={categoryColors[player.category] + " border"}>
                          {player.category}
                        </Badge>
                        <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-900 font-semibold">
                          {player.position}
                        </Badge>
                        {Array.isArray(player.secondary_positions) && player.secondary_positions.map((pos) => (
                          <Badge key={pos} variant="outline" className="border-slate-200 text-xs">
                            {pos}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="border-slate-200 text-xs">
                          {player.status?.replace(/_/g, ' ') || 'noch offen'}
                        </Badge>
                        {player.has_player_card && (
                          <Badge className="bg-green-600 text-white text-xs flex items-center gap-1">
                            <IdCard className="w-3 h-3" />
                            Player Card
                          </Badge>
                        )}
                        </div>
                        </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Alter</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{calculateAge(player.date_of_birth) || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Nationalität</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{player.nationality || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Marktwert</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {player.market_value ? `${(player.market_value / 1000000).toFixed(2).replace(/\.?0+$/, '')}M €` : '-'}
                        </p>
                      </div>
                      <div>
                       <p className="text-slate-600 dark:text-slate-400">Vertrag bis</p>
                       <p className="font-semibold text-slate-900 dark:text-white">
                         {player.contract_until ? format(new Date(player.contract_until), "MM/yyyy") : '-'}
                       </p>
                      </div>
                      </div>
                      {allComments.filter(c => c.player_id === player.id).length > 0 && (
                      <div className="flex items-center justify-end gap-1 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                       <MessageCircle className="w-4 h-4 text-red-500" />
                       <span className="text-sm font-semibold text-red-600">
                         {allComments.filter(c => c.player_id === player.id).length}
                       </span>
                       <span className="text-xs text-slate-500">Kommentare</span>
                      </div>
                      )}
                      </CardContent>
                      </div>
                      </Card>
                    </motion.div>
            ))}
          </AnimatePresence>
          </div>
        ) : (
          <PlayersTableView players={filteredPlayers} />
        )}

        {filteredPlayers.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <UsersIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 text-lg">Keine Spieler gefunden</p>
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold">Neuen Spieler hinzufügen</DialogTitle>
                <div className="flex gap-2">
                  <TemplateManager 
                    templateType="player"
                    onSelectTemplate={(data) => setNewPlayer({...newPlayer, ...data})}
                  />
                  <DataExtractor 
                    onDataExtracted={(data) => setNewPlayer({...newPlayer, ...data})}
                  />
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newPlayer.name}
                    onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                    placeholder="z.B. Max Mustermann"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="date_of_birth">Geburtsdatum</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={newPlayer.date_of_birth}
                    onChange={(e) => setNewPlayer({...newPlayer, date_of_birth: e.target.value})}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="nationality">Nationalität</Label>
                  <Input
                    id="nationality"
                    value={newPlayer.nationality}
                    onChange={(e) => setNewPlayer({...newPlayer, nationality: e.target.value})}
                    placeholder="z.B. Deutschland"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="position">Hauptposition *</Label>
                  <Select value={newPlayer.position} onValueChange={(value) => setNewPlayer({...newPlayer, position: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Torwart</SelectLabel>
                        <SelectItem value="Torwart">Torwart</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Verteidigung</SelectLabel>
                        <SelectItem value="Innenverteidiger">Innenverteidiger</SelectItem>
                        <SelectItem value="Außenverteidiger">Außenverteidiger (beide Seiten)</SelectItem>
                        <SelectItem value="Linker Außenverteidiger">Linker Außenverteidiger</SelectItem>
                        <SelectItem value="Rechter Außenverteidiger">Rechter Außenverteidiger</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Mittelfeld</SelectLabel>
                        <SelectItem value="Defensives Mittelfeld">Defensives Mittelfeld</SelectItem>
                        <SelectItem value="Mittelfeld">Mittelfeld (beide Seiten)</SelectItem>
                        <SelectItem value="Linkes Mittelfeld">Linkes Mittelfeld</SelectItem>
                        <SelectItem value="Zentrales Mittelfeld">Zentrales Mittelfeld</SelectItem>
                        <SelectItem value="Rechtes Mittelfeld">Rechtes Mittelfeld</SelectItem>
                        <SelectItem value="Offensives Mittelfeld">Offensives Mittelfeld</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Angriff</SelectLabel>
                        <SelectItem value="Flügelspieler">Flügelspieler (beide Seiten)</SelectItem>
                        <SelectItem value="Linksaußen">Linksaußen</SelectItem>
                        <SelectItem value="Rechtsaußen">Rechtsaußen</SelectItem>
                        <SelectItem value="Stürmer">Stürmer</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <SecondaryPositionsEditor
                    mainPosition={newPlayer.position}
                    secondaryPositions={newPlayer.secondary_positions}
                    onChange={(positions) => setNewPlayer({...newPlayer, secondary_positions: positions})}
                  />
                </div>

                <div>
                  <Label htmlFor="current_club">Aktueller Verein</Label>
                  <Input
                    id="current_club"
                    value={newPlayer.current_club}
                    onChange={(e) => setNewPlayer({...newPlayer, current_club: e.target.value})}
                    placeholder="z.B. FC Bayern München"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="market_value">Marktwert (€)</Label>
                  <Input
                    id="market_value"
                    type="number"
                    value={newPlayer.market_value}
                    onChange={(e) => setNewPlayer({...newPlayer, market_value: e.target.value})}
                    placeholder="5000000"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="contract_until">Vertrag bis</Label>
                  <Input
                    id="contract_until"
                    type="date"
                    value={newPlayer.contract_until}
                    onChange={(e) => setNewPlayer({...newPlayer, contract_until: e.target.value})}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="foot">Starker Fuß</Label>
                  <Select value={newPlayer.foot} onValueChange={(value) => setNewPlayer({...newPlayer, foot: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rechts">Rechts</SelectItem>
                      <SelectItem value="links">Links</SelectItem>
                      <SelectItem value="beidfüßig">Beidfüßig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="height">Größe (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={newPlayer.height}
                    onChange={(e) => setNewPlayer({...newPlayer, height: e.target.value})}
                    placeholder="185"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Kategorie</Label>
                  <Select value={newPlayer.category} onValueChange={(value) => setNewPlayer({...newPlayer, category: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Wintertransferperiode">Wintertransferperiode</SelectItem>
                      <SelectItem value="Sommertransferperiode">Sommertransferperiode</SelectItem>
                      <SelectItem value="Zukunft">Zukunft</SelectItem>
                      <SelectItem value="Beobachtungsliste">Beobachtungsliste</SelectItem>
                      <SelectItem value="Top-Priorität">Top-Priorität</SelectItem>
                      <SelectItem value="Vertragsende">Vertragsende</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="transfermarkt_url">Transfermarkt.de Link</Label>
                  <Input
                    id="transfermarkt_url"
                    value={newPlayer.transfermarkt_url}
                    onChange={(e) => setNewPlayer({...newPlayer, transfermarkt_url: e.target.value})}
                    placeholder="https://www.transfermarkt.de/..."
                    className="mt-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="strengths">Stärken</Label>
                  <Textarea
                    id="strengths"
                    value={newPlayer.strengths}
                    onChange={(e) => setNewPlayer({...newPlayer, strengths: e.target.value})}
                    placeholder="z.B. Schnelligkeit, Technik, Kopfballstärke..."
                    className="mt-1.5 h-20"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea
                    id="notes"
                    value={newPlayer.notes}
                    onChange={(e) => setNewPlayer({...newPlayer, notes: e.target.value})}
                    placeholder="Weitere Informationen..."
                    className="mt-1.5 h-20"
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="has_player_card"
                      checked={newPlayer.has_player_card}
                      onChange={(e) => setNewPlayer({...newPlayer, has_player_card: e.target.checked})}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="has_player_card" className="cursor-pointer flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-green-600" />
                      Player Card vorhanden
                    </Label>
                  </div>
                </div>
                </div>
                </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleCreatePlayer}
                disabled={!newPlayer.name || !newPlayer.position || createPlayerMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {createPlayerMutation.isPending ? "Wird hinzugefügt..." : "Spieler hinzufügen"}
              </Button>
            </div>
          </DialogContent>
          </Dialog>

          {/* Archive Dialog */}
          <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neues Archiv erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="archive_name">Archivname *</Label>
                  <Input
                    id="archive_name"
                    value={newArchiveName}
                    onChange={(e) => setNewArchiveName(e.target.value)}
                    placeholder="z.B. Saison 2024/25 - Abgeschlossen"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleCreateAndArchive}
                  disabled={!newArchiveName}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  Erstellen und Archivieren
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showManageArchivesDialog} onOpenChange={setShowManageArchivesDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Archive verwalten</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
                {archives.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Keine Archive vorhanden
                  </p>
                ) : (
                  archives.map(archive => {
                    const playersInArchive = players.filter(p => p.archive_id === archive.id);
                    const isEditing = editingArchive?.id === archive.id;

                    return (
                      <div key={archive.id} className="border border-slate-200 rounded-lg p-4">
                        {isEditing ? (
                          <div className="space-y-3">
                            <Input
                              value={editingArchive.name}
                              onChange={(e) => setEditingArchive({...editingArchive, name: e.target.value})}
                              placeholder="Archivname"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingArchive(null)}
                              >
                                Abbrechen
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  updateArchiveMutation.mutate({
                                    id: archive.id,
                                    data: { name: editingArchive.name }
                                  });
                                }}
                                className="bg-blue-900 hover:bg-blue-800"
                              >
                                Speichern
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900">📁 {archive.name}</h4>
                              <p className="text-sm text-slate-600 mt-1">
                                {playersInArchive.length} Spieler
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingArchive(archive)}
                              >
                                Umbenennen
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setArchiveToDelete(archive)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                Löschen
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!archiveToDelete} onOpenChange={() => {
            setArchiveToDelete(null);
            setDeleteConfirmationText("");
          }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-600">⚠️ Archiv unwiderruflich löschen?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p className="font-semibold">
                    ACHTUNG: Diese Aktion kann nicht rückgängig gemacht werden!
                  </p>
                  <p>
                    Alle <strong>{players.filter(p => p.archive_id === archiveToDelete?.id).length} Spieler</strong> in 
                    diesem Archiv werden <strong className="text-red-600">unwiderruflich gelöscht</strong>.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded p-3 mt-3">
                    <p className="text-sm text-red-800 mb-2">
                      Zum Bestätigen geben Sie bitte den Archivnamen ein:
                    </p>
                    <p className="font-mono font-semibold text-red-900 mb-2">
                      {archiveToDelete?.name}
                    </p>
                    <Input
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                      placeholder="Archivnamen hier eingeben"
                      className="border-red-300 focus:border-red-500"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmationText("")}>
                  Abbrechen
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteArchiveMutation.mutate(archiveToDelete.id)}
                  disabled={deleteConfirmationText !== archiveToDelete?.name}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Unwiderruflich löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <PlayerComparisonTool 
            open={showComparisonTool}
            onOpenChange={setShowComparisonTool}
            initialPlayerIds={[]}
          />
          </div>
          </div>
          );
          }