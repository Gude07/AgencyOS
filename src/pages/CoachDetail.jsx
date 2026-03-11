import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ArrowLeft, Building2, Mail, Phone, Award, Trash2, Languages as LanguagesIcon, ExternalLink, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInYears } from "date-fns";
import LanguagesEditor from "../components/coaches/LanguagesEditor";
import DocumentManager from "../components/documents/DocumentManager";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

export default function CoachDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const coachId = urlParams.get('id');
  const backUrl = urlParams.get('back');

  const [editMode, setEditMode] = useState(false);
  const [editedCoach, setEditedCoach] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: coach, isLoading } = useQuery({
    queryKey: ['coach', coachId],
    queryFn: async () => {
      const coaches = await base44.entities.Coach.list();
      return coaches.find(c => c.id === coachId);
    },
    enabled: !!coachId,
  });

  const updateCoachMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coach.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', coachId] });
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
      setEditMode(false);
    },
  });

  const deleteCoachMutation = useMutation({
    mutationFn: (id) => base44.entities.Coach.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
      navigate(createPageUrl("Coaches"));
    },
  });

  const handleSaveCoach = () => {
    const coachData = {
      ...editedCoach,
      languages: Array.isArray(editedCoach.languages) ? editedCoach.languages : [],
      age: editedCoach.date_of_birth ? calculateAge(editedCoach.date_of_birth) : undefined,
      salary_expectation: editedCoach.salary_expectation ? parseFloat(editedCoach.salary_expectation) : undefined,
      experience_years: editedCoach.experience_years ? parseInt(editedCoach.experience_years) : undefined,
      transfermarkt_url: editedCoach.transfermarkt_url || undefined,
    };
    
    updateCoachMutation.mutate({ id: coachId, data: coachData });
  };

  const handleDeleteCoach = () => {
    deleteCoachMutation.mutate(coachId);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Trainer nicht gefunden</p>
      </div>
    );
  }

  const currentCoachData = editMode ? editedCoach : coach;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backUrl ? decodeURIComponent(backUrl) : createPageUrl("Coaches"))}
            className="hover:bg-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Trainerdetails</h1>
          </div>
          {!editMode ? (
            <div className="flex gap-2">
              <Button onClick={() => setShowDeleteDialog(true)} variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
              <Button onClick={() => { 
                setEditMode(true); 
                setEditedCoach({
                  ...coach,
                  languages: Array.isArray(coach.languages) ? coach.languages : []
                }); 
              }} variant="outline">
                Bearbeiten
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveCoach} className="bg-blue-900 hover:bg-blue-800">
                Speichern
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Trainerinfo</TabsTrigger>
            <TabsTrigger value="documents">Dokumente</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editMode ? (
                        <Input
                          value={editedCoach?.name || ""}
                          onChange={(e) => setEditedCoach({...editedCoach, name: e.target.value})}
                          className="text-2xl font-bold mb-2"
                        />
                      ) : (
                        <CardTitle className="text-2xl">{currentCoachData?.name}</CardTitle>
                      )}
                      {editMode ? (
                        <Input
                          value={editedCoach?.current_club || ""}
                          onChange={(e) => setEditedCoach({...editedCoach, current_club: e.target.value})}
                          placeholder="Aktueller Verein"
                          className="mt-2"
                        />
                      ) : (
                        <p className="text-slate-600 mt-1">{currentCoachData?.current_club || "Vereinslos"}</p>
                      )}
                      </div>
                      {currentCoachData?.experience_years && (
                      <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">
                        <Award className="w-5 h-5" />
                        <span className="font-semibold">{currentCoachData.experience_years} Jahre</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editMode ? (
                      <Select 
                        value={editedCoach?.category || "Beobachtungsliste"} 
                        onValueChange={(value) => setEditedCoach({...editedCoach, category: value})}
                      >
                        <SelectTrigger className="w-48">
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
                    ) : (
                      <Badge variant="secondary" className={categoryColors[currentCoachData?.category] + " border"}>
                        {currentCoachData?.category}
                      </Badge>
                    )}
                    {editMode ? (
                      <>
                        <Select 
                          value={editedCoach?.specialization || ""} 
                          onValueChange={(value) => setEditedCoach({...editedCoach, specialization: value})}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Spezialisierung" />
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
                        <Select 
                          value={editedCoach?.status || "aktiv"} 
                          onValueChange={(value) => setEditedCoach({...editedCoach, status: value})}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aktiv">Aktiv</SelectItem>
                            <SelectItem value="in_verhandlung">In Verhandlung</SelectItem>
                            <SelectItem value="unter_vertrag">Unter Vertrag</SelectItem>
                            <SelectItem value="archiviert">Archiviert</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-900 font-semibold">
                          {currentCoachData?.specialization}
                        </Badge>
                        <Badge variant="outline" className="border-slate-200">
                          {currentCoachData?.status}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Geburtsdatum</Label>
                    {editMode ? (
                      <Input
                        type="date"
                        value={editedCoach?.date_of_birth || ""}
                        onChange={(e) => setEditedCoach({...editedCoach, date_of_birth: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {currentCoachData?.date_of_birth 
                          ? format(new Date(currentCoachData.date_of_birth), "dd.MM.yyyy")
                          : '-'
                        }
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Alter</Label>
                    <p className="font-semibold text-slate-900">{calculateAge(currentCoachData?.date_of_birth) || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Nationalität</Label>
                    {editMode ? (
                      <Input
                        value={editedCoach?.nationality || ""}
                        onChange={(e) => setEditedCoach({...editedCoach, nationality: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">{currentCoachData?.nationality || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Lizenzen</Label>
                    {editMode ? (
                      <Input
                        value={editedCoach?.licenses || ""}
                        onChange={(e) => setEditedCoach({...editedCoach, licenses: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">{currentCoachData?.licenses || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Erfahrung</Label>
                    {editMode ? (
                      <Input
                        type="number"
                        value={editedCoach?.experience_years || ""}
                        onChange={(e) => setEditedCoach({...editedCoach, experience_years: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {currentCoachData?.experience_years ? `${currentCoachData.experience_years} Jahre` : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Gehaltsvorstellung</Label>
                    {editMode ? (
                      <Input
                        type="number"
                        value={editedCoach?.salary_expectation || ""}
                        onChange={(e) => setEditedCoach({...editedCoach, salary_expectation: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {currentCoachData?.salary_expectation 
                          ? `${Math.round(currentCoachData.salary_expectation / 1000)}k €`
                          : '-'
                        }
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 mb-1.5 block">Vertrag bis</Label>
                    {editMode ? (
                      <Input
                        type="date"
                        value={editedCoach?.contract_until || ""}
                        onChange={(e) => setEditedCoach({...editedCoach, contract_until: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {currentCoachData?.contract_until 
                          ? format(new Date(currentCoachData.contract_until), "MM/yyyy")
                          : '-'
                        }
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Bevorzugte Formation</Label>
                  {editMode ? (
                    <Input
                      value={editedCoach?.preferred_formation || ""}
                      onChange={(e) => setEditedCoach({...editedCoach, preferred_formation: e.target.value})}
                      placeholder="z.B. 4-3-3, 4-2-3-1"
                    />
                  ) : (
                    <p className="text-slate-600">{currentCoachData?.preferred_formation || "Keine Angabe"}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Trainerphilosophie</Label>
                  {editMode ? (
                    <Textarea
                      value={editedCoach?.coaching_philosophy || ""}
                      onChange={(e) => setEditedCoach({...editedCoach, coaching_philosophy: e.target.value})}
                      className="h-24"
                      placeholder="Spielstil, Philosophie..."
                    />
                  ) : (
                    <p className="text-slate-600">{currentCoachData?.coaching_philosophy || "Keine Angabe"}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Erfolge</Label>
                  {editMode ? (
                    <Textarea
                      value={editedCoach?.achievements || ""}
                      onChange={(e) => setEditedCoach({...editedCoach, achievements: e.target.value})}
                      className="h-24"
                      placeholder="Titel, Auszeichnungen..."
                    />
                  ) : (
                    <p className="text-slate-600">{currentCoachData?.achievements || "Keine Angabe"}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Sprachen</Label>
                  {editMode ? (
                    <LanguagesEditor
                      languages={editedCoach?.languages || []}
                      onChange={(languages) => setEditedCoach({...editedCoach, languages: languages})}
                    />
                  ) : (
                    currentCoachData?.languages?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {currentCoachData.languages.map((lang) => (
                          <Badge key={lang} variant="secondary" className="bg-blue-50 text-blue-900 border-blue-200">
                            <LanguagesIcon className="w-3 h-3 mr-1" />
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Keine Sprachen angegeben</p>
                    )
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Notizen</Label>
                  {editMode ? (
                    <Textarea
                      value={editedCoach?.notes || ""}
                      onChange={(e) => setEditedCoach({...editedCoach, notes: e.target.value})}
                      className="h-32"
                    />
                  ) : (
                    <p className="text-slate-600">{currentCoachData?.notes || "Keine Notizen"}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 bg-white">
             <CardHeader className="border-b border-slate-100">
               <CardTitle className="text-lg">Kontakt</CardTitle>
             </CardHeader>
             <CardContent className="p-4 space-y-3">
               {editMode ? (
                 <>
                   <div>
                     <Label className="text-xs text-slate-600 mb-1 block">E-Mail</Label>
                     <Input
                       type="email"
                       value={editedCoach?.contact_email || ""}
                       onChange={(e) => setEditedCoach({...editedCoach, contact_email: e.target.value})}
                       placeholder="trainer@example.com"
                     />
                   </div>
                   <div>
                     <Label className="text-xs text-slate-600 mb-1 block">Telefon</Label>
                     <Input
                       value={editedCoach?.contact_phone || ""}
                       onChange={(e) => setEditedCoach({...editedCoach, contact_phone: e.target.value})}
                       placeholder="+49 123 456789"
                     />
                   </div>
                 </>
               ) : (
                 <>
                   {currentCoachData?.contact_email && (
                     <div className="flex items-center gap-2">
                       <Mail className="w-4 h-4 text-slate-500" />
                       <a href={`mailto:${currentCoachData.contact_email}`} className="text-blue-900 hover:underline text-sm">
                         {currentCoachData.contact_email}
                       </a>
                     </div>
                   )}
                   {currentCoachData?.contact_phone && (
                     <div className="flex items-center gap-2">
                       <Phone className="w-4 h-4 text-slate-500" />
                       <a href={`tel:${currentCoachData.contact_phone}`} className="text-blue-900 hover:underline text-sm">
                         {currentCoachData.contact_phone}
                       </a>
                     </div>
                   )}
                   {!currentCoachData?.contact_email && !currentCoachData?.contact_phone && (
                     <p className="text-sm text-slate-500 text-center py-4">
                       Keine Kontaktdaten hinterlegt
                     </p>
                   )}
                 </>
               )}
             </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">Potentielle Vereine</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {currentCoachData?.potential_clubs?.length > 0 ? (
                  <div className="space-y-2">
                    {currentCoachData.potential_clubs.map((club, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">{club}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Keine Vereine hinterlegt
                  </p>
                )}
              </CardContent>
            </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <DocumentManager entityType="Coach" entityId={coachId} />
          </TabsContent>
        </Tabs>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Trainer löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Sind Sie sicher, dass Sie {coach.name} dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCoach} className="bg-red-600 hover:bg-red-700">
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}