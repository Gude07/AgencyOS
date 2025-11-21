import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function PlayerComments({ playerId }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ['playerComments', playerId],
    queryFn: async () => {
      const allComments = await base44.entities.PlayerComment.list('-created_date');
      return allComments.filter(c => c.player_id === playerId);
    },
    enabled: !!playerId,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createCommentMutation = useMutation({
    mutationFn: (commentData) => base44.entities.PlayerComment.create(commentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerComments', playerId] });
      setNewComment("");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => base44.entities.PlayerComment.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerComments', playerId] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    createCommentMutation.mutate({
      player_id: playerId,
      content: newComment.trim()
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              placeholder="Kommentar hinzufügen..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!newComment.trim() || createCommentMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                <Send className="w-4 h-4 mr-2" />
                {createCommentMutation.isPending ? "Wird gesendet..." : "Kommentar senden"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {comments.length === 0 ? (
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Noch keine Kommentare</p>
            <p className="text-sm text-slate-500 mt-1">Fügen Sie den ersten Kommentar hinzu</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <Card key={comment.id} className="border-slate-200 bg-white">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <span className="text-slate-700 font-semibold text-xs">
                        {comment.created_by?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{comment.created_by}</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(comment.created_date), "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de })}
                      </p>
                    </div>
                  </div>
                  {currentUser?.email === comment.created_by && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCommentMutation.mutate(comment.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{comment.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}