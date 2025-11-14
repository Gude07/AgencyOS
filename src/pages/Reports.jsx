import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, TrendingUp, Users, CheckCircle2, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";

const COLORS = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'];

export default function Reports() {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Statistiken berechnen
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'abgeschlossen').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_bearbeitung').length;
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'abgeschlossen' || !t.deadline) return false;
    return new Date(t.deadline) < new Date();
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Aufgaben nach Priorität
  const tasksByPriority = [
    { name: 'Kritisch', value: tasks.filter(t => t.priority === 'kritisch').length },
    { name: 'Hoch', value: tasks.filter(t => t.priority === 'hoch').length },
    { name: 'Mittel', value: tasks.filter(t => t.priority === 'mittel').length },
    { name: 'Niedrig', value: tasks.filter(t => t.priority === 'niedrig').length },
  ];

  // Aufgaben nach Status
  const tasksByStatus = [
    { name: 'Offen', value: tasks.filter(t => t.status === 'offen').length },
    { name: 'In Bearbeitung', value: inProgressTasks },
    { name: 'Review', value: tasks.filter(t => t.status === 'review').length },
    { name: 'Abgeschlossen', value: completedTasks },
  ];

  // Top Performer
  const userStats = users.map(user => {
    const userTasks = tasks.filter(t => t.assigned_to === user.email);
    const completed = userTasks.filter(t => t.status === 'abgeschlossen').length;
    return {
      name: user.full_name,
      completed,
      total: userTasks.length,
      rate: userTasks.length > 0 ? Math.round((completed / userTasks.length) * 100) : 0,
    };
  }).sort((a, b) => b.completed - a.completed).slice(0, 5);

  // Aufgaben nach Kategorie
  const tasksByCategory = [
    { name: 'Transfer', value: tasks.filter(t => t.category === 'transfer').length },
    { name: 'Vertrag', value: tasks.filter(t => t.category === 'vertrag').length },
    { name: 'Spieleranfrage', value: tasks.filter(t => t.category === 'spieleranfrage').length },
    { name: 'Reise', value: tasks.filter(t => t.category === 'reise').length },
    { name: 'Meeting', value: tasks.filter(t => t.category === 'meeting').length },
    { name: 'Sonstiges', value: tasks.filter(t => t.category === 'sonstiges' || t.category === 'verwaltung').length },
  ].filter(cat => cat.value > 0);

  const stats = [
    {
      title: "Gesamte Aufgaben",
      value: totalTasks,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      title: "Abschlussrate",
      value: `${completionRate}%`,
      icon: CheckCircle2,
      color: "text-green-600",
    },
    {
      title: "In Bearbeitung",
      value: inProgressTasks,
      icon: Clock,
      color: "text-orange-600",
    },
    {
      title: "Team-Mitglieder",
      value: users.length,
      icon: Users,
      color: "text-purple-600",
    },
  ];

  const handleExportPDF = () => {
    // In einer echten App würde hier ein PDF generiert
    alert("PDF-Export würde hier die Statistiken als PDF exportieren");
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reports & Statistiken</h1>
            <p className="text-slate-600 mt-1">Team-Performance und Aufgabenübersicht</p>
          </div>
          <Button onClick={handleExportPDF} variant="outline" className="border-slate-200">
            <Download className="w-4 h-4 mr-2" />
            Als PDF exportieren
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={stat.title} className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">Aufgaben nach Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tasksByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="#1e3a8a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">Aufgaben nach Priorität</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tasksByPriority}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tasksByPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">Aufgaben nach Kategorie</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tasksByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" />
                  <YAxis dataKey="name" type="category" stroke="#64748b" width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">Top Performer</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {userStats.map((user, index) => (
                  <div key={user.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-900">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-sm text-slate-500">
                            {user.completed} von {user.total} abgeschlossen
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">{user.rate}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-blue-900 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${user.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
                {userStats.length === 0 && (
                  <p className="text-center text-slate-500 py-8">
                    Keine Daten verfügbar
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}