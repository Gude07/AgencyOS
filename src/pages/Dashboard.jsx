import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import TaskCard from "../components/tasks/TaskCard";

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const myTasks = tasks.filter(t => {
    const assignedUsers = Array.isArray(t.assigned_to) ? t.assigned_to : [];
    return assignedUsers.includes(user?.email);
  });
  
  const openTasks = tasks.filter(t => t.status === 'offen' || t.status === 'in_bearbeitung');
  const completedTasks = tasks.filter(t => t.status === 'abgeschlossen');
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'abgeschlossen' || !t.deadline) return false;
    return new Date(t.deadline) < new Date();
  });

  const upcomingTasks = myTasks
    .filter(t => t.status !== 'abgeschlossen' && t.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  const stats = [
    {
      title: "Offene Aufgaben",
      value: openTasks.length,
      icon: Clock,
      color: "bg-blue-500",
      textColor: "text-blue-600",
    },
    {
      title: "Meine Aufgaben",
      value: myTasks.filter(t => t.status !== 'abgeschlossen').length,
      icon: TrendingUp,
      color: "bg-purple-500",
      textColor: "text-purple-600",
    },
    {
      title: "Abgeschlossen",
      value: completedTasks.length,
      icon: CheckCircle2,
      color: "bg-green-500",
      textColor: "text-green-600",
    },
    {
      title: "Überfällig",
      value: overdueTasks.length,
      icon: AlertTriangle,
      color: "bg-red-500",
      textColor: "text-red-600",
    },
  ];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">Willkommen zurück, {user?.full_name}</p>
          </div>
          <Link to={createPageUrl("Tasks") + "?new=true"}>
            <Button className="bg-blue-900 hover:bg-blue-800 shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Neue Aufgabe
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                      <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Anstehende Aufgaben
                </CardTitle>
                <Link to={createPageUrl("Tasks")}>
                  <Button variant="ghost" size="sm" className="text-blue-900 hover:text-blue-800">
                    Alle ansehen
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Keine anstehenden Aufgaben</p>
                </div>
              ) : (
                upcomingTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Überfällige Aufgaben
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {overdueTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-300" />
                  <p>Keine überfälligen Aufgaben</p>
                </div>
              ) : (
                overdueTasks.slice(0, 5).map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}