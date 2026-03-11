import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Video,
  Trash2,
  ArrowLeft,
  ExternalLink,
  Edit2,
  Save,
  X
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
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

export default function MeetingDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const meetingId = urlParams.get('id');

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editData, setEditData] = useState(null);

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => base44.entities.Meeting.get(meetingId),
    enabled: !!meetingId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Meeting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setIsEditing(false);
      toast.success('Termin aktualisiert');
    },
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: (id) => base44.entities.Meeting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Termin gelöscht');
      navigate(createPageUrl('Calendar'));
    },
  });

  React.useEffect(() => {
    if (meeting && !editData) {
      setEditData({
        title: meeting.title || '',
        description: meeting.description || '',
        start_date: meeting.start_date ? meeting.start_date.split('T')[0] : '',
        start_time: meeting.start_date ? meeting.start_date.split('T')[1]?.substring(0, 5) : '',
        end_date: meeting.end_date ? meeting.end_date.split('T')[0] : '',
        end_time: meeting.end_date ? meeting.end_date.split('T')[1]?.substring(0, 5) : '',
        location: meeting.location || '',
        participants: meeting.participants || []
      });
    }
  }, [meeting]);

  const handleSave = () => {
    const updateData = {
      ...meeting,
      title: editData.title,
      description: editData.description,
      start_date: `${editData.start_date}T${editData.start_time}:00`,
      end_date: `${editData.end_date}T${editData.end_time}:00`,
      location: editData.location,
      participants: editData.participants
    };

    updateMeetingMutation.mutate({ id: meetingId, data: updateData });
  };

  const handleDelete = () => {
    deleteMeetingMutation.mutate(meetingId);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Lade Termin...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Termin nicht gefunden</p>
      </div>
    );
  }

  const getParticipantNames = (emails) => {
    return emails?.map(email => {
      const user = users.find(u => u.email === email);
      return user?.full_name || email;
    }) || [];
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('Calendar'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">{meeting.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {meeting.type === 'teams_meeting' ? 'Teams Meeting' : 'Termin'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Bearbeiten
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditData(null);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMeetingMutation.isPending}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Speichern
                </Button>
              </>
            )}
          </div>
        </div>

        {meeting.teams_link && (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Microsoft Teams Meeting</p>
                    <p className="text-sm text-slate-600">Klicken Sie auf den Link, um beizutreten</p>
                  </div>
                </div>
                <Button
                  onClick={() => window.open(meeting.teams_link, '_blank')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Meeting beitreten
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {!isEditing ? (
              <>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">Datum & Zeit</p>
                    <p className="text-slate-600">
                      {format(parseISO(meeting.start_date), "EEEE, d. MMMM yyyy", { locale: de })}
                    </p>
                    <p className="text-slate-600">
                      {format(parseISO(meeting.start_date), "HH:mm", { locale: de })} - {format(parseISO(meeting.end_date), "HH:mm", { locale: de })} Uhr
                    </p>
                  </div>
                </div>

                {meeting.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Ort</p>
                      <p className="text-slate-600">{meeting.location}</p>
                    </div>
                  </div>
                )}

                {meeting.description && (
                  <div>
                    <p className="font-semibold text-slate-900 mb-2">Beschreibung</p>
                    <p className="text-slate-600 whitespace-pre-wrap">{meeting.description}</p>
                  </div>
                )}

                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-slate-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900 mb-2">Teilnehmer</p>
                      <div className="flex flex-wrap gap-2">
                        {getParticipantNames(meeting.participants).map((name, i) => (
                          <Badge key={i} variant="secondary">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Titel</Label>
                  <Input
                    id="edit-title"
                    value={editData?.title || ''}
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Beschreibung</Label>
                  <Textarea
                    id="edit-description"
                    value={editData?.description || ''}
                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                    className="mt-1.5 h-24"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Startdatum</Label>
                    <Input
                      type="date"
                      value={editData?.start_date || ''}
                      onChange={(e) => setEditData({...editData, start_date: e.target.value})}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Startzeit</Label>
                    <Input
                      type="time"
                      value={editData?.start_time || ''}
                      onChange={(e) => setEditData({...editData, start_time: e.target.value})}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Enddatum</Label>
                    <Input
                      type="date"
                      value={editData?.end_date || ''}
                      onChange={(e) => setEditData({...editData, end_date: e.target.value})}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Endzeit</Label>
                    <Input
                      type="time"
                      value={editData?.end_time || ''}
                      onChange={(e) => setEditData({...editData, end_time: e.target.value})}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-location">Ort</Label>
                  <Input
                    id="edit-location"
                    value={editData?.location || ''}
                    onChange={(e) => setEditData({...editData, location: e.target.value})}
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termin löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diesen Termin wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              {meeting.outlook_event_id && (
                <span className="block mt-2 text-slate-600">
                  Der Termin wird auch aus Ihrem Outlook-Kalender entfernt.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}