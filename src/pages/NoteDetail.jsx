import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MessageCircle, Send, Sparkles, Tag, CheckSquare, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

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
  const [aiActionItems, setAiActionItems] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);

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
          <Button
            onClick={handleAiAnalysis}
            disabled={isAnalyzing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isAnalyzing ? "Analysiere..." : "AI-Analyse"}
          </Button>
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
                  {format(new Date(note.created_date), "dd.MM.yyyy HH:mm", { locale: de })}
                </Badge>
                <Badge variant="outline" className="border-slate-200">
                  Erstellt von: {note.created_by}
                </Badge>
                {note.ai_tags?.map(tag => (
                  <Badge key={tag} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {note.ai_summary && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-700" />
                  <span className="font-semibold text-purple-900 text-sm">AI-Zusammenfassung</span>
                </div>
                <p className="text-sm text-purple-800 italic">{note.ai_summary}</p>
              </div>
            )}

            <div 
              className="prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: note.content }} 
            />
          </CardContent>
        </Card>

        {showAiInsights && aiActionItems && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="border-b border-purple-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-700" />
                <CardTitle className="text-lg text-purple-900">AI-Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {aiActionItems.action_items?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare className="w-4 h-4 text-purple-700" />
                    <h3 className="font-semibold text-purple-900">Action Items</h3>
                  </div>
                  <ul className="space-y-2">
                    {aiActionItems.action_items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-purple-800">
                        <span className="text-purple-600 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiActionItems.decisions?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare className="w-4 h-4 text-purple-700" />
                    <h3 className="font-semibold text-purple-900">Entscheidungen</h3>
                  </div>
                  <ul className="space-y-2">
                    {aiActionItems.decisions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-purple-800">
                        <span className="text-purple-600 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiActionItems.key_takeaways?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-purple-700" />
                    <h3 className="font-semibold text-purple-900">Key Takeaways</h3>
                  </div>
                  <ul className="space-y-2">
                    {aiActionItems.key_takeaways.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-purple-800">
                        <span className="text-purple-600 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                              {format(new Date(comment.created_date), "dd.MM.yyyy HH:mm", { locale: de })}
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