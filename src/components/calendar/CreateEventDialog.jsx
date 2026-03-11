import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import MultiUserSelect from "../tasks/MultiUserSelect";

export default function CreateEventDialog({ open, onOpenChange, initialDate }) {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState("task");
  
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    priority: "mittel",
    status: "offen",
    category: "sonstiges",
    deadline: "",
    assigned_to: [],
  });

  const [meetingData, setMeetingData] = useState({
    title: "",
    description: "",
    type: "meeting",
    start_date: "",
    end_date: "",
    location: "",
    participants: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  useEffect(() => {
    if (initialDate && open) {
      const dateStr = format(initialDate, 'yyyy-MM-dd');
      setTaskData(prev => ({ ...prev, deadline: dateStr }));
      setMeetingData(prev => ({ 
        ...prev, 
        start_date: format(initialDate, "yyyy-MM-dd'T'HH:mm"),
        end_date: format(initialDate, "yyyy-MM-dd'T'HH:mm"),
      }));
    }
  }, [initialDate, open]);

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.Task.create({ ...data, agency_id: user.agency_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      handleClose();
    },
  });

  const createMeetingMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.Meeting.create({ ...data, agency_id: user.agency_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      handleClose();
    },
  });

  const handleClose = () => {
    setTaskData({
      title: "",
      description: "",
      priority: "mittel",
      status: "offen",
      category: "sonstiges",
      deadline: "",
      assigned_to: [],
    });
    setMeetingData({
      title: "",
      description: "",
      type: "meeting",
      start_date: "",
      end_date: "",
      location: "",
      participants: [],
    });
    onOpenChange(false);
  };

  const handleCreateTask = () => {
    if (!taskData.title) return;
    createTaskMutation.mutate(taskData);
  };

  const handleCreateMeeting = () => {
    if (!meetingData.title || !meetingData.start_date) return;
    createMeetingMutation.mutate(meetingData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Neues Ereignis erstellen</DialogTitle>
        </DialogHeader>

        <Tabs value={eventType} onValueChange={setEventType}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="task">Aufgabe</TabsTrigger>
            <TabsTrigger value="meeting">Termin</TabsTrigger>
          </TabsList>

          <TabsContent value="task" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="task-title">Titel *</Label>
              <Input
                id="task-title"
                value={taskData.title}
                onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                placeholder="Aufgabentitel..."
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="task-description">Beschreibung</Label>
              <Textarea
                id="task-description"
                value={taskData.description}
                onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                placeholder="Details zur Aufgabe..."
                className="mt-1.5 h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-priority">Priorität</Label>
                <Select value={taskData.priority} onValueChange={(value) => setTaskData({...taskData, priority: value})}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="niedrig">Niedrig</SelectItem>
                    <SelectItem value="mittel">Mittel</SelectItem>
                    <SelectItem value="hoch">Hoch</SelectItem>
                    <SelectItem value="kritisch">Kritisch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="task-category">Kategorie</Label>
                <Select value={taskData.category} onValueChange={(value) => setTaskData({...taskData, category: value})}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="vertrag">Vertrag</SelectItem>
                    <SelectItem value="spieleranfrage">Spieleranfrage</SelectItem>
                    <SelectItem value="reise">Reise</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="verwaltung">Verwaltung</SelectItem>
                    <SelectItem value="sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="task-deadline">Deadline</Label>
                <Input
                  id="task-deadline"
                  type="date"
                  value={taskData.deadline}
                  onChange={(e) => setTaskData({...taskData, deadline: e.target.value})}
                  className="mt-1.5"
                />
              </div>

              <div className="col-span-2">
                <Label>Zugewiesen an</Label>
                <div className="mt-1.5">
                  <MultiUserSelect
                    selectedUsers={taskData.assigned_to}
                    users={users}
                    onChange={(selected) => setTaskData({...taskData, assigned_to: selected})}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleCreateTask}
                disabled={!taskData.title || createTaskMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {createTaskMutation.isPending ? "Wird erstellt..." : "Aufgabe erstellen"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="meeting" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="meeting-title">Titel *</Label>
              <Input
                id="meeting-title"
                value={meetingData.title}
                onChange={(e) => setMeetingData({...meetingData, title: e.target.value})}
                placeholder="Termintitel..."
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="meeting-description">Beschreibung</Label>
              <Textarea
                id="meeting-description"
                value={meetingData.description}
                onChange={(e) => setMeetingData({...meetingData, description: e.target.value})}
                placeholder="Details zum Termin..."
                className="mt-1.5 h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="meeting-start">Startdatum *</Label>
                <Input
                  id="meeting-start"
                  type="datetime-local"
                  value={meetingData.start_date}
                  onChange={(e) => setMeetingData({...meetingData, start_date: e.target.value})}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="meeting-end">Enddatum</Label>
                <Input
                  id="meeting-end"
                  type="datetime-local"
                  value={meetingData.end_date}
                  onChange={(e) => setMeetingData({...meetingData, end_date: e.target.value})}
                  className="mt-1.5"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="meeting-location">Ort</Label>
                <Input
                  id="meeting-location"
                  value={meetingData.location}
                  onChange={(e) => setMeetingData({...meetingData, location: e.target.value})}
                  placeholder="Besprechungsort..."
                  className="mt-1.5"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="meeting-type">Typ</Label>
                <Select value={meetingData.type} onValueChange={(value) => setMeetingData({...meetingData, type: value})}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="reise">Reise</SelectItem>
                    <SelectItem value="spieltermin">Spieltermin</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Teilnehmer</Label>
                <div className="mt-1.5">
                  <MultiUserSelect
                    selectedUsers={meetingData.participants}
                    users={users}
                    onChange={(selected) => setMeetingData({...meetingData, participants: selected})}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleCreateMeeting}
                disabled={!meetingData.title || !meetingData.start_date || createMeetingMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {createMeetingMutation.isPending ? "Wird erstellt..." : "Termin erstellen"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}