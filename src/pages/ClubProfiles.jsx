import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Building2, Pencil, Trash2, RefreshCw, Loader2, Save, X, Calendar,
  ChevronDown, ChevronUp, Sparkles, Zap
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function EditProfileDialog({ profile, onClose, onSave }) {
  const [newCoachName, setNewCoachName] = useState("");
  const [isRebuildingProfile, setIsRebuildingProfile] = useState(false);
  const [form, setForm] = useState({
    club_name: profile.club_name || "",
    league: profile.league || "",
    country: profile.country || "",
    current_coach: profile.current_coach || "",
    coach_philosophy: profile.coach_philosophy || "",
    playing_style: profile.playing_style || "",
    club_culture: profile.club_culture || "",
    player_culture_fit: profile.player_culture_fit || "",
    transfer_trends: profile.transfer_trends || "",
    injury_situation: profile.injury_situation || "",
    notes: profile.notes || "",
    formations: (profile.formations || []).join(", "),
    key_attributes: (profile.key_attributes || []).join(", "),
    target_positions: (profile.target_positions || []).join(", "),
    budget_min: profile.realistic_budget?.min || "",
    budget_max: profile.realistic_budget?.max || "",
    budget_notes: profile.realistic_budget?.notes || "",
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleRebuildWithCoach = async () => {
    if (!newCoachName.trim()) return;
    setIsRebuildingProfile(true);
    try {
      const response = await base44.functions.invoke('analyzeClub', {
        clubName: profile.club_name,
        newCoach: newCoachName.trim(),
        forceRefresh: true,
        existingProfileId: profile.id,
      });
      if (response.data.success) {
        const cp = response.data.clubProfile;
        setForm(f => ({
          ...f,
          current_coach: cp.current_coach || newCoachName.trim(),
          coach_philosophy: cp.coach_philosophy || f.coach_philosophy,
          playing_style: cp.playing_style || f.playing_style,
          formations: (cp.formations || []).join(', '),
          key_attributes: (cp.key_attributes || []).join(', '),
          club_culture: cp.club_culture || f.club_culture,
          player_culture_fit: cp.player_culture_fit || f.player_culture_fit,
          transfer_trends: cp.transfer_trends || f.transfer_trends,
          injury_situation: cp.injury_situation || f.injury_situation,
          target_positions: (cp.target_positions || []).join(', '),
          budget_min: cp.realistic_budget?.min || f.budget_min,
          budget_max: cp.realistic_budget?.max || f.budget_max,
          budget_notes: cp.realistic_budget?.notes || f.budget_notes,
        }));
        setNewCoachName("");
        toast.success(`Profil basierend auf Trainer "${newCoachName.trim()}" neu aufgebaut`);
      } else {
        toast.error(response.data.error || 'Analyse fehlgeschlagen');
      }
    } catch {
      toast.error('Fehler beim Aufbau des Profils');
    } finally {
      setIsRebuildingProfile(false);
    }
  };

  const handleSave = () => {
    const updated = {
      club_name: form.club_name,
      league: form.league,
      country: form.country,
      current_coach: form.current_coach,
      coach_philosophy: form.coach_philosophy,
      playing_style: form.playing_style,
      club_culture: form.club_culture,
      player_culture_fit: form.player_culture_fit,
      transfer_trends: form.transfer_trends,
      injury_situation: form.injury_situation,
      notes: form.notes,
      formations: form.formations.split(",").map(s => s.trim()).filter(Boolean),
      key_attributes: form.key_attributes.split(",").map(s => s.trim()).filter(Boolean),
      target_positions: form.target_positions.split(",").map(s => s.trim()).filter(Boolean),
      realistic_budget: {
        min: Number(form.budget_min) || 0,
        max: Number(form.budget_max) || 0,
        notes: form.budget_notes,
        currency: "EUR"
      }
    };
    onSave(updated);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vereinsprofil bearbeiten: {profile.club_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Neuer Trainer → Profil neu aufbauen */}
          <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              🧑‍💼 Neuer Trainer? Profil automatisch neu aufbauen
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">Gib den Namen des neuen Trainers ein – die KI erstellt daraufhin ein neues Vereinsprofil basierend auf seiner Philosophie und seinem Stil.</p>
            <div className="flex gap-2">
              <Input
                placeholder="z.B. Thomas Tuchel"
                value={newCoachName}
                onChange={e => setNewCoachName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRebuildWithCoach()}
                className="text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRebuildWithCoach}
                disabled={!newCoachName.trim() || isRebuildingProfile}
                className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100"
              >
                {isRebuildingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-1">Neu aufbauen</span>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Vereinsname</Label><Input value={form.club_name} onChange={e => set("club_name", e.target.value)} /></div>
            <div><Label>Liga</Label><Input value={form.league} onChange={e => set("league", e.target.value)} /></div>
            <div><Label>Land</Label><Input value={form.country} onChange={e => set("country", e.target.value)} /></div>
            <div><Label>Aktueller Trainer</Label><Input value={form.current_coach} onChange={e => set("current_coach", e.target.value)} /></div>
          </div>
          <div><Label>Spielstil</Label><Textarea rows={2} value={form.playing_style} onChange={e => set("playing_style", e.target.value)} /></div>
          <div><Label>Trainer-Philosophie</Label><Textarea rows={2} value={form.coach_philosophy} onChange={e => set("coach_philosophy", e.target.value)} /></div>
          <div><Label>Vereinskultur</Label><Textarea rows={2} value={form.club_culture} onChange={e => set("club_culture", e.target.value)} /></div>
          <div><Label>Idealer Spielertyp (kulturell)</Label><Input value={form.player_culture_fit} onChange={e => set("player_culture_fit", e.target.value)} /></div>
          <div><Label>Formationen (kommagetrennt)</Label><Input value={form.formations} onChange={e => set("formations", e.target.value)} placeholder="z.B. 4-3-3, 4-2-3-1" /></div>
          <div><Label>Gesuchte Attribute (kommagetrennt)</Label><Input value={form.key_attributes} onChange={e => set("key_attributes", e.target.value)} /></div>
          <div><Label>Mögliche Prioritätspositionen (kommagetrennt, KI-Einschätzung)</Label><Input value={form.target_positions} onChange={e => set("target_positions", e.target.value)} /></div>
          <div><Label>Transfertrends</Label><Textarea rows={2} value={form.transfer_trends} onChange={e => set("transfer_trends", e.target.value)} /></div>
          <div><Label>Verletzungssituation</Label><Textarea rows={2} value={form.injury_situation} onChange={e => set("injury_situation", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Budget Min (€)</Label><Input type="number" value={form.budget_min} onChange={e => set("budget_min", e.target.value)} /></div>
            <div><Label>Budget Max (€)</Label><Input type="number" value={form.budget_max} onChange={e => set("budget_max", e.target.value)} /></div>
          </div>
          <div><Label>Budget Notizen</Label><Input value={form.budget_notes} onChange={e => set("budget_notes", e.target.value)} /></div>
          <div><Label>Manuelle Notizen</Label><Textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="w-4 h-4 mr-2" />Abbrechen</Button>
          <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" />Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileCard({ profile, onEdit, onDelete, onReanalyze, isReanalyzing, onUpdateField, updatingField }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border border-slate-200 dark:border-slate-700">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">{profile.club_name}</h3>
              {profile.league && <Badge variant="outline" className="text-xs">{profile.league}</Badge>}
              {profile.country && <Badge variant="outline" className="text-xs">{profile.country}</Badge>}
            </div>
            {profile.current_coach && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Trainer: <span className="font-medium">{profile.current_coach}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Erstellt: {formatDate(profile.created_date)}
              </span>
              {profile.last_analyzed_date && (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  Letzte KI-Analyse: {formatDate(profile.last_analyzed_date)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="icon" variant="ghost" onClick={() => setExpanded(!expanded)} title="Details anzeigen">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onEdit(profile)} title="Bearbeiten">
              <Pencil className="w-4 h-4 text-blue-600" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onReanalyze(profile)} disabled={isReanalyzing} title="Neu analysieren (KI)">
              {isReanalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-green-600" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(profile.id)} title="Löschen">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            {profile.playing_style && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Spielstil</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{profile.playing_style}</p>
              </div>
            )}
            {profile.formations?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Formationen</p>
                <div className="flex flex-wrap gap-1">{profile.formations.map((f, i) => <Badge key={i} variant="outline" className="text-xs">{f}</Badge>)}</div>
              </div>
            )}
            {profile.key_attributes?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Gesuchte Attribute</p>
                <div className="flex flex-wrap gap-1">{profile.key_attributes.map((a, i) => <Badge key={i} className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{a}</Badge>)}</div>
              </div>
            )}
            {profile.target_positions?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Mögliche Prioritätspositionen <span className="normal-case font-normal text-slate-400">(KI-Einschätzung)</span></p>
                <div className="flex flex-wrap gap-1">{profile.target_positions.map((p, i) => <Badge key={i} className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">{p}</Badge>)}</div>
              </div>
            )}
            {profile.coach_philosophy && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Trainer-Philosophie</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{profile.coach_philosophy}</p>
              </div>
            )}
            {profile.club_culture && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Vereinskultur</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{profile.club_culture}</p>
              </div>
            )}
            {profile.player_culture_fit && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Idealer Spielertyp</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 italic">{profile.player_culture_fit}</p>
              </div>
            )}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase">Transfertrends</p>
                <div className="flex items-center gap-1">
                  {profile.transfer_trends_updated_date && (
                    <span className="text-xs text-slate-400">Stand: {formatDate(profile.transfer_trends_updated_date)}</span>
                  )}
                  <Button size="icon" variant="ghost" className="h-6 w-6" title="Transfertrends via KI aktualisieren" onClick={() => onUpdateField(profile.id, 'transfer_trends')} disabled={!!updatingField}>
                    {updatingField === 'transfer_trends' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-500" />}
                  </Button>
                </div>
              </div>
              {profile.transfer_trends
                ? <p className="text-sm text-slate-700 dark:text-slate-300">{profile.transfer_trends}</p>
                : <p className="text-xs text-slate-400 italic">Noch keine Daten – per KI aktualisieren</p>
              }
            </div>
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase">⚠ Verletzungssituation</p>
                <div className="flex items-center gap-1">
                  {profile.injury_situation_updated_date && (
                    <span className="text-xs text-red-400">Stand: {formatDate(profile.injury_situation_updated_date)}</span>
                  )}
                  <Button size="icon" variant="ghost" className="h-6 w-6" title="Verletzungssituation via KI aktualisieren" onClick={() => onUpdateField(profile.id, 'injury_situation')} disabled={!!updatingField}>
                    {updatingField === 'injury_situation' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-500" />}
                  </Button>
                </div>
              </div>
              {profile.injury_situation
                ? <p className="text-sm text-red-800 dark:text-red-300">{profile.injury_situation}</p>
                : <p className="text-xs text-red-400 italic">Noch keine Daten – per KI aktualisieren</p>
              }
            </div>
            {profile.realistic_budget && (profile.realistic_budget.min || profile.realistic_budget.max) && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Transferbudget</p>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  {profile.realistic_budget.min?.toLocaleString("de-DE")}€ – {profile.realistic_budget.max?.toLocaleString("de-DE")}€
                </p>
                {profile.realistic_budget.notes && <p className="text-xs text-slate-500 mt-1">{profile.realistic_budget.notes}</p>}
              </div>
            )}
            {profile.notes && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Manuelle Notizen</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 italic">{profile.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClubProfiles() {
  const [editingProfile, setEditingProfile] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [reanalyzingId, setReanalyzingId] = useState(null);
  const [updatingField, setUpdatingField] = useState(null); // { profileId, field }
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["clubProfiles", user?.agency_id],
    queryFn: () => base44.entities.ClubProfile.filter({ agency_id: user.agency_id }, "-created_date"),
    enabled: !!user?.agency_id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClubProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clubProfiles"] });
      toast.success("Vereinsprofil gespeichert");
      setEditingProfile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubProfile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clubProfiles"] });
      toast.success("Vereinsprofil gelöscht");
      setDeleteId(null);
    },
  });

  const handleReanalyze = async (profile) => {
    setReanalyzingId(profile.id);
    try {
      const response = await base44.functions.invoke("analyzeClub", {
        clubName: profile.club_name,
        forceRefresh: true,
        existingProfileId: profile.id,
      });
      if (response.data.success) {
        await base44.entities.ClubProfile.update(profile.id, {
          ...response.data.clubProfile,
          last_analyzed_date: new Date().toISOString(),
        });
        queryClient.invalidateQueries({ queryKey: ["clubProfiles"] });
        toast.success("Vereinsprofil aktualisiert");
      } else {
        toast.error(response.data.error || "Analyse fehlgeschlagen");
      }
    } catch (e) {
      toast.error("Fehler bei der Analyse");
    } finally {
      setReanalyzingId(null);
    }
  };

  const handleUpdateField = async (profileId, field) => {
    setUpdatingField({ profileId, field });
    try {
      const response = await base44.functions.invoke('updateClubFieldAI', { profileId, field });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['clubProfiles'] });
        toast.success(`${field === 'transfer_trends' ? 'Transfertrends' : 'Verletzungssituation'} aktualisiert`);
      } else {
        toast.error(response.data.error || 'Aktualisierung fehlgeschlagen');
      }
    } catch {
      toast.error('Fehler bei der Aktualisierung');
    } finally {
      setUpdatingField(null);
    }
  };

  const filtered = profiles.filter(p =>
    !search || p.club_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.league?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Vereinsprofile</h1>
            <p className="text-slate-600 dark:text-slate-400">Gespeicherte Vereinsprofile verwalten und aktualisieren</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Verein oder Liga suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} Profile</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Keine Vereinsprofile vorhanden</p>
              <p className="text-sm mt-1">Profile werden automatisch bei der KI-Vereinsanalyse gespeichert.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onEdit={setEditingProfile}
                onDelete={setDeleteId}
                onReanalyze={handleReanalyze}
                isReanalyzing={reanalyzingId === profile.id}
                onUpdateField={handleUpdateField}
                updatingField={updatingField?.profileId === profile.id ? updatingField.field : null}
              />
            ))}
          </div>
        )}
      </div>

      {editingProfile && (
        <EditProfileDialog
          profile={editingProfile}
          onClose={() => setEditingProfile(null)}
          onSave={(data) => updateMutation.mutate({ id: editingProfile.id, data })}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vereinsprofil löschen?</AlertDialogTitle>
            <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}