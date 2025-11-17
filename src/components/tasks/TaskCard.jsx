import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, User, Users } from "lucide-react";
import { format, isPast } from "date-fns";
import { de } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PriorityBadge from "./PriorityBadge";
import StatusBadge from "./StatusBadge";

export default function TaskCard({ task }) {
  const navigate = useNavigate();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && task.status !== 'abgeschlossen';
  const assignedUsers = Array.isArray(task.assigned_to) ? task.assigned_to : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-200 bg-white"
        onClick={() => navigate(createPageUrl("TaskDetail") + "?id=" + task.id)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <PriorityBadge priority={task.priority} showIcon={false} />
            <StatusBadge status={task.status} showIcon={false} />
            {isOverdue && (
              <Badge variant="destructive" className="bg-red-600">
                Überfällig
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {task.description && (
            <p className="text-sm text-slate-600 line-clamp-2">{task.description}</p>
          )}

          {task.deadline && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(task.deadline), "d. MMMM yyyy", { locale: de })}</span>
            </div>
          )}

          {assignedUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              {assignedUsers.length === 1 ? (
                <User className="w-4 h-4" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              <div className="flex flex-wrap gap-1">
                {assignedUsers.slice(0, 2).map(email => {
                  const user = users.find(u => u.email === email);
                  return (
                    <span key={email}>
                      {user ? user.full_name : email.split('@')[0]}
                    </span>
                  );
                })}
                {assignedUsers.length > 2 && (
                  <span className="text-slate-500">+{assignedUsers.length - 2} weitere</span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Fortschritt</span>
              <span className="font-semibold">{task.progress || 0}%</span>
            </div>
            <Progress value={task.progress || 0} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}