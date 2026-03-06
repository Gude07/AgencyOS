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
import { Plus, Search, Building2, Mail, Phone, ChevronRight, Star, SlidersHorizontal, X, User, MessageCircle, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const priorityColors = {
  niedrig: "bg-emerald-100 text-emerald-800 border-emerald-200",
  mittel: "bg-yellow-100 text-yellow-800 border-yellow-200",
  hoch: "bg-orange-100 text-orange-800 border-orange-200",
  dringend: "bg-red-100 text-red-800 border-red-200",
};

const statusColors = {
  offen: "bg-slate-100 text-slate-800 border-slate-200",
  in_bearbeitung: "bg-blue-100 text-blue-800 border-blue-200",
  angebote_gesendet: "bg-purple-100 text-purple-800 border-purple-200",
  abgeschlossen: "bg-green-100 text-green-800 border-green-200",
  abgelehnt: "bg-red-100 text-red-800 border-red-200",
};

export default function ClubRequests() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState(urlParams.get('search') || "");
  const [searchRequirements, setSearchRequirements] = useState(urlParams.get('searchRequirements') || "");
  const [filterStatus, setFilterStatus] = useState(urlParams.get('status') || "alle");
  const [filterFavorites, setFilterFavorites] = useState(urlParams.get('favorites') || "alle");
  const [filterPriority, setFilterPriority] = useState(urlParams.get('priority') || "alle");
  const [filterCountry, setFilterCountry] = useState(urlParams.get('country') || "alle");
  const [filterPosition, setFilterPosition] = useState(urlParams.get('position') || "alle");
  const [filterShortlist, setFilterShortlist] = useState(urlParams.get('shortlist') || "alle");
  const [filterBudgetMin, setFilterBudgetMin] = useState(urlParams.get('budgetMin') || "");
  const [filterBudgetMax, setFilterBudgetMax] = useState(urlParams.get('budgetMax') || "");
  const [filterSalaryMin, setFilterSalaryMin] = useState(urlParams.get('salaryMin') || "");
  const [filterSalaryMax, setFilterSalaryMax] = useState(urlParams.get('salaryMax') || "");
  const [filterTransferPeriod, setFilterTransferPeriod] = useState(urlParams.get('transferPeriod') || "alle");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterArchive, setFilterArchive] = useState(urlParams.get('archive') || "active");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [clubSuggestionApplied, setClubSuggestionApplied] = useState(false);
  const [archiveAction, setArchiveAction] = useState(null);
  const [newArchiveName, setNewArchiveName] = useState("");
  const [showManageArchivesDialog, setShowManageArchivesDialog] = useState(false);
  const [editingArchive, setEditingArchive] = useState(null);
  const [archiveToDelete, setArchiveToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Restore scroll position on mount
  useEffect(() => {
    const scrollY = urlParams.get('scrollY');
    if (scrollY) {
      setTimeout(() => window.scrollTo(0, parseInt(scrollY)), 100);
    }
  }, []);

  const [newRequest, setNewRequest] = useState({
    club_name: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    position_needed: "",
    league: "",
    country: "",
    transfer_types: ["kauf"],
    budget_min: "",
    budget_max: "",
    loan_fee_budget: "",
    buy_option_budget: "",
    salary_min: "",
    salary_max: "",
    salary_period: "jährlich",
    age_min: "",
    age_max: "",
    transfer_period: "",
    requirements: "",
    priority: "mittel",
    status: "offen",
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['clubRequests'],
    queryFn: () => base44.entities.ClubRequest.list('-created_date'),
    refetchInterval: 60000,
  });

  const { data: allCommunications = [] } = useQuery({
    queryKey: ['communications'],
    queryFn: () => base44.entities.Communication.list(),
    refetchInterval: 60000,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    refetchInterval: 60000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 60000,
  });

  const { data: archives = [] } = useQuery({
    queryKey: ['archives', 'club'],
    queryFn: async () => {
      const allArchives = await base44.entities.Archive.list();
      return allArchives.filter(a => a.type === 'club');
    },
    refetchInterval: 60000,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (requestId) => {
      const favorites = currentUser?.favorite_club_requests || [];
      const newFavorites = favorites.includes(requestId)
        ? favorites.filter(id => id !== requestId)
        : [...favorites, requestId];
      await base44.auth.updateMe({ favorite_club_requests: newFavorites });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const createArchiveMutation = useMutation({
    mutationFn: (archiveData) => base44.entities.Archive.create(archiveData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
    },
  });

  const archiveRequestsMutation = useMutation({
    mutationFn: async ({ requestIds, archiveId }) => {
      // Process in batches of 5 with a small delay to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < requestIds.length; i += batchSize) {
        const batch = requestIds.slice(i, i + batchSize);
        await Promise.all(batch.map(id => base44.entities.ClubRequest.update(id, { archive_id: archiveId })));
        if (i + batchSize < requestIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubRequests'] });
      setSelectionMode(false);
      setSelectedRequests(new Set());
      setShowArchiveDialog(false);
    },
  });

  const unarchiveRequestsMutation = useMutation({
    mutationFn: async (requestIds) => {
      const batchSize = 5;
      for (let i = 0; i < requestIds.length; i += batchSize) {
        const batch = requestIds.slice(i, i + batchSize);
        await Promise.all(batch.map(id => base44.entities.ClubRequest.update(id, { archive_id: null })));
        if (i + batchSize < requestIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubRequests'] });
      setSelectionMode(false);
      setSelectedRequests(new Set());
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
      // Alle Anfragen aus diesem Archiv löschen
      const requestsInArchive = requests.filter(r => r.archive_id === archiveId);
      await Promise.all(
        requestsInArchive.map(r => base44.entities.ClubRequest.delete(r.id))
      );
      // Dann das Archiv löschen
      await base44.entities.Archive.delete(archiveId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      queryClient.invalidateQueries({ queryKey: ['clubRequests'] });
      setArchiveToDelete(null);
      setDeleteConfirmationText("");
      setShowManageArchivesDialog(false);
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (requestData) => {
      const request = await base44.entities.ClubRequest.create(requestData);
      
      // Benachrichtigung an zugewiesene Benutzer
      if (requestData.assigned_to && requestData.assigned_to.length > 0) {
        const currentUser = await base44.auth.me();
        for (const userEmail of requestData.assigned_to) {
          if (userEmail !== currentUser.email) {
            await base44.entities.Notification.create({
              user_email: userEmail,
              type: 'neue_anfrage',
              title: 'Neue Vereinsanfrage zugewiesen',
              message: `Ihnen wurde die Vereinsanfrage von ${requestData.club_name} zugewiesen`,
              link: `ClubRequestDetail?id=${request.id}`,
              entity_id: request.id,
              entity_type: 'ClubRequest'
            });
          }
        }
      }
      
      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubRequests'] });
      setShowCreateDialog(false);
      setNewRequest({
        club_name: "",
        contact_person: "",
        contact_email: "",
        contact_phone: "",
        position_needed: "",
        league: "",
        country: "",
        transfer_types: ["kauf"],
        budget_min: "",
        budget_max: "",
        loan_fee_budget: "",
        buy_option_budget: "",
        salary_min: "",
        salary_max: "",
        salary_period: "jährlich",
        age_min: "",
        age_max: "",
        transfer_period: "",
        requirements: "",
        priority: "mittel",
        status: "offen",
      });
      setClubSuggestionApplied(false);
    },
  });

  // Smart club auto-fill: find known info from previous requests with same club name
  const handleClubNameChange = (clubName) => {
    setNewRequest(prev => ({ ...prev, club_name: clubName }));
    if (clubName.length < 2) return;
    // Find the most recent request with this club name (case-insensitive)
    const match = requests
      .filter(r => r.club_name?.toLowerCase() === clubName.toLowerCase())
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    if (match) {
      setNewRequest(prev => ({
        ...prev,
        club_name: clubName,
        league: prev.league || match.league || "",
        country: prev.country || match.country || "",
        contact_person: prev.contact_person || match.contact_person || "",
        contact_email: prev.contact_email || match.contact_email || "",
        contact_phone: prev.contact_phone || match.contact_phone || "",
      }));
      setClubSuggestionApplied(true);
    } else {
      setClubSuggestionApplied(false);
    }
  };

  // Partial match suggestions for autocomplete
  const clubNameSuggestions = newRequest.club_name.length >= 2
    ? [...new Map(requests.map(r => [r.club_name?.toLowerCase(), r])).values()]
        .filter(r => r.club_name?.toLowerCase().includes(newRequest.club_name.toLowerCase()) && r.club_name?.toLowerCase() !== newRequest.club_name.toLowerCase())
        .slice(0, 5)
    : [];

  const handleCreateRequest = () => {
    const requestData = {
      ...newRequest,
      budget_min: newRequest.budget_min ? parseFloat(newRequest.budget_min) : undefined,
      budget_max: newRequest.budget_max ? parseFloat(newRequest.budget_max) : undefined,
      loan_fee_budget: newRequest.loan_fee_budget ? parseFloat(newRequest.loan_fee_budget) : undefined,
      buy_option_budget: newRequest.buy_option_budget ? parseFloat(newRequest.buy_option_budget) : undefined,
      salary_min: newRequest.salary_min ? parseFloat(newRequest.salary_min) : undefined,
      salary_max: newRequest.salary_max ? parseFloat(newRequest.salary_max) : undefined,
      age_min: newRequest.age_min ? parseInt(newRequest.age_min) : undefined,
      age_max: newRequest.age_max ? parseInt(newRequest.age_max) : undefined,
    };
    createRequestMutation.mutate(requestData);
  };

  const userFavorites = currentUser?.favorite_club_requests || [];

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (searchRequirements) params.set('searchRequirements', searchRequirements);
    if (filterStatus !== 'alle') params.set('status', filterStatus);
    if (filterFavorites !== 'alle') params.set('favorites', filterFavorites);
    if (filterPriority !== 'alle') params.set('priority', filterPriority);
    if (filterCountry !== 'alle') params.set('country', filterCountry);
    if (filterPosition !== 'alle') params.set('position', filterPosition);
    if (filterShortlist !== 'alle') params.set('shortlist', filterShortlist);
    if (filterBudgetMin) params.set('budgetMin', filterBudgetMin);
    if (filterBudgetMax) params.set('budgetMax', filterBudgetMax);
    if (filterSalaryMin) params.set('salaryMin', filterSalaryMin);
    if (filterSalaryMax) params.set('salaryMax', filterSalaryMax);
    if (filterTransferPeriod !== 'alle') params.set('transferPeriod', filterTransferPeriod);
    if (filterArchive !== 'active') params.set('archive', filterArchive);
    
    const newSearch = params.toString();
    const currentSearch = window.location.search.slice(1);
    
    if (newSearch !== currentSearch) {
      window.history.replaceState(null, '', `?${newSearch}`);
    }
  }, [searchTerm, searchRequirements, filterStatus, filterFavorites, filterPriority, filterCountry, filterPosition, filterShortlist, filterBudgetMin, filterBudgetMax, filterSalaryMin, filterSalaryMax, filterTransferPeriod, filterArchive]);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.club_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.position_needed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.league?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRequirements = searchRequirements === "" || 
                                request.requirements?.toLowerCase().includes(searchRequirements.toLowerCase());
    const matchesStatus = filterStatus === "alle" || request.status === filterStatus;
    // Bei Favoriten-Filter: nur nicht-archivierte Vereinsanfragen anzeigen
    const matchesFavorites = filterFavorites === "alle" || 
                             (filterFavorites === "favoriten" && userFavorites.includes(request.id) && !request.archive_id);
    const matchesPriority = filterPriority === "alle" || request.priority === filterPriority;
    const matchesCountry = filterCountry === "alle" || request.country === filterCountry;
    const matchesPosition = filterPosition === "alle" || request.position_needed === filterPosition;
    
    const shortlistCount = request.shortlist?.length || 0;
    const matchesShortlist = filterShortlist === "alle" || 
                             (filterShortlist === "leer" && shortlistCount === 0) ||
                             (filterShortlist === "1-3" && shortlistCount >= 1 && shortlistCount <= 3) ||
                             (filterShortlist === "4-10" && shortlistCount >= 4 && shortlistCount <= 10) ||
                             (filterShortlist === "10+" && shortlistCount > 10);
    
    const matchesBudget = (!filterBudgetMin || (request.budget_min && request.budget_min >= parseFloat(filterBudgetMin))) &&
                          (!filterBudgetMax || (request.budget_max && request.budget_max <= parseFloat(filterBudgetMax)));
    
    const matchesSalary = (!filterSalaryMin || (request.salary_min && request.salary_min >= parseFloat(filterSalaryMin))) &&
                          (!filterSalaryMax || (request.salary_max && request.salary_max <= parseFloat(filterSalaryMax)));

    const matchesTransferPeriod = filterTransferPeriod === "alle" || request.transfer_period === filterTransferPeriod;

    const matchesArchive = filterArchive === "active" ? !request.archive_id :
                          filterArchive === "alle_archiviert" ? !!request.archive_id :
                          request.archive_id === filterArchive;

    return matchesSearch && matchesRequirements && matchesStatus && matchesFavorites && matchesPriority && matchesCountry && matchesPosition && matchesShortlist && matchesBudget && matchesSalary && matchesTransferPeriod && matchesArchive;
  });

  const activeRequests = requests.filter(r => !r.archive_id);
  const stats = [
    { label: "Aktiv", value: activeRequests.length },
    { label: "Offen", value: activeRequests.filter(r => r.status === "offen").length },
    { label: "In Bearbeitung", value: activeRequests.filter(r => r.status === "in_bearbeitung").length },
    { label: "Archiviert", value: requests.filter(r => !!r.archive_id).length },
  ];

  const uniqueCountries = [...new Set(requests.map(r => r.country).filter(Boolean))].sort();
  const uniquePositions = [...new Set(requests.map(r => r.position_needed).filter(Boolean))];
  
  const getContinent = (country) => {
    const continents = {
      'Deutschland': 'Europa', 'Frankreich': 'Europa', 'England': 'Europa', 'Spanien': 'Europa', 
      'Italien': 'Europa', 'Niederlande': 'Europa', 'Belgien': 'Europa', 'Portugal': 'Europa',
      'Österreich': 'Europa', 'Schweiz': 'Europa', 'Polen': 'Europa', 'Türkei': 'Europa',
      'USA': 'Nordamerika', 'Kanada': 'Nordamerika', 'Mexiko': 'Nordamerika',
      'Brasilien': 'Südamerika', 'Argentinien': 'Südamerika', 'Uruguay': 'Südamerika', 'Chile': 'Südamerika',
      'Japan': 'Asien', 'China': 'Asien', 'Südkorea': 'Asien', 'Saudi-Arabien': 'Asien',
      'Australien': 'Ozeanien', 'Neuseeland': 'Ozeanien',
    };
    return continents[country] || 'Sonstige';
  };

  const countriesByContinent = uniqueCountries.reduce((acc, country) => {
    const continent = getContinent(country);
    if (!acc[continent]) acc[continent] = [];
    acc[continent].push(country);
    return acc;
  }, {});

  const handleArchiveSelected = async (archiveId) => {
    if (archiveId === 'new') {
      setArchiveAction('create');
      setShowArchiveDialog(true);
    } else {
      await archiveRequestsMutation.mutateAsync({
        requestIds: Array.from(selectedRequests),
        archiveId
      });
    }
  };

  const handleCreateAndArchive = async () => {
    if (!newArchiveName) return;
    const archive = await createArchiveMutation.mutateAsync({
      name: newArchiveName,
      type: 'club'
    });
    await archiveRequestsMutation.mutateAsync({
      requestIds: Array.from(selectedRequests),
      archiveId: archive.id
    });
    setNewArchiveName("");
  };

  const handleUnarchiveSelected = async () => {
    await unarchiveRequestsMutation.mutateAsync(Array.from(selectedRequests));
  };

  const toggleRequestSelection = (requestId) => {
    const newSelection = new Set(selectedRequests);
    if (newSelection.has(requestId)) {
      newSelection.delete(requestId);
    } else {
      newSelection.add(requestId);
    }
    setSelectedRequests(newSelection);
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

  const exportFavoriteRequests = () => {
    const favoriteRequests = requests.filter(r => userFavorites.includes(r.id));
    
    // Kommunikationen für jede Anfrage sammeln
    const requestCommunications = {};
    favoriteRequests.forEach(r => {
      const comms = allCommunications.filter(c => c.club_request_id === r.id);
      requestCommunications[r.id] = comms.map(c => 
        `${c.type} (${format(new Date(c.date), "dd.MM.yyyy")}): ${c.subject}`
      ).join(' | ');
    });
    
    const headers = ['Vereinsname', 'Liga', 'Land', 'Position', 'Budget Min', 'Budget Max', 'Gehalt Min', 'Gehalt Max', 'Alter Min', 'Alter Max', 'Transferperiode', 'Priorität', 'Status', 'Kontaktperson', 'E-Mail', 'Telefon', 'Anforderungen', 'Kommunikationen'];
    
    const rows = favoriteRequests.map(r => [
      escapeCsvField(r.club_name),
      escapeCsvField(r.league || ''),
      escapeCsvField(r.country || ''),
      escapeCsvField(r.position_needed),
      escapeCsvField(r.budget_min ? (r.budget_min / 1000000).toFixed(2) + 'M €' : ''),
      escapeCsvField(r.budget_max ? (r.budget_max / 1000000).toFixed(2) + 'M €' : ''),
      escapeCsvField(r.salary_min ? (r.salary_min / 1000).toFixed(0) + 'k €' : ''),
      escapeCsvField(r.salary_max ? (r.salary_max / 1000).toFixed(0) + 'k €' : ''),
      escapeCsvField(r.age_min || ''),
      escapeCsvField(r.age_max || ''),
      escapeCsvField(r.transfer_period || ''),
      escapeCsvField(r.priority || ''),
      escapeCsvField(r.status?.replace(/_/g, ' ') || ''),
      escapeCsvField(r.contact_person || ''),
      escapeCsvField(r.contact_email || ''),
      escapeCsvField(r.contact_phone || ''),
      escapeCsvField(r.requirements || ''),
      escapeCsvField(requestCommunications[r.id] || '')
    ].join(';'));
    
    const csvData = [headers.join(';'), ...rows].join('\n');
    
    const blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Favorisierte_Vereinsanfragen_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Vereinsanfragen</h1>
            <p className="text-slate-600 mt-1">
              {filteredRequests.length} Anfragen {selectionMode && `(${selectedRequests.size} ausgewählt)`}
            </p>
          </div>
          <div className="flex gap-2">
            {!selectionMode ? (
              <>
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
                  Anfrage hinzufügen
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedRequests(new Set());
                  }}
                  variant="outline"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() => {
                    const allFilteredIds = new Set(filteredRequests.map(r => r.id));
                    setSelectedRequests(allFilteredIds);
                  }}
                  variant="outline"
                  className="bg-blue-50 border-blue-300 text-blue-900"
                >
                  Alle auswählen ({filteredRequests.length})
                </Button>
                {selectedRequests.size > 0 && (
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
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
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
            <div className="flex gap-2">
              {filterFavorites === "favoriten" && userFavorites.length > 0 && (
                <Button
                  onClick={exportFavoriteRequests}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Erweiterte Filter
                {showAdvancedFilters && <X className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Verein, Position, Liga oder Person suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Status</SelectItem>
                <SelectItem value="offen">Offen</SelectItem>
                <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                <SelectItem value="angebote_gesendet">Angebote gesendet</SelectItem>
                <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Priorität" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Prioritäten</SelectItem>
                <SelectItem value="dringend">Dringend</SelectItem>
                <SelectItem value="hoch">Hoch</SelectItem>
                <SelectItem value="mittel">Mittel</SelectItem>
                <SelectItem value="niedrig">Niedrig</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Land" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Länder</SelectItem>
                {Object.entries(countriesByContinent).map(([continent, countries]) => (
                  <SelectGroup key={continent}>
                    <SelectLabel>{continent}</SelectLabel>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPosition} onValueChange={setFilterPosition}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Positionen</SelectItem>
                {uniquePositions.map(position => (
                  <SelectItem key={position} value={position}>{position}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterShortlist} onValueChange={setFilterShortlist}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Shortlist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Shortlists</SelectItem>
                <SelectItem value="leer">Leer (0)</SelectItem>
                <SelectItem value="1-3">1-3 Spieler</SelectItem>
                <SelectItem value="4-10">4-10 Spieler</SelectItem>
                <SelectItem value="10+">10+ Spieler</SelectItem>
              </SelectContent>
              </Select>

              <Select value={filterTransferPeriod} onValueChange={setFilterTransferPeriod}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Transferperiode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Perioden</SelectItem>
                <SelectItem value="Winter 2025/26">Winter 2025/26</SelectItem>
                <SelectItem value="Sommer 2026">Sommer 2026</SelectItem>
                <SelectItem value="Winter 2026/27">Winter 2026/27</SelectItem>
              </SelectContent>
              </Select>

              <Select value={filterArchive} onValueChange={setFilterArchive}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Archiv" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktive Anfragen</SelectItem>
                <SelectItem value="alle_archiviert">Alle Archivierten</SelectItem>
                {archives.map(archive => (
                  <SelectItem key={archive.id} value={archive.id}>
                    📁 {archive.name}
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
              </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="In 'Weitere Anforderungen' suchen (z.B. Leihe)..."
              value={searchRequirements}
              onChange={(e) => setSearchRequirements(e.target.value)}
              className="pl-9 border-slate-200 bg-slate-50"
            />
          </div>

              {showAdvancedFilters && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">Finanzielle Kriterien</Label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1.5 block">Transferbudget (Mio. €)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filterBudgetMin}
                        onChange={(e) => setFilterBudgetMin(e.target.value)}
                        className="border-slate-200"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filterBudgetMax}
                        onChange={(e) => setFilterBudgetMax(e.target.value)}
                        className="border-slate-200"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1.5 block">Gehaltsbudget (Tsd. €)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filterSalaryMin}
                        onChange={(e) => setFilterSalaryMin(e.target.value)}
                        className="border-slate-200"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filterSalaryMax}
                        onChange={(e) => setFilterSalaryMax(e.target.value)}
                        className="border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {(filterBudgetMin || filterBudgetMax || filterSalaryMin || filterSalaryMax || searchRequirements) && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterBudgetMin("");
                      setFilterBudgetMax("");
                      setFilterSalaryMin("");
                      setFilterSalaryMax("");
                      setSearchRequirements("");
                    }}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Erweiterte Filter zurücksetzen
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredRequests.map(request => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card 
                  className={`hover:shadow-md transition-all duration-200 border bg-white relative ${
                    selectionMode && selectedRequests.has(request.id) 
                      ? 'border-blue-500 ring-2 ring-blue-200' 
                      : 'border-slate-200'
                  }`}
                >
                  {selectionMode ? (
                    <div className="absolute top-3 right-3 z-10">
                      <input
                        type="checkbox"
                        checked={selectedRequests.has(request.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleRequestSelection(request.id);
                        }}
                        className="w-5 h-5 rounded border-slate-300"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteMutation.mutate(request.id);
                      }}
                      className="absolute top-3 right-3 z-10 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Star 
                        className={`w-5 h-5 ${userFavorites.includes(request.id) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`}
                      />
                    </button>
                  )}
                  <div onClick={() => {
                    if (selectionMode) {
                      toggleRequestSelection(request.id);
                      return;
                    }
                    const params = new URLSearchParams();
                    if (searchTerm) params.set('search', searchTerm);
                    if (searchRequirements) params.set('searchRequirements', searchRequirements);
                    if (filterStatus !== 'alle') params.set('status', filterStatus);
                    if (filterFavorites !== 'alle') params.set('favorites', filterFavorites);
                    if (filterCountry !== 'alle') params.set('country', filterCountry);
                    if (filterBudgetMin) params.set('budgetMin', filterBudgetMin);
                    if (filterBudgetMax) params.set('budgetMax', filterBudgetMax);
                    if (filterSalaryMin) params.set('salaryMin', filterSalaryMin);
                    if (filterSalaryMax) params.set('salaryMax', filterSalaryMax);
                    params.set('scrollY', window.scrollY.toString());
                    navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id + "&back=" + encodeURIComponent(window.location.pathname + "?" + params.toString()));
                  }} className="cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-blue-900 flex-shrink-0" />
                          <h3 className="font-bold text-lg text-slate-900 truncate">{request.club_name}</h3>
                        </div>
                        <p className="text-sm text-slate-600">{request.league} • {request.country}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="secondary" className={priorityColors[request.priority] + " border"}>
                            {request.priority}
                          </Badge>
                          <Badge variant="secondary" className={statusColors[request.status] + " border"}>
                            {request.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                      </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Gesuchte Position</p>
                      <p className="font-semibold text-slate-900">{request.position_needed}</p>
                    </div>

                    {request.transfer_types && request.transfer_types.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {request.transfer_types.map(type => (
                          <Badge key={type} variant="outline" className="border-blue-300 bg-blue-50 text-blue-900 text-xs">
                            {type === 'kauf' ? '💰 Kauf' : type === 'leihe' ? '🔄 Leihe' : '🔄💰 Leihe + Kaufoption'}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600">Budget</p>
                        <p className="font-semibold text-slate-900">
                          {request.budget_min ? `${(request.budget_min / 1000000).toFixed(2).replace(/\.?0+$/, '')}M` : '?'} - 
                          {request.budget_max ? ` ${(request.budget_max / 1000000).toFixed(2).replace(/\.?0+$/, '')}M €` : ' ?'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Alter</p>
                        <p className="font-semibold text-slate-900">
                          {request.age_min || '?'} - {request.age_max || '?'} Jahre
                        </p>
                      </div>
                    </div>

                    {request.transfer_period && (
                      <Badge variant="outline" className="w-full justify-center border-slate-200">
                        {request.transfer_period}
                      </Badge>
                    )}

                    {/* Zuständige Personen anzeigen */}
                    {(request.status === 'in_bearbeitung' || request.status === 'angebote_gesendet') && 
                     request.assigned_to && request.assigned_to.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-slate-600">Zuständig:</span>
                          <div className="flex flex-wrap gap-1">
                            {request.assigned_to.slice(0, 2).map(email => {
                              const user = users.find(u => u.email === email);
                              return (
                                <span key={email} className="font-medium text-slate-900">
                                  {user ? user.full_name : email.split('@')[0]}
                                </span>
                              );
                            })}
                            {request.assigned_to.length > 2 && (
                              <span className="text-slate-500">+{request.assigned_to.length - 2}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {request.contact_person && (
                      <div className="pt-2 border-t border-slate-100 text-sm">
                        <p className="text-slate-600">{request.contact_person}</p>
                        {request.contact_email && (
                          <p className="text-slate-500 text-xs mt-1 truncate">{request.contact_email}</p>
                        )}
                      </div>
                      )}

                    {allCommunications.filter(c => c.club_request_id === request.id).length > 0 && (
                      <div className="flex items-center justify-end gap-1 pt-2 mt-2 border-t border-slate-100">
                        <MessageCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-600">
                          {allCommunications.filter(c => c.club_request_id === request.id).length}
                        </span>
                        <span className="text-xs text-slate-500">Kommunikationen</span>
                      </div>
                    )}
                      </CardContent>
                      </div>
                      </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredRequests.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">Keine Anfragen gefunden</p>
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Neue Vereinsanfrage</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 relative">
                  <Label htmlFor="club_name">Vereinsname *</Label>
                  <Input
                    id="club_name"
                    value={newRequest.club_name}
                    onChange={(e) => { setClubSuggestionApplied(false); handleClubNameChange(e.target.value); }}
                    placeholder="z.B. FC Beispiel"
                    className="mt-1.5"
                    autoComplete="off"
                  />
                  {clubSuggestionApplied && (
                    <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                      ✅ Bekannter Verein – Liga, Land & Kontaktdaten wurden automatisch ergänzt
                    </p>
                  )}
                  {clubNameSuggestions.length > 0 && !clubSuggestionApplied && (
                    <div className="absolute z-50 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 w-full">
                      {clubNameSuggestions.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleClubNameChange(r.club_name)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex items-center justify-between gap-2 first:rounded-t-lg last:rounded-b-lg"
                        >
                          <span className="font-medium text-slate-900">{r.club_name}</span>
                          <span className="text-xs text-slate-500">{r.league} · {r.country}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="league">Liga</Label>
                  <Input
                    id="league"
                    value={newRequest.league}
                    onChange={(e) => setNewRequest({...newRequest, league: e.target.value})}
                    placeholder="z.B. 2. Bundesliga"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="country">Land</Label>
                  <Input
                    id="country"
                    value={newRequest.country}
                    onChange={(e) => setNewRequest({...newRequest, country: e.target.value})}
                    placeholder="z.B. Deutschland"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_person">Ansprechpartner</Label>
                  <Input
                    id="contact_person"
                    value={newRequest.contact_person}
                    onChange={(e) => setNewRequest({...newRequest, contact_person: e.target.value})}
                    placeholder="Name"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_email">E-Mail</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={newRequest.contact_email}
                    onChange={(e) => setNewRequest({...newRequest, contact_email: e.target.value})}
                    placeholder="email@beispiel.de"
                    className="mt-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="contact_phone">Telefon</Label>
                  <Input
                    id="contact_phone"
                    value={newRequest.contact_phone}
                    onChange={(e) => setNewRequest({...newRequest, contact_phone: e.target.value})}
                    placeholder="+49 123 456789"
                    className="mt-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="position_needed">Gesuchte Position *</Label>
                  <Select value={newRequest.position_needed} onValueChange={(value) => setNewRequest({...newRequest, position_needed: value})}>
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
                  <Label className="mb-3 block">Transfer-Art *</Label>
                  <div className="flex flex-wrap gap-3">
                    {['kauf', 'leihe', 'leihe_mit_kaufoption'].map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRequest.transfer_types?.includes(type)}
                          onChange={(e) => {
                            const types = newRequest.transfer_types || [];
                            const newTypes = e.target.checked
                              ? [...types, type]
                              : types.filter(t => t !== type);
                            setNewRequest({...newRequest, transfer_types: newTypes});
                          }}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-slate-700">
                          {type === 'kauf' ? 'Kauf' : type === 'leihe' ? 'Leihe' : 'Leihe mit Kaufoption'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {newRequest.transfer_types?.includes('kauf') && (
                  <>
                    <div>
                      <Label htmlFor="budget_min">Min. Budget Kauf (€)</Label>
                      <Input
                        id="budget_min"
                        type="number"
                        value={newRequest.budget_min}
                        onChange={(e) => setNewRequest({...newRequest, budget_min: e.target.value})}
                        placeholder="500000"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="budget_max">Max. Budget Kauf (€)</Label>
                      <Input
                        id="budget_max"
                        type="number"
                        value={newRequest.budget_max}
                        onChange={(e) => setNewRequest({...newRequest, budget_max: e.target.value})}
                        placeholder="2000000"
                        className="mt-1.5"
                      />
                    </div>
                  </>
                )}

                {newRequest.transfer_types?.includes('leihe') && (
                  <div className="col-span-2">
                    <Label htmlFor="loan_fee_budget">Leihgebühr Budget (€)</Label>
                    <Input
                      id="loan_fee_budget"
                      type="number"
                      value={newRequest.loan_fee_budget}
                      onChange={(e) => setNewRequest({...newRequest, loan_fee_budget: e.target.value})}
                      placeholder="100000"
                      className="mt-1.5"
                    />
                  </div>
                )}

                {newRequest.transfer_types?.includes('leihe_mit_kaufoption') && (
                  <div className="col-span-2">
                    <Label htmlFor="buy_option_budget">Kaufoptions-Budget (€)</Label>
                    <Input
                      id="buy_option_budget"
                      type="number"
                      value={newRequest.buy_option_budget}
                      onChange={(e) => setNewRequest({...newRequest, buy_option_budget: e.target.value})}
                      placeholder="1500000"
                      className="mt-1.5"
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <Label htmlFor="salary_period">Gehaltszeitraum</Label>
                  <Select value={newRequest.salary_period} onValueChange={(value) => setNewRequest({...newRequest, salary_period: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monatlich">Monatlich</SelectItem>
                      <SelectItem value="jährlich">Jährlich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="salary_min">Min. Gehalt (€)</Label>
                  <Input
                    id="salary_min"
                    type="number"
                    value={newRequest.salary_min}
                    onChange={(e) => setNewRequest({...newRequest, salary_min: e.target.value})}
                    placeholder="50000"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="salary_max">Max. Gehalt (€)</Label>
                  <Input
                    id="salary_max"
                    type="number"
                    value={newRequest.salary_max}
                    onChange={(e) => setNewRequest({...newRequest, salary_max: e.target.value})}
                    placeholder="200000"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="age_min">Min. Alter</Label>
                  <Input
                    id="age_min"
                    type="number"
                    value={newRequest.age_min}
                    onChange={(e) => setNewRequest({...newRequest, age_min: e.target.value})}
                    placeholder="18"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="age_max">Max. Alter</Label>
                  <Input
                    id="age_max"
                    type="number"
                    value={newRequest.age_max}
                    onChange={(e) => setNewRequest({...newRequest, age_max: e.target.value})}
                    placeholder="28"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="transfer_period">Transferperiode</Label>
                  <Select value={newRequest.transfer_period} onValueChange={(value) => setNewRequest({...newRequest, transfer_period: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Winter 2025/26">Winter 2025/26</SelectItem>
                      <SelectItem value="Sommer 2026">Sommer 2026</SelectItem>
                      <SelectItem value="Winter 2026/27">Winter 2026/27</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priorität</Label>
                  <Select value={newRequest.priority} onValueChange={(value) => setNewRequest({...newRequest, priority: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="niedrig">Niedrig</SelectItem>
                      <SelectItem value="mittel">Mittel</SelectItem>
                      <SelectItem value="hoch">Hoch</SelectItem>
                      <SelectItem value="dringend">Dringend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="requirements">Weitere Anforderungen</Label>
                  <Textarea
                    id="requirements"
                    value={newRequest.requirements}
                    onChange={(e) => setNewRequest({...newRequest, requirements: e.target.value})}
                    placeholder="Detaillierte Anforderungen und Wünsche..."
                    className="mt-1.5 h-24"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleCreateRequest}
                disabled={!newRequest.club_name || !newRequest.position_needed || createRequestMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {createRequestMutation.isPending ? "Wird erstellt..." : "Anfrage erstellen"}
              </Button>
            </div>
            </DialogContent>
            </Dialog>

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
                      const requestsInArchive = requests.filter(r => r.archive_id === archive.id);
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
                                  {requestsInArchive.length} Vereinsanfragen
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
                      Alle <strong>{requests.filter(r => r.archive_id === archiveToDelete?.id).length} Vereinsanfragen</strong> in 
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
          </div>
          </div>
          );
          }