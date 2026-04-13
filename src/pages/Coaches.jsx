import React, { useState } from "react";
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
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Users as UsersIcon, Award, GitCompare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInYears } from "date-fns";
import LanguagesEditor from "../components/coaches/LanguagesEditor";
import PlayerComparisonTool from "../components/players/PlayerComparisonTool";

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

export default function Coaches() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState(urlParams.get('search') || "");
  const [filterCategory, setFilterCategory] = useState(urlParams.get('category') || "alle");
  const [filterSpecialization, setFilterSpecialization] = useState(urlParams.get('specialization') || "alle");
  const [showComparisonTool, setShowComparisonTool] = useState(false);

  // Restore scroll position on mount
  React.useEffect(() => {
    const scrollY = urlParams.get('scrollY');
    if (scrollY) {
      setTimeout(() => window.scrollTo(0, parseInt(scrollY)), 100);
    }
  }, []);

  const [newCoach, setNewCoach] = useState({
    name: "",
    date_of_birth: "",
    age: "",
    nationality: "",
    specialization: "",
    current_club: "",
    transfermarkt_url: "",
    salary_expectation: "",
    contract_until: "",
    experience_years: "",
    licenses: "",
    preferred_formation: "",
    coaching_philosophy: "",
    achievements: "",
    languages: [],
    category: "Beobachtungsliste",
    potential_clubs: [],
    notes: "",
    status: "aktiv",
    contact_email: "",
    contact_phone: "",
  });

  const { data: coaches = [], isLoading } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const all = await base44.entities.Coach.list('-created_date');
      return all.filter(c => c.agency_id === user.agency_id);
    },
  });

  const createCoachMutation = useMutation({
    mutationFn: (coachData) => base44.entities.Coach.create(coachData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
      setShowCreateDialog(false);
      setNewCoach({
        name: "",
        date_of_birth: "",
        age: "",
        nationality: "",
        specialization: "",
        current_club: "",
        transfermarkt_url: "",
        salary_expectation: "",
        contract_until: "",
        experience_years: "",
        licenses: "",
        preferred_formation: "",
        coaching_philosophy: "",
        achievements: "",
        languages: [],
        category: "Beobachtungsliste",
        potential_clubs: [],
        notes: "",
        status: "aktiv",
        contact_email: "",
        contact_phone: "",
      });
    },
  });

  const handleCreateCoach = async () => {
    const user = await base44.auth.me();
    const coachData = {
      agency_id: user.agency_id,
      name: newCoach.name,
      specialization: newCoach.specialization,
      date_of_birth: newCoach.date_of_birth || undefined,
      age: newCoach.date_of_birth ? calculateAge(newCoach.date_of_birth) : undefined,
      nationality: newCoach.nationality || undefined,
      current_club: newCoach.current_club || undefined,
      transfermarkt_url: newCoach.transfermarkt_url || undefined,
      salary_expectation: newCoach.salary_expectation ? parseFloat(newCoach.salary_expectation) : undefined,
      contract_until: newCoach.contract_until || undefined,
      experience_years: newCoach.experience_years ? parseInt(newCoach.experience_years) : undefined,
      licenses: newCoach.licenses || undefined,
      preferred_formation: newCoach.preferred_formation || undefined,
      coaching_philosophy: newCoach.coaching_philosophy || undefined,
      achievements: newCoach.achievements || undefined,
      languages: newCoach.languages,
      category: newCoach.category,
      potential_clubs: newCoach.potential_clubs,
      notes: newCoach.notes || undefined,
      status: newCoach.status,
      contact_email: newCoach.contact_email || undefined,
      contact_phone: newCoach.contact_phone || undefined,
    };
    
    createCoachMutation.mutate(coachData);
  };

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterCategory !== 'alle') params.set('category', filterCategory);
    if (filterSpecialization !== 'alle') params.set('specialization', filterSpecialization);
    
    const newSearch = params.toString();
    const currentSearch = window.location.search.slice(1);
    
    if (newSearch !== currentSearch) {
      window.history.replaceState(null, '', `?${newSearch}`);
    }
  }, [searchTerm, filterCategory, filterSpecialization]);

  const filteredCoaches = coaches.filter(coach => {
    const matchesSearch = coach.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         coach.current_club?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "alle" || coach.category === filterCategory;
    const matchesSpecialization = filterSpecialization === "alle" || coach.specialization === filterSpecialization;
    
    return matchesSearch && matchesCategory && matchesSpecialization;
  });

  const stats = [
    { label: "Gesamt", value: coaches.length },
    { label: "Cheftrainer", value: coaches.filter(c => c.specialization === "Cheftrainer").length },
    { label: "Co-Trainer", value: coaches.filter(c => c.specialization === "Co-Trainer").length },
    { label: "Top-Priorität", value: coaches.filter(c => c.category === "Top-Priorität").length },
  ];

  return (
    <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Trainerverwaltung</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">{filteredCoaches.length} Trainer im Portfolio</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowComparisonTool(true)}
              variant="outline"
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            >
              <GitCompare className="w-4 h-4 mr-2" />
              Vergleichen
            </Button>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-900 hover:bg-blue-800 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Trainer hinzufügen
            </Button>
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Trainer oder Verein suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-slate-200"
            />
          </div>

          <Tabs value={filterCategory} onValueChange={setFilterCategory}>
            <TabsList className="bg-slate-100">
              <TabsTrigger value="alle">Alle</TabsTrigger>
              <TabsTrigger value="Wintertransferperiode">Winter</TabsTrigger>
              <TabsTrigger value="Sommertransferperiode">Sommer</TabsTrigger>
              <TabsTrigger value="Top-Priorität">Top-Priorität</TabsTrigger>
              <TabsTrigger value="Beobachtungsliste">Beobachtung</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={filterSpecialization} onValueChange={setFilterSpecialization}>
            <SelectTrigger className="w-[200px] border-slate-200">
              <SelectValue placeholder="Spezialisierung" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Spezialisierungen</SelectItem>
              <SelectItem value="Cheftrainer">Cheftrainer</SelectItem>
              <SelectItem value="Co-Trainer">Co-Trainer</SelectItem>
              <SelectItem value="Torwarttrainer">Torwarttrainer</SelectItem>
              <SelectItem value="Athletiktrainer">Athletiktrainer</SelectItem>
              <SelectItem value="Individualtrainer">Individualtrainer</SelectItem>
              <SelectItem value="Jugendtrainer">Jugendtrainer</SelectItem>
              <SelectItem value="Technischer Direktor">Technischer Direktor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredCoaches.map(coach => (
              <motion.div
                key={coach.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card 
                  className="hover:shadow-md transition-all duration-200 cursor-pointer border border-slate-200 bg-white"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (searchTerm) params.set('search', searchTerm);
                    if (filterCategory !== 'alle') params.set('category', filterCategory);
                    if (filterSpecialization !== 'alle') params.set('specialization', filterSpecialization);
                    params.set('scrollY', window.scrollY.toString());
                    navigate(createPageUrl("CoachDetail") + "?id=" + coach.id + "&back=" + encodeURIComponent(window.location.pathname + "?" + params.toString()));
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">{coach.name}</h3>
                          <p className="text-sm text-slate-600">{coach.current_club || "Vereinslos"}</p>
                        </div>
                        {coach.experience_years && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Award className="w-4 h-4" />
                            <span className="text-sm font-semibold">{coach.experience_years}J</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className={categoryColors[coach.category] + " border"}>
                          {coach.category}
                        </Badge>
                        <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-900 font-semibold">
                          {coach.specialization}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600">Alter</p>
                        <p className="font-semibold text-slate-900">{calculateAge(coach.date_of_birth) || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Nationalität</p>
                        <p className="font-semibold text-slate-900">{coach.nationality || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Lizenz</p>
                        <p className="font-semibold text-slate-900">{coach.licenses || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Vertrag bis</p>
                        <p className="font-semibold text-slate-900">
                          {coach.contract_until && !isNaN(new Date(coach.contract_until)) ? format(new Date(coach.contract_until), "MM/yyyy") : '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredCoaches.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <UsersIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">Keine Trainer gefunden</p>
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Neuen Trainer hinzufügen</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newCoach.name}
                    onChange={(e) => setNewCoach({...newCoach, name: e.target.value})}
                    placeholder="z.B. Thomas Müller"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="specialization">Spezialisierung *</Label>
                  <Select value={newCoach.specialization} onValueChange={(value) => setNewCoach({...newCoach, specialization: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cheftrainer">Cheftrainer</SelectItem>
                      <SelectItem value="Co-Trainer">Co-Trainer</SelectItem>
                      <SelectItem value="Torwarttrainer">Torwarttrainer</SelectItem>
                      <SelectItem value="Athletiktrainer">Athletiktrainer</SelectItem>
                      <SelectItem value="Individualtrainer">Individualtrainer</SelectItem>
                      <SelectItem value="Jugendtrainer">Jugendtrainer</SelectItem>
                      <SelectItem value="Technischer Direktor">Technischer Direktor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date_of_birth">Geburtsdatum</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={newCoach.date_of_birth}
                    onChange={(e) => setNewCoach({...newCoach, date_of_birth: e.target.value})}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="nationality">Nationalität</Label>
                  <Input
                    id="nationality"
                    value={newCoach.nationality}
                    onChange={(e) => setNewCoach({...newCoach, nationality: e.target.value})}
                    placeholder="z.B. Deutschland"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="experience_years">Erfahrung (Jahre)</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    value={newCoach.experience_years}
                    onChange={(e) => setNewCoach({...newCoach, experience_years: e.target.value})}
                    placeholder="10"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="current_club">Aktueller Verein</Label>
                  <Input
                    id="current_club"
                    value={newCoach.current_club}
                    onChange={(e) => setNewCoach({...newCoach, current_club: e.target.value})}
                    placeholder="z.B. FC Bayern München"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="licenses">Lizenzen</Label>
                  <Input
                    id="licenses"
                    value={newCoach.licenses}
                    onChange={(e) => setNewCoach({...newCoach, licenses: e.target.value})}
                    placeholder="z.B. UEFA Pro"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="salary_expectation">Gehaltsvorstellung (€/Jahr)</Label>
                  <Input
                    id="salary_expectation"
                    type="number"
                    value={newCoach.salary_expectation}
                    onChange={(e) => setNewCoach({...newCoach, salary_expectation: e.target.value})}
                    placeholder="500000"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="contract_until">Vertrag bis</Label>
                  <Input
                    id="contract_until"
                    type="date"
                    value={newCoach.contract_until}
                    onChange={(e) => setNewCoach({...newCoach, contract_until: e.target.value})}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Kategorie</Label>
                  <Select value={newCoach.category} onValueChange={(value) => setNewCoach({...newCoach, category: value})}>
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

                <div>
                  <Label htmlFor="contact_email">E-Mail</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={newCoach.contact_email}
                    onChange={(e) => setNewCoach({...newCoach, contact_email: e.target.value})}
                    placeholder="trainer@example.com"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_phone">Telefon</Label>
                  <Input
                    id="contact_phone"
                    value={newCoach.contact_phone}
                    onChange={(e) => setNewCoach({...newCoach, contact_phone: e.target.value})}
                    placeholder="+49 123 456789"
                    className="mt-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="preferred_formation">Bevorzugte Formation</Label>
                  <Input
                    id="preferred_formation"
                    value={newCoach.preferred_formation}
                    onChange={(e) => setNewCoach({...newCoach, preferred_formation: e.target.value})}
                    placeholder="z.B. 4-3-3, 4-2-3-1"
                    className="mt-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="coaching_philosophy">Trainerphilosophie</Label>
                  <Textarea
                    id="coaching_philosophy"
                    value={newCoach.coaching_philosophy}
                    onChange={(e) => setNewCoach({...newCoach, coaching_philosophy: e.target.value})}
                    placeholder="Spielstil, Philosophie..."
                    className="mt-1.5 h-20"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="achievements">Erfolge</Label>
                  <Textarea
                    id="achievements"
                    value={newCoach.achievements}
                    onChange={(e) => setNewCoach({...newCoach, achievements: e.target.value})}
                    placeholder="Titel, Auszeichnungen..."
                    className="mt-1.5 h-20"
                  />
                </div>

                <div className="col-span-2">
                  <LanguagesEditor
                    languages={newCoach.languages}
                    onChange={(languages) => setNewCoach({...newCoach, languages: languages})}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea
                    id="notes"
                    value={newCoach.notes}
                    onChange={(e) => setNewCoach({...newCoach, notes: e.target.value})}
                    placeholder="Weitere Informationen..."
                    className="mt-1.5 h-20"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleCreateCoach}
                disabled={!newCoach.name || !newCoach.specialization || createCoachMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {createCoachMutation.isPending ? "Wird hinzugefügt..." : "Trainer hinzufügen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <PlayerComparisonTool 
          open={showComparisonTool}
          onOpenChange={setShowComparisonTool}
          initialPlayerIds={[]}
          entityType="Coach"
        />
      </div>
    </div>
  );
}