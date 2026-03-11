import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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
import { Video, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export default function CreateTeamsMeetingDialog({ open, onOpenChange, initialData = {} }) {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    subject: initialData.subject || "",
    description: initialData.description || "",
    startDate: initialData.startDate || "",
    startTime: initialData.startTime || "",
    endDate: initialData.endDate || "",
    endTime: initialData.endTime || "",
    attendees: initialData.attendees || []
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setCreating(true);
    try {
      const startDateTime = `${formData.startDate}T${formData.startTime}:00`;
      const endDateTime = `${formData.endDate}T${formData.endTime}:00`;

      const response = await base44.functions.invoke('createTeamsMeeting', {
        subject: formData.subject,
        description: formData.description,
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        attendees: formData.attendees
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Meeting creation failed');
      }

      toast.success('Teams Meeting erfolgreich erstellt!');
      
      // Show join link
      const joinUrl = response.data.meeting.joinUrl;
      toast.success(
        <div className="space-y-2">
          <p className="font-semibold">Meeting-Link:</p>
          <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
            {joinUrl}
          </a>
        </div>,
        { duration: 10000 }
      );

      onOpenChange(false);
      setFormData({
        subject: "",
        description: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        attendees: []
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Fehler beim Erstellen des Meetings: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleAttendee = (email) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.includes(email)
        ? prev.attendees.filter(e => e !== email)
        : [...prev.attendees, email]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            Teams Meeting erstellen
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="subject">Betreff *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
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
              placeholder="Agenda und Details zum Meeting..."
              className="mt-1.5 h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Startdatum *</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="start-time">Startzeit *</Label>
              <Input
                id="start-time"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
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
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="end-time">Endzeit *</Label>
              <Input
                id="end-time"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                className="mt-1.5"
                required
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" />
              Teilnehmer
            </Label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2">
              {users.map(user => (
                <div key={user.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={formData.attendees.includes(user.email)}
                    onCheckedChange={() => toggleAttendee(user.email)}
                  />
                  <label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer flex-1">
                    {user.full_name} ({user.email})
                  </label>
                </div>
              ))}
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Erstelle Meeting...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Meeting erstellen
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}