import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MessageCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatInGermanTime } from "@/components/utils/dateUtils";

const categoryConfig = {
  meeting: { label: "Meeting", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Calendar },
  entscheidung: { label: "Entscheidung", color: "bg-purple-100 text-purple-800 border-purple-200" },
  information: { label: "Information", color: "bg-slate-100 text-slate-800 border-slate-200" },
  wichtig: { label: "Wichtig", color: "bg-red-100 text-red-800 border-red-200" },
  sonstiges: { label: "Sonstiges", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default function NoteDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const noteId = urlParams.get('id');
  const backUrl = urlParams.get('back');

  const [newComment, setNewComment] = useState("");

  const { data: note, isLoading } = useQuery({
    queryKey: ['internalNote', noteId],
    queryFn: async () => {
      const notes = await base44.entities.InternalNote.list();
      return notes.find(n => n.id === noteId);
    },
    enabled: !!noteId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['noteComments', noteId],
    queryFn: async () => {
      const allComments = await base44.entities.NoteComment.list('-created_date');
      return allComments.filter(c => c.note_id === noteId);
    },
    enabled: !!noteId,
    refetchInterval: 5000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      const comment = await base44.entities.NoteComment.create(commentData);
      
      // Benachrichtigungen an alle Benutzer senden (außer den Ersteller)
      const allUsers = await base44.entities.User.list();
      const currentUser = await base44.auth.me();
      
      for (const user of allUsers) {
        if (user.email !== currentUser.email) {
          await base44.entities.Notification.create({
            user_email: user.email,
            type: 'neue_antwort',
            title: 'Neuer Kommentar auf Notiz',
            message: `${currentUser.full_name} hat einen Kommentar auf "${note.title}" hinterlassen`,
            link: `NoteDetail?id=${noteId}`,
            entity_id: noteId,
            entity_type: 'InternalNote'
          });
        }
      }
      
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noteComments', noteId] });
      setNewComment("");
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate({
      note_id: noteId,
      content: newComment,
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Notiz nicht gefunden</p>
      </div>
    );
  }

  const config = categoryConfig[note.category];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backUrl ? decodeURIComponent(backUrl) : createPageUrl("OrganizationalOverview"))}
            className="hover:bg-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Notiz Details</h1>
          </div>
        </div>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100">
            <div className="space-y-3">
              <CardTitle className="text-2xl">{note.title}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className={config.color + " border"}>
                  {config.label}
                </Badge>
                <Badge variant="outline" className="border-slate-200">
                  {formatInGermanTime(note.created_date, "dd.MM.yyyy HH:mm")}
                </Badge>
                <Badge variant="outline" className="border-slate-200">
                  Erstellt von: {note.created_by}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div 
              className="prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: note.content }} 
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-slate-700" />
              <CardTitle className="text-lg">Kommentare ({comments.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                Noch keine Kommentare vorhanden
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const commentUser = users.find(u => u.email === comment.created_by);
                  return (
                    <div key={comment.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-800 font-semibold text-sm">
                            {commentUser?.full_name?.[0]?.toUpperCase() || comment.created_by[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900">
                              {commentUser?.full_name || comment.created_by}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatInGermanTime(comment.created_date, "dd.MM.yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-slate-200">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Kommentar hinzufügen..."
                className="mb-3"
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || createCommentMutation.isPending}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createCommentMutation.isPending ? "Wird gesendet..." : "Kommentar senden"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}