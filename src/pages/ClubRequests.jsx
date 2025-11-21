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
import { Plus, Search, Building2, Mail, Phone, ChevronRight, Star, SlidersHorizontal, X } from "lucide-react";
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
  const [filterStatus, setFilterStatus] = useState(urlParams.get('status') || "alle");
  const [filterFavorites, setFilterFavorites] = useState(urlParams.get('favorites') || "alle");
  const [filterCountry, setFilterCountry] = useState(urlParams.get('country') || "alle");
  const [filterBudgetMin, setFilterBudgetMin] = useState(urlParams.get('budgetMin') || "");
  const [filterBudgetMax, setFilterBudgetMax] = useState(urlParams.get('budgetMax') || "");
  const [filterSalaryMin, setFilterSalaryMin] = useState(urlParams.get('salaryMin') || "");
  const [filterSalaryMax, setFilterSalaryMax] = useState(urlParams.get('salaryMax') || "");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [newRequest, setNewRequest] = useState({
    club_name: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    position_needed: "",
    league: "",
    country: "",
    budget_min: "",
    budget_max: "",
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
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
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

  const createRequestMutation = useMutation({
    mutationFn: (requestData) => base44.entities.ClubRequest.create(requestData),
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
        budget_min: "",
        budget_max: "",
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
    },
  });

  const handleCreateRequest = () => {
    const requestData = {
      ...newRequest,
      budget_min: newRequest.budget_min ? parseFloat(newRequest.budget_min) : undefined,
      budget_max: newRequest.budget_max ? parseFloat(newRequest.budget_max) : undefined,
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
    if (filterStatus !== 'alle') params.set('status', filterStatus);
    if (filterFavorites !== 'alle') params.set('favorites', filterFavorites);
    if (filterCountry !== 'alle') params.set('country', filterCountry);
    if (filterBudgetMin) params.set('budgetMin', filterBudgetMin);
    if (filterBudgetMax) params.set('budgetMax', filterBudgetMax);
    if (filterSalaryMin) params.set('salaryMin', filterSalaryMin);
    if (filterSalaryMax) params.set('salaryMax', filterSalaryMax);
    
    const newSearch = params.toString();
    const currentSearch = window.location.search.slice(1);
    
    if (newSearch !== currentSearch) {
      window.history.replaceState(null, '', `?${newSearch}`);
    }
  }, [searchTerm, filterStatus, filterFavorites, filterCountry, filterBudgetMin, filterBudgetMax, filterSalaryMin, filterSalaryMax]);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.club_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.position_needed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.league?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "alle" || request.status === filterStatus;
    const matchesFavorites = filterFavorites === "alle" || 
                             (filterFavorites === "favoriten" && userFavorites.includes(request.id));
    const matchesCountry = filterCountry === "alle" || request.country === filterCountry;
    
    const matchesBudget = (!filterBudgetMin || (request.budget_min && request.budget_min >= parseFloat(filterBudgetMin))) &&
                          (!filterBudgetMax || (request.budget_max && request.budget_max <= parseFloat(filterBudgetMax)));
    
    const matchesSalary = (!filterSalaryMin || (request.salary_min && request.salary_min >= parseFloat(filterSalaryMin))) &&
                          (!filterSalaryMax || (request.salary_max && request.salary_max <= parseFloat(filterSalaryMax)));

    return matchesSearch && matchesStatus && matchesFavorites && matchesCountry && matchesBudget && matchesSalary;
  });

  const stats = [
    { label: "Gesamt", value: requests.length },
    { label: "Offen", value: requests.filter(r => r.status === "offen").length },
    { label: "In Bearbeitung", value: requests.filter(r => r.status === "in_bearbeitung").length },
    { label: "Abgeschlossen", value: requests.filter(r => r.status === "abgeschlossen").length },
  ];

  const uniqueCountries = [...new Set(requests.map(r => r.country).filter(Boolean))].sort();
  
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

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Vereinsanfragen</h1>
            <p className="text-slate-600 mt-1">{filteredRequests.length} Anfragen im System</p>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-900 hover:bg-blue-800 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Anfrage hinzufügen
          </Button>
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

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Verein, Position oder Liga suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px] border-slate-200">
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

            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="w-full md:w-[200px] border-slate-200">
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

              {(filterBudgetMin || filterBudgetMax || filterSalaryMin || filterSalaryMax || filterCountry !== "alle") && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterBudgetMin("");
                      setFilterBudgetMax("");
                      setFilterSalaryMin("");
                      setFilterSalaryMax("");
                      setFilterCountry("alle");
                    }}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Filter zurücksetzen
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
                  className="hover:shadow-md transition-all duration-200 border border-slate-200 bg-white relative"
                >
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
                  <div onClick={() => navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id)} className="cursor-pointer">
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

                    {request.contact_person && (
                      <div className="pt-2 border-t border-slate-100 text-sm">
                        <p className="text-slate-600">{request.contact_person}</p>
                        {request.contact_email && (
                          <p className="text-slate-500 text-xs mt-1 truncate">{request.contact_email}</p>
                        )}
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
                <div className="col-span-2">
                  <Label htmlFor="club_name">Vereinsname *</Label>
                  <Input
                    id="club_name"
                    value={newRequest.club_name}
                    onChange={(e) => setNewRequest({...newRequest, club_name: e.target.value})}
                    placeholder="z.B. FC Beispiel"
                    className="mt-1.5"
                  />
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

                <div>
                  <Label htmlFor="budget_min">Min. Budget (€)</Label>
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
                  <Label htmlFor="budget_max">Max. Budget (€)</Label>
                  <Input
                    id="budget_max"
                    type="number"
                    value={newRequest.budget_max}
                    onChange={(e) => setNewRequest({...newRequest, budget_max: e.target.value})}
                    placeholder="2000000"
                    className="mt-1.5"
                  />
                </div>

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
                      <SelectItem value="Winter 2024/25">Winter 2024/25</SelectItem>
                      <SelectItem value="Sommer 2025">Sommer 2025</SelectItem>
                      <SelectItem value="Winter 2025/26">Winter 2025/26</SelectItem>
                      <SelectItem value="Sommer 2026">Sommer 2026</SelectItem>
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
      </div>
    </div>
  );
}