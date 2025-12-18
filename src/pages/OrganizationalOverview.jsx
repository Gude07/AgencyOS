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
import { Plus, Pin, Trash2, FileText, Calendar, Info, AlertCircle, StickyNote, Folder as FolderIcon, Edit2, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import AssignmentOverview from "../components/clubRequests/AssignmentOverview";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const categoryConfig = {
  meeting: { label: "Meeting", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Calendar },
  entscheidung: { label: "Entscheidung", color: "bg-purple-100 text-purple-800 border-purple-200", icon: AlertCircle },
  information: { label: "Information", color: "bg-slate-100 text-slate-800 border-slate-200", icon: Info },
  wichtig: { label: "Wichtig", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
  sonstiges: { label: "Sonstiges", color: "bg-gray-100 text-gray-800 border-gray-200", icon: FileText },
};

const folderColors = {
  blue: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  green: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  purple: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  orange: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  red: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  gray: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" },
};

export default function OrganizationalOverview() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    category: "information",
    pinned: false,
    folder_id: null,
  });
  const [newFolder, setNewFolder] = useState({
    name: "",
    description: "",
    color: "blue",
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['internalNotes'],
    queryFn: () => base44.entities.InternalNote.list('-created_date'),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => base44.entities.Folder.list('-created_date'),
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
      setNewNote({ title: "", content: "", category: "information", pinned: false, folder_id: selectedFolder });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (folderData) => base44.entities.Folder.create(folderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setShowFolderDialog(false);
      setNewFolder({ name: "", description: "", color: "blue" });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Folder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setEditingFolder(null);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId) => {
      // Notizen in diesem Ordner entkoppeln
      const notesInFolder = notes.filter(n => n.folder_id === folderId);
      await Promise.all(
        notesInFolder.map(n => base44.entities.InternalNote.update(n.id, { folder_id: null }))
      );
      // Ordner löschen
      await base44.entities.Folder.delete(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['internalNotes'] });
      setSelectedFolder(null);
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
    createNoteMutation.mutate({
      ...newNote,
      folder_id: selectedFolder,
    });
  };

  const handleCreateFolder = () => {
    if (!newFolder.name) return;
    createFolderMutation.mutate(newFolder);
  };

  const handleUpdateFolder = () => {
    if (!editingFolder || !editingFolder.name) return;
    updateFolderMutation.mutate({
      id: editingFolder.id,
      data: { name: editingFolder.name, description: editingFolder.description, color: editingFolder.color }
    });
  };

  const filteredNotes = selectedFolder 
    ? notes.filter(note => note.folder_id === selectedFolder)
    : notes.filter(note => !note.folder_id);

  const pinnedNotes = filteredNotes.filter(note => note.pinned);
  const regularNotes = filteredNotes.filter(note => !note.pinned);

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

        {/* Ordner Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FolderIcon className="w-5 h-5 text-slate-700" />
              <h2 className="text-xl font-bold text-slate-900">Wissensmanagement</h2>
            </div>
            <Button 
              onClick={() => setShowFolderDialog(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ordner erstellen
            </Button>
          </div>

          {/* Ordner Liste */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedFolder === null ? "default" : "outline"}
              onClick={() => setSelectedFolder(null)}
              className={selectedFolder === null ? "bg-blue-900 hover:bg-blue-800" : ""}
            >
              <StickyNote className="w-4 h-4 mr-2" />
              Ohne Ordner ({notes.filter(n => !n.folder_id).length})
            </Button>
            {folders.map(folder => {
              const colorClasses = folderColors[folder.color];
              const notesCount = notes.filter(n => n.folder_id === folder.id).length;
              return (
                <div key={folder.id} className="relative group">
                  <Button
                    variant={selectedFolder === folder.id ? "default" : "outline"}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={selectedFolder === folder.id ? "bg-blue-900 hover:bg-blue-800 pr-10" : "pr-10"}
                  >
                    <FolderIcon className={`w-4 h-4 mr-2 ${selectedFolder === folder.id ? '' : colorClasses.text}`} />
                    {folder.name} ({notesCount})
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingFolder(folder)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteFolderMutation.mutate(folder.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interne Notizen Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-slate-700" />
              <h2 className="text-xl font-bold text-slate-900">
                Notizen {selectedFolder && `in ${folders.find(f => f.id === selectedFolder)?.name}`}
              </h2>
            </div>
            <Button 
              onClick={() => {
                setNewNote({ title: "", content: "", category: "information", pinned: false, folder_id: selectedFolder });
                setShowCreateDialog(true);
              }}
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
                        <div className="text-sm text-slate-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: note.content }} />
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
                        <div className="text-sm text-slate-600 prose prose-sm max-w-none line-clamp-4" dangerouslySetInnerHTML={{ __html: note.content }} />
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

          {filteredNotes.length === 0 && (
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-8 text-center">
                <StickyNote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Noch keine Notizen vorhanden</p>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedFolder 
                    ? "Fügen Sie diesem Ordner Notizen hinzu" 
                    : "Erstellen Sie Notizen zu Meetings, Entscheidungen und wichtigen Informationen"}
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
                <Label htmlFor="content">Inhalt * (Rich-Text Editor)</Label>
                <div className="mt-1.5">
                  <ReactQuill
                    theme="snow"
                    value={newNote.content}
                    onChange={(content) => setNewNote({...newNote, content})}
                    placeholder="Notizinhalt... Sie können Text formatieren, Tabellen einfügen, Listen erstellen, etc."
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'color': [] }, { 'background': [] }],
                        ['link'],
                        ['clean']
                      ],
                    }}
                    style={{ height: '200px', marginBottom: '50px' }}
                  />
                </div>
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

        {/* Create/Edit Folder Dialog */}
        <Dialog open={showFolderDialog || !!editingFolder} onOpenChange={(open) => {
          if (!open) {
            setShowFolderDialog(false);
            setEditingFolder(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingFolder ? "Ordner bearbeiten" : "Neuen Ordner erstellen"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="folder_name">Name *</Label>
                <Input
                  id="folder_name"
                  value={editingFolder ? editingFolder.name : newFolder.name}
                  onChange={(e) => editingFolder 
                    ? setEditingFolder({...editingFolder, name: e.target.value})
                    : setNewFolder({...newFolder, name: e.target.value})
                  }
                  placeholder="z.B. Marketing, Finanzen, Strategieplanung"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="folder_description">Beschreibung</Label>
                <Textarea
                  id="folder_description"
                  value={editingFolder ? editingFolder.description : newFolder.description}
                  onChange={(e) => editingFolder 
                    ? setEditingFolder({...editingFolder, description: e.target.value})
                    : setNewFolder({...newFolder, description: e.target.value})
                  }
                  placeholder="Wofür ist dieser Ordner gedacht?"
                  className="mt-1.5 h-20"
                />
              </div>

              <div>
                <Label>Farbe</Label>
                <div className="grid grid-cols-6 gap-2 mt-1.5">
                  {Object.entries(folderColors).map(([colorKey, colorClasses]) => (
                    <button
                      key={colorKey}
                      type="button"
                      onClick={() => editingFolder 
                        ? setEditingFolder({...editingFolder, color: colorKey})
                        : setNewFolder({...newFolder, color: colorKey})
                      }
                      className={`h-10 rounded-lg border-2 ${colorClasses.bg} ${
                        (editingFolder?.color === colorKey || (!editingFolder && newFolder.color === colorKey))
                          ? 'border-slate-900 ring-2 ring-slate-900 ring-offset-2'
                          : 'border-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowFolderDialog(false);
                setEditingFolder(null);
              }}>
                Abbrechen
              </Button>
              <Button 
                onClick={editingFolder ? handleUpdateFolder : handleCreateFolder}
                disabled={editingFolder ? !editingFolder.name : !newFolder.name}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {editingFolder ? "Speichern" : "Erstellen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}