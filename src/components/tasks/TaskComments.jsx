import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function TaskComments({ taskId }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => base44.entities.Comment.filter({ task_id: taskId }, '-created_date'),
    enabled: !!taskId,
  });

  const createCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      const comment = await base44.entities.Comment.create(commentData);
      
      // Benachrichtigungen an relevante Benutzer senden
      const currentUser = await base44.auth.me();
      const tasks = await base44.entities.Task.list();
      const task = tasks.find(t => t.id === taskId);
      
      if (task) {
        const notifyUsers = new Set();
        
        // Alle zugewiesenen Benutzer benachrichtigen
        if (task.assigned_to && Array.isArray(task.assigned_to)) {
          task.assigned_to.forEach(email => {
            if (email !== currentUser.email) {
              notifyUsers.add(email);
            }
          });
        }
        
        // Ersteller benachrichtigen
        if (task.created_by && task.created_by !== currentUser.email) {
          notifyUsers.add(task.created_by);
        }
        
        // Alle bisherigen Kommentatoren benachrichtigen
        const allComments = await base44.entities.Comment.filter({ task_id: taskId });
        allComments.forEach(c => {
          if (c.created_by !== currentUser.email) {
            notifyUsers.add(c.created_by);
          }
        });
        
        // Benachrichtigungen erstellen
        for (const userEmail of notifyUsers) {
          await base44.entities.Notification.create({
            user_email: userEmail,
            type: 'neue_antwort',
            title: 'Neuer Kommentar zur Aufgabe',
            message: `${currentUser.full_name} hat die Aufgabe "${task.title}" kommentiert`,
            link: `TaskDetail?id=${taskId}`,
            entity_id: taskId,
            entity_type: 'Task'
          });
        }
      }
      
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setNewComment("");
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate({
      task_id: taskId,
      content: newComment,
    });
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Kommentare ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {comments.map(comment => (
          <div key={comment.id} className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-slate-700 text-sm font-semibold">
                  {comment.created_by?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-900 text-sm">
                    {comment.created_by?.split('@')[0]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {format(new Date(comment.created_date), "d. MMM yyyy, HH:mm", { locale: de })}
                  </span>
                </div>
                <p className="text-slate-700 text-sm">{comment.content}</p>
              </div>
            </div>
          </div>
        ))}
        
        <div className="flex gap-2 pt-2">
          <Textarea
            placeholder="Kommentar hinzufügen..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleAddComment}
            disabled={!newComment.trim() || createCommentMutation.isPending}
            className="bg-blue-900 hover:bg-blue-800"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}