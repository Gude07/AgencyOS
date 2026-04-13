import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Folder, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

const COLOR_OPTIONS = [
  { value: "blue", label: "Blau", cls: "bg-blue-500" },
  { value: "green", label: "Grün", cls: "bg-green-500" },
  { value: "purple", label: "Lila", cls: "bg-purple-500" },
  { value: "orange", label: "Orange", cls: "bg-orange-500" },
  { value: "red", label: "Rot", cls: "bg-red-500" },
  { value: "gray", label: "Grau", cls: "bg-gray-500" },
];

const FOLDER_COLORS = {
  blue: "text-blue-600 bg-blue-50 border-blue-200",
  green: "text-green-600 bg-green-50 border-green-200",
  purple: "text-purple-600 bg-purple-50 border-purple-200",
  orange: "text-orange-600 bg-orange-50 border-orange-200",
  red: "text-red-600 bg-red-50 border-red-200",
  gray: "text-gray-600 bg-gray-50 border-gray-200",
};

export default function AnalysisFolderManager({ agencyId, selectedFolderId, onSelectFolder }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const queryClient = useQueryClient();

  const { data: folders = [] } = useQuery({
    queryKey: ["analysisFolders", agencyId],
    queryFn: () => base44.entities.AnalysisFolder.filter({ agency_id: agencyId }),
    enabled: !!agencyId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AnalysisFolder.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["analysisFolders"] }); setNewName(""); toast.success("Ordner erstellt"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AnalysisFolder.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["analysisFolders"] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AnalysisFolder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysisFolders"] });
      if (selectedFolderId === deleteMutation.variables) onSelectFolder(null);
      toast.success("Ordner gelöscht");
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({ agency_id: agencyId, name: newName.trim(), color: newColor });
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={selectedFolderId === null ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectFolder(null)}
        >
          Alle
        </Button>
        {folders.map(folder => (
          <Button
            key={folder.id}
            variant={selectedFolderId === folder.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectFolder(folder.id)}
            className={`gap-1.5 ${selectedFolderId !== folder.id ? FOLDER_COLORS[folder.color || "blue"] : ""}`}
          >
            <Folder className="w-3.5 h-3.5" />
            {folder.name}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Ordner
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ordner verwalten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Create new */}
            <div className="flex gap-2">
              <Input
                placeholder="Neuer Ordnername..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                className="flex-1"
              />
              <Select value={newColor} onValueChange={setNewColor}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${c.cls}`} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Folder list */}
            <div className="space-y-2">
              {folders.map(folder => (
                <div key={folder.id} className="flex items-center gap-2 p-2 border rounded-lg">
                  {editingId === folder.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 h-7 text-sm"
                        autoFocus
                      />
                      <Button size="icon" className="h-7 w-7" onClick={() => updateMutation.mutate({ id: folder.id, data: { name: editName } })}>
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${COLOR_OPTIONS.find(c => c.value === folder.color)?.cls || "bg-blue-500"}`} />
                      <span className="flex-1 text-sm font-medium">{folder.name}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(folder.id); setEditName(folder.name); }}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteMutation.mutate(folder.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {folders.length === 0 && <p className="text-sm text-slate-400 text-center py-2">Noch keine Ordner</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}