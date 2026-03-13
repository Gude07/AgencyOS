import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const availableWidgets = [
  { type: 'my_open_tasks', label: 'Meine offenen Aufgaben', description: 'Zeigt Ihre zugewiesenen Aufgaben' },
  { type: 'upcoming_meetings', label: 'Bevorstehende Meetings', description: 'Ihre nächsten Termine' },
  { type: 'new_club_requests', label: 'Neue Vereinsanfragen', description: 'Kürzlich eingegangene Anfragen' },
  { type: 'overdue_tasks', label: 'Überfällige Aufgaben', description: 'Aufgaben mit überschrittener Deadline' },
  { type: 'recent_players', label: 'Neueste Spieler', description: 'Zuletzt hinzugefügte Spieler' },
  { type: 'recent_deals', label: 'Aktive Deals', description: 'Laufende Transferverhandlungen' },
  { type: 'stats_overview', label: 'Statistik-Übersicht', description: 'Wichtige Kennzahlen auf einen Blick' }
];

export default function DashboardWidgetCustomizer() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: widgets = [] } = useQuery({
    queryKey: ['dashboard-widgets', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allWidgets = await base44.entities.DashboardWidget.filter({ user_email: user.email });
      return allWidgets.sort((a, b) => (a.position || 0) - (b.position || 0));
    },
    enabled: !!user
  });

  const createWidgetMutation = useMutation({
    mutationFn: async ({ widgetType, position }) => {
      return base44.entities.DashboardWidget.create({
        user_email: user.email,
        widget_type: widgetType,
        position: position,
        is_visible: true,
        settings: { max_items: 5 }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard-widgets']);
    }
  });

  const updateWidgetMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.DashboardWidget.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard-widgets']);
    }
  });

  const deleteWidgetMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.DashboardWidget.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard-widgets']);
    }
  });

  const handleToggleWidget = async (widgetType) => {
    const existing = widgets.find(w => w.widget_type === widgetType);
    
    if (existing) {
      await deleteWidgetMutation.mutateAsync(existing.id);
    } else {
      await createWidgetMutation.mutateAsync({
        widgetType,
        position: widgets.length
      });
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    for (let i = 0; i < items.length; i++) {
      if (items[i].position !== i) {
        await updateWidgetMutation.mutateAsync({
          id: items[i].id,
          data: { position: i }
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Dashboard anpassen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dashboard-Widgets verwalten</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Verfügbare Widgets</h3>
            <div className="space-y-2">
              {availableWidgets.map(widget => {
                const isActive = widgets.some(w => w.widget_type === widget.type);
                return (
                  <div key={widget.type} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50">
                    <Checkbox
                      checked={isActive}
                      onCheckedChange={() => handleToggleWidget(widget.type)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{widget.label}</p>
                      <p className="text-xs text-slate-600">{widget.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {widgets.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Reihenfolge anpassen</h3>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="widgets">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {widgets.map((widget, index) => {
                        const widgetInfo = availableWidgets.find(w => w.type === widget.widget_type);
                        return (
                          <Draggable key={widget.id} draggableId={widget.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="flex items-center gap-3 p-3 bg-white border rounded-lg"
                              >
                                <GripVertical className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-medium">{widgetInfo?.label}</span>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}