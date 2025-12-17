import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ArrowLeft, Calendar, User, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import PriorityBadge from "../components/tasks/PriorityBadge";
import StatusBadge from "../components/tasks/StatusBadge";
import TaskComments from "../components/tasks/TaskComments";
import TaskSubtasks from "../components/tasks/TaskSubtasks";
import MultiUserSelect from "../components/tasks/MultiUserSelect";

export default function TaskDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('id');
  const backUrl = urlParams.get('back');

  const [editMode, setEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const tasks = await base44.entities.Task.list();
      return tasks.find(t => t.id === taskId);
    },
    enabled: !!taskId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditMode(false);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate(createPageUrl("Tasks"));
    },
  });

  const handleSaveTask = () => {
    const taskData = {
      ...editedTask,
      status: editedTask.progress === 100 ? 'abgeschlossen' : editedTask.status
    };
    updateTaskMutation.mutate({ id: taskId, data: taskData });
  };

  const handleDeleteTask = () => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleUpdateSubtasks = (subtasks) => {
    const completedCount = subtasks.filter(st => st.completed).length;
    const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;
    const status = progress === 100 ? 'abgeschlossen' : task.status;
    updateTaskMutation.mutate({ 
      id: taskId, 
      data: { subtasks, progress, status }
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Aufgabe nicht gefunden</p>
      </div>
    );
  }

  const currentTaskData = editMode ? editedTask : task;
  const assignedUsers = Array.isArray(currentTaskData?.assigned_to) ? currentTaskData.assigned_to : [];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backUrl ? decodeURIComponent(backUrl) : createPageUrl("Tasks"))}
            className="hover:bg-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Aufgabendetails</h1>
          </div>
          {!editMode ? (
            <div className="flex gap-2">
              <Button onClick={() => setShowDeleteDialog(true)} variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
              <Button onClick={() => { setEditMode(true); setEditedTask(task); }} variant="outline">
                Bearbeiten
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleSaveTask} 
                disabled={updateTaskMutation.isPending}
                className="bg-blue-900 hover:bg-blue-800"
              >
                {updateTaskMutation.isPending ? "Wird gespeichert..." : "Speichern"}
              </Button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <div className="space-y-3">
                  {editMode ? (
                    <Input
                      value={editedTask.title}
                      onChange={(e) => setEditedTask({...editedTask, title: e.target.value})}
                      className="text-xl font-bold"
                    />
                  ) : (
                    <CardTitle className="text-xl">{currentTaskData.title}</CardTitle>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {editMode ? (
                      <>
                        <Select 
                          value={editedTask.priority} 
                          onValueChange={(value) => setEditedTask({...editedTask, priority: value})}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="niedrig">Niedrig</SelectItem>
                            <SelectItem value="mittel">Mittel</SelectItem>
                            <SelectItem value="hoch">Hoch</SelectItem>
                            <SelectItem value="kritisch">Kritisch</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select 
                          value={editedTask.status} 
                          onValueChange={(value) => setEditedTask({...editedTask, status: value})}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="offen">Offen</SelectItem>
                            <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <>
                        <PriorityBadge priority={currentTaskData.priority} />
                        <StatusBadge status={currentTaskData.status} />
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Beschreibung</Label>
                  {editMode ? (
                    <Textarea
                      value={editedTask.description || ""}
                      onChange={(e) => setEditedTask({...editedTask, description: e.target.value})}
                      className="h-32"
                    />
                  ) : (
                    <p className="text-slate-600">{currentTaskData.description || "Keine Beschreibung"}</p>
                  )}
                </div>

                <TaskSubtasks 
                  subtasks={task.subtasks || []} 
                  onUpdate={handleUpdateSubtasks}
                />

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Fortschritt</Label>
                  <div className="space-y-2">
                    {editMode && (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editedTask.progress}
                        onChange={(e) => {
                          const newProgress = parseInt(e.target.value) || 0;
                          setEditedTask({
                            ...editedTask, 
                            progress: newProgress,
                            status: newProgress === 100 ? 'abgeschlossen' : editedTask.status
                          });
                        }}
                        className="w-24"
                      />
                    )}
                    <div className="flex items-center gap-3">
                      <Progress value={currentTaskData.progress} className="flex-1 h-2" />
                      <span className="text-sm font-semibold text-slate-700">{currentTaskData.progress}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <TaskComments taskId={taskId} />
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="text-sm text-slate-600 mb-1.5 block flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Deadline
                  </Label>
                  {editMode ? (
                    <Input
                      type="date"
                      value={editedTask.deadline || ""}
                      onChange={(e) => setEditedTask({...editedTask, deadline: e.target.value})}
                    />
                  ) : (
                    <p className="font-medium text-slate-900">
                      {currentTaskData.deadline 
                        ? format(new Date(currentTaskData.deadline), "d. MMMM yyyy", { locale: de })
                        : "Keine Deadline"
                      }
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-slate-600 mb-1.5 block flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Zugewiesen an
                  </Label>
                  {editMode ? (
                    <MultiUserSelect
                      selectedUsers={Array.isArray(editedTask.assigned_to) ? editedTask.assigned_to : []}
                      users={users}
                      onChange={(selected) => setEditedTask({...editedTask, assigned_to: selected})}
                    />
                  ) : (
                    <div>
                      {assignedUsers.length > 0 ? (
                        <div className="space-y-1">
                          {assignedUsers.map(email => {
                            const user = users.find(u => u.email === email);
                            return (
                              <p key={email} className="text-sm text-slate-700">
                                {user ? user.full_name : email}
                              </p>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Nicht zugewiesen</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-slate-600 mb-1.5 block">Kategorie</Label>
                  {editMode ? (
                    <Select 
                      value={editedTask.category} 
                      onValueChange={(value) => setEditedTask({...editedTask, category: value})}
                    >
                      <SelectTrigger>
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
                  ) : (
                    <p className="font-medium text-slate-900 capitalize">
                      {currentTaskData.category}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Label className="text-sm text-slate-600 mb-1.5 block">Erstellt am</Label>
                  <p className="text-sm text-slate-700">
                    {format(new Date(task.created_date), "d. MMMM yyyy, HH:mm", { locale: de })}
                  </p>
                </div>

                <div>
                  <Label className="text-sm text-slate-600 mb-1.5 block">Erstellt von</Label>
                  <p className="text-sm text-slate-700">
                    {task.created_by}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Sind Sie sicher, dass Sie "{task.title}" dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTask} className="bg-red-600 hover:bg-red-700">
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}