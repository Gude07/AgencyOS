import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pin, Trash2, FileText, Calendar, Info, AlertCircle, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import AssignmentOverview from "../components/clubRequests/AssignmentOverview";

const categoryConfig = {
  meeting: { label: "Meeting", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Calendar },
  entscheidung: { label: "Entscheidung", color: "bg-purple-100 text-purple-800 border-purple-200", icon: AlertCircle },
  information: { label: "Information", color: "bg-slate-100 text-slate-800 border-slate-200", icon: Info },
  wichtig: { label: "Wichtig", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
  sonstiges: { label: "Sonstiges", color: "bg-gray-100 text-gray-800 border-gray-200", icon: FileText },
};

export default function OrganizationalOverview() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    category: "information",
    pinned: false,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['internalNotes'],
    queryFn: () => base44.entities.InternalNote.list('-created_date'),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createNoteMutation = useMutation({
    mutationFn: (noteData) => base44.entities.InternalNote.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internalNotes'] });
      setShowCreateDialog(false);
      setNewNote({ title: "", content: "", category: "information", pinned: false });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: ({ id, pinned }) => base44.entities.InternalNote.update(id, { pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internalNotes'] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.InternalNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internalNotes'] });
    },
  });

  const handleCreateNote = () => {
    if (!newNote.title || !newNote.content) return;
    createNoteMutation.mutate(newNote);
  };

  const pinnedNotes = notes.filter(note => note.pinned);
  const regularNotes = notes.filter(note => !note.pinned);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Organisatorisches</h1>
            <p className="text-slate-600 mt-1">Zuständigkeiten und interne Notizen</p>
          </div>
        </div>

        {/* Zuständigkeiten Übersicht */}
        <AssignmentOverview />

        {/* Interne Notizen Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-slate-700" />
              <h2 className="text-xl font-bold text-slate-900">Interne Notizen</h2>
            </div>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-900 hover:bg-blue-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Notiz hinzufügen
            </Button>
          </div>

          {/* Angepinnte Notizen */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Pin className="w-4 h-4" />
                Angepinnt
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {pinnedNotes.map(note => {
                  const config = categoryConfig[note.category];
                  const CategoryIcon = config.icon;
                  return (
                    <Card key={note.id} className="border-yellow-200 bg-yellow-50/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {note.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className={config.color + " border text-xs"}>
                                <CategoryIcon className="w-3 h-3 mr-1" />
                                {config.label}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {format(new Date(note.created_date), "dd.MM.yyyy", { locale: de })}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => togglePinMutation.mutate({ id: note.id, pinned: false })}
                              className="h-8 w-8"
                            >
                              <Pin className="w-4 h-4 fill-yellow-600 text-yellow-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteNoteMutation.mutate(note.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-slate-500 mt-3">
                          Erstellt von: {note.created_by}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reguläre Notizen */}
          {regularNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && (
                <h3 className="text-sm font-semibold text-slate-700">Alle Notizen</h3>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regularNotes.map(note => {
                  const config = categoryConfig[note.category];
                  const CategoryIcon = config.icon;
                  return (
                    <Card key={note.id} className="border-slate-200 bg-white">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <CardTitle className="text-base">{note.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className={config.color + " border text-xs"}>
                                <CategoryIcon className="w-3 h-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => togglePinMutation.mutate({ id: note.id, pinned: true })}
                              className="h-8 w-8"
                            >
                              <Pin className="w-4 h-4 text-slate-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteNoteMutation.mutate(note.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-4">{note.content}</p>
                        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                          <span>{format(new Date(note.created_date), "dd.MM.yyyy", { locale: de })}</span>
                          <span>{note.created_by}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {notes.length === 0 && (
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-8 text-center">
                <StickyNote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Noch keine Notizen vorhanden</p>
                <p className="text-sm text-slate-500 mt-1">
                  Erstellen Sie Notizen zu Meetings, Entscheidungen und wichtigen Informationen
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create Note Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Neue Notiz erstellen</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={newNote.title}
                  onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                  placeholder="z.B. Team Meeting 17.12.2025"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="category">Kategorie</Label>
                <Select value={newNote.category} onValueChange={(value) => setNewNote({...newNote, category: value})}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content">Inhalt *</Label>
                <Textarea
                  id="content"
                  value={newNote.content}
                  onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                  placeholder="Notizinhalt..."
                  className="mt-1.5 h-40"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinned"
                  checked={newNote.pinned}
                  onChange={(e) => setNewNote({...newNote, pinned: e.target.checked})}
                  className="h-4 w-4"
                />
                <Label htmlFor="pinned" className="cursor-pointer">
                  Notiz oben anpinnen
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleCreateNote}
                disabled={!newNote.title || !newNote.content || createNoteMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {createNoteMutation.isPending ? "Wird erstellt..." : "Notiz erstellen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}