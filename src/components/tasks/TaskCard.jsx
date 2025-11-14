import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, User, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import PriorityBadge from "./PriorityBadge";
import StatusBadge from "./StatusBadge";

export default function TaskCard({ task, onClick }) {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'abgeschlossen';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="hover:shadow-md transition-all duration-200 cursor-pointer border border-slate-200 bg-white"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 mb-2 truncate">{task.title}</h3>
              <div className="flex flex-wrap gap-2">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={isOverdue ? 'überfällig' : task.status} />
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          {task.description && (
            <p className="text-sm text-slate-600 line-clamp-2">{task.description}</p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            {task.deadline && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(task.deadline), "d. MMM yyyy", { locale: de })}</span>
              </div>
            )}
            {task.assigned_to && (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span className="truncate max-w-[150px]">{task.assigned_to.split('@')[0]}</span>
              </div>
            )}
          </div>

          {task.progress > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Fortschritt</span>
                <span className="text-slate-900 font-semibold">{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}