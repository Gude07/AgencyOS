import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Video, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import MultiUserSelect from "./MultiUserSelect";

export default function CreateMeetingDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    location: "",
    participants: [],
    addToOutlook: false,
    createTeamsMeeting: false
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createMeetingMutation = useMutation({
    mutationFn: (data) => base44.entities.Meeting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.start_date || !formData.start_time || !formData.end_date || !formData.end_time) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setCreating(true);
    try {
      const startDateTime = `${formData.start_date}T${formData.start_time}:00`;
      const endDateTime = `${formData.end_date}T${formData.end_time}:00`;

      const meetingData = {
        agency_id: currentUser.agency_id,
        title: formData.title,
        description: formData.description,
        start_date: startDateTime,
        end_date: endDateTime,
        location: formData.location,
        type: formData.createTeamsMeeting ? 'teams_meeting' : 'meeting',
        participants: formData.participants
      };

      const newMeeting = await createMeetingMutation.mutateAsync(meetingData);

      // Teams Meeting erstellen wenn gewünscht
      if (formData.createTeamsMeeting) {
        try {
          const teamsResponse = await base44.functions.invoke('createTeamsMeeting', {
            subject: formData.title,
            description: formData.description,
            startDateTime: startDateTime,
            endDateTime: endDateTime,
            attendees: formData.participants
          });

          if (teamsResponse.data.success) {
            const joinUrl = teamsResponse.data.meeting.joinUrl;
            
            // Meeting mit Teams-Link aktualisieren
            await base44.entities.Meeting.update(newMeeting.id, {
              teams_link: joinUrl,
              location: joinUrl
            });

            toast.success('Teams Meeting erfolgreich erstellt!');
          }
        } catch (error) {
          console.error('Teams creation error:', error);
          toast.error('Fehler beim Erstellen des Teams Meetings');
        }
      }
      // Outlook Termin erstellen wenn gewünscht (und kein Teams Meeting)
      else if (formData.addToOutlook) {
        try {
          await base44.functions.invoke('createOutlookEvent', {
            subject: formData.title,
            body: formData.description,
            startDateTime: startDateTime,
            endDateTime: endDateTime,
            location: formData.location,
            attendees: formData.participants.map(email => ({ emailAddress: { address: email } }))
          });

          toast.success('Termin in Outlook erstellt!');
        } catch (error) {
          console.error('Outlook creation error:', error);
          toast.error('Fehler beim Erstellen des Outlook Termins');
        }
      }

      toast.success('Termin erfolgreich erstellt!');
      onOpenChange(false);
      setFormData({
        title: "",
        description: "",
        start_date: "",
        start_time: "",
        end_date: "",
        end_time: "",
        location: "",
        participants: [],
        addToOutlook: false,
        createTeamsMeeting: false
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Fehler beim Erstellen des Termins');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuer Termin</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="z.B. Verhandlung mit FC Bayern"
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Details zum Termin..."
              className="mt-1.5 h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Startdatum *</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="start-time">Startzeit *</Label>
              <Input
                id="start-time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                className="mt-1.5"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="end-date">Enddatum *</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="end-time">Endzeit *</Label>
              <Input
                id="end-time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                className="mt-1.5"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Ort</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="z.B. Konferenzraum A"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Teilnehmer</Label>
            <MultiUserSelect
              selectedUsers={formData.participants}
              users={users}
              onChange={(participants) => setFormData({...formData, participants})}
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Checkbox
                id="add-to-outlook"
                checked={formData.addToOutlook}
                onCheckedChange={(checked) => setFormData({
                  ...formData, 
                  addToOutlook: checked,
                  createTeamsMeeting: checked ? false : formData.createTeamsMeeting
                })}
                disabled={formData.createTeamsMeeting}
              />
              <label htmlFor="add-to-outlook" className="text-sm cursor-pointer flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                In Outlook Kalender hinzufügen
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="create-teams-meeting"
                checked={formData.createTeamsMeeting}
                onCheckedChange={(checked) => setFormData({
                  ...formData, 
                  createTeamsMeeting: checked,
                  addToOutlook: false
                })}
              />
              <label htmlFor="create-teams-meeting" className="text-sm cursor-pointer flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-600" />
                Als Teams Meeting erstellen (wird automatisch in Outlook angezeigt)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Abbrechen
            </Button>
            <Button 
              type="submit"
              disabled={creating}
              className="bg-blue-900 hover:bg-blue-800"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Erstelle...
                </>
              ) : (
                'Termin erstellen'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}