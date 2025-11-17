import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import TaskCard from "../components/tasks/TaskCard";
import MultiUserSelect from "../components/tasks/MultiUserSelect";

export default function Tasks() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("alle");
  const [filterStatus, setFilterStatus] = useState("alle");
  const [filterCategory, setFilterCategory] = useState("alle");
  const [sortBy, setSortBy] = useState("-created_date");

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "mittel",
    status: "offen",
    category: "sonstiges",
    deadline: "",
    assigned_to: [],
    progress: 0,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreateDialog(false);
      setNewTask({
        title: "",
        description: "",
        priority: "mittel",
        status: "offen",
        category: "sonstiges",
        deadline: "",
        assigned_to: [],
        progress: 0,
      });
    },
  });

  const handleCreateTask = () => {
    createTaskMutation.mutate(newTask);
  };

  const filteredAndSortedTasks = React.useMemo(() => {
    let filtered = tasks.filter(task => {
      const matchesSearch = searchTerm === "" || 
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = filterPriority === "alle" || task.priority === filterPriority;
      const matchesStatus = filterStatus === "alle" || task.status === filterStatus;
      const matchesCategory = filterCategory === "alle" || task.category === filterCategory;
      
      return matchesSearch && matchesPriority && matchesStatus && matchesCategory;
    });

    filtered.sort((a, b) => {
      switch(sortBy) {
        case "-created_date":
          return new Date(b.created_date) - new Date(a.created_date);
        case "created_date":
          return new Date(a.created_date) - new Date(b.created_date);
        case "-deadline":
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(b.deadline) - new Date(a.deadline);
        case "deadline":
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline) - new Date(b.deadline);
        case "priority":
          const priorityOrder = { kritisch: 0, hoch: 1, mittel: 2, niedrig: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, searchTerm, filterPriority, filterStatus, filterCategory, sortBy]);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Aufgaben</h1>
            <p className="text-slate-600 mt-1">{filteredAndSortedTasks.length} Aufgaben</p>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-900 hover:bg-blue-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neue Aufgabe
          </Button>
        </div>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Filter & Sortierung</span>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Priorität" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Prioritäten</SelectItem>
                  <SelectItem value="kritisch">Kritisch</SelectItem>
                  <SelectItem value="hoch">Hoch</SelectItem>
                  <SelectItem value="mittel">Mittel</SelectItem>
                  <SelectItem value="niedrig">Niedrig</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Status</SelectItem>
                  <SelectItem value="offen">Offen</SelectItem>
                  <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Kategorien</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="vertrag">Vertrag</SelectItem>
                  <SelectItem value="spieleranfrage">Spieleranfrage</SelectItem>
                  <SelectItem value="reise">Reise</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="verwaltung">Verwaltung</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sortieren" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_date">Neueste zuerst</SelectItem>
                  <SelectItem value="created_date">Älteste zuerst</SelectItem>
                  <SelectItem value="deadline">Deadline aufsteigend</SelectItem>
                  <SelectItem value="-deadline">Deadline absteigend</SelectItem>
                  <SelectItem value="priority">Nach Priorität</SelectItem>
                  <SelectItem value="title">Nach Titel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>

        {filteredAndSortedTasks.length === 0 && !isLoading && (
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-8 text-center">
              <p className="text-slate-600">
                {tasks.length === 0 ? "Noch keine Aufgaben erstellt" : "Keine Aufgaben gefunden"}
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neue Aufgabe erstellen</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="Aufgabentitel..."
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Details zur Aufgabe..."
                  className="mt-1.5 h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priorität</Label>
                  <Select value={newTask.priority} onValueChange={(value) => setNewTask({...newTask, priority: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="niedrig">Niedrig</SelectItem>
                      <SelectItem value="mittel">Mittel</SelectItem>
                      <SelectItem value="hoch">Hoch</SelectItem>
                      <SelectItem value="kritisch">Kritisch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Kategorie</Label>
                  <Select value={newTask.category} onValueChange={(value) => setNewTask({...newTask, category: value})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="vertrag">Vertrag</SelectItem>
                      <SelectItem value="spieleranfrage">Spieleranfrage</SelectItem>
                      <SelectItem value="reise">Reise</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="verwaltung">Verwaltung</SelectItem>
                      <SelectItem value="sonstiges">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                    className="mt-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <Label>Zugewiesen an</Label>
                  <div className="mt-1.5">
                    <MultiUserSelect
                      selectedUsers={newTask.assigned_to}
                      users={users}
                      onChange={(selected) => setNewTask({...newTask, assigned_to: selected})}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleCreateTask}
                disabled={!newTask.title || createTaskMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {createTaskMutation.isPending ? "Wird erstellt..." : "Aufgabe erstellen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}