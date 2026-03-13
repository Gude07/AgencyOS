import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TemplateManager({ templateType, onSelectTemplate }) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    template_data: {}
  });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates', templateType, user?.agency_id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Template.filter({
        agency_id: user.agency_id,
        template_type: templateType
      });
      return all;
    },
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Template.create({
      agency_id: user.agency_id,
      template_type: templateType,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      setCreateOpen(false);
      setNewTemplate({ name: '', description: '', template_data: {} });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Template.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
    }
  });

  const handleSelectTemplate = (template) => {
    onSelectTemplate(template.template_data);
    setOpen(false);
  };

  const getTypeLabel = () => {
    switch (templateType) {
      case 'player': return 'Spieler';
      case 'club_request': return 'Vereinsanfrage';
      case 'deal': return 'Deal';
      case 'scouting_report': return 'Scouting-Bericht';
      default: return 'Vorlage';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Vorlage verwenden
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{getTypeLabel()}-Vorlagen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Keine Vorlagen vorhanden</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {templates.map(template => (
                  <Card key={template.id} className="cursor-pointer hover:border-blue-500 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1" onClick={() => handleSelectTemplate(template)}>
                          <p className="font-semibold">{template.name}</p>
                          {template.description && (
                            <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(template.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button onClick={() => setCreateOpen(true)} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Neue Vorlage erstellen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Vorlage erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="z.B. Standard Verteidiger"
              />
            </div>
            <div>
              <Label>Beschreibung (optional)</Label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Kurze Beschreibung der Vorlage"
              />
            </div>
            <p className="text-xs text-slate-600">
              Die Vorlage wird mit den aktuellen Formulardaten erstellt, wenn Sie "Speichern" klicken.
            </p>
            <Button 
              onClick={() => createMutation.mutate(newTemplate)}
              disabled={!newTemplate.name}
              className="w-full"
            >
              Vorlage speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}