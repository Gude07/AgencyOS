import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  parseISO,
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CreateEventDialog from "../components/calendar/CreateEventDialog";
import CreateTeamsMeetingDialog from "../components/meetings/CreateTeamsMeetingDialog";

const priorityColors = {
  niedrig: "bg-emerald-100 text-emerald-800 border-emerald-200",
  mittel: "bg-yellow-100 text-yellow-800 border-yellow-200",
  hoch: "bg-orange-100 text-orange-800 border-orange-200",
  kritisch: "bg-red-100 text-red-800 border-red-200",
  dringend: "bg-red-100 text-red-800 border-red-200",
};

export default function Calendar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState("month"); // month, week, day
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTeamsMeetingDialog, setShowTeamsMeetingDialog] = useState(false);
  const [createDialogDate, setCreateDialogDate] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const all = await base44.entities.Task.list();
      return all.filter(t => t.agency_id === user.agency_id);
    },
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const all = await base44.entities.Meeting.list();
      return all.filter(m => m.agency_id === user.agency_id);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Meeting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  const getEventsForDate = (date) => {
    const taskEvents = tasks
      .filter(task => task.deadline && isSameDay(new Date(task.deadline), date))
      .map(task => ({ ...task, type: 'task' }));
    
    const meetingEvents = meetings
      .filter(meeting => meeting.start_date && isSameDay(new Date(meeting.start_date), date))
      .map(meeting => ({ ...meeting, type: 'meeting' }));
    
    return [...taskEvents, ...meetingEvents];
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceDate = parseISO(result.source.droppableId);
    const destDate = parseISO(result.destination.droppableId);
    
    if (isSameDay(sourceDate, destDate)) return;

    const eventId = result.draggableId.split('-')[1];
    const eventType = result.draggableId.split('-')[0];

    if (eventType === 'task') {
      const task = tasks.find(t => t.id === eventId);
      if (task) {
        updateTaskMutation.mutate({
          id: eventId,
          data: { ...task, deadline: format(destDate, 'yyyy-MM-dd') }
        });
      }
    } else if (eventType === 'meeting') {
      const meeting = meetings.find(m => m.id === eventId);
      if (meeting) {
        updateMeetingMutation.mutate({
          id: eventId,
          data: { ...meeting, start_date: destDate.toISOString() }
        });
      }
    }
  };

  const handlePrevious = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-semibold text-slate-600 py-2">
              {day}
            </div>
          ))}
          {calendarDays.map((day, index) => {
            const events = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const dateId = format(day, 'yyyy-MM-dd');

            return (
              <Droppable key={index} droppableId={dateId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      min-h-[100px] p-2 rounded-lg transition-all duration-200
                      ${!isCurrentMonth && 'opacity-30'}
                      ${isSelected && 'bg-blue-50 ring-2 ring-blue-900'}
                      ${!isSelected && isToday && 'bg-blue-100'}
                      ${snapshot.isDraggingOver && 'bg-blue-200'}
                      ${!isSelected && !isToday && !snapshot.isDraggingOver && 'hover:bg-slate-100'}
                    `}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className={`text-sm font-medium ${isToday ? 'text-blue-900 font-bold' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreateDialogDate(day);
                          setShowCreateDialog(true);
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 3).map((event, i) => (
                        <Draggable
                          key={`${event.type}-${event.id}`}
                          draggableId={`${event.type}-${event.id}`}
                          index={i}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`
                                px-2 py-1 rounded text-xs truncate cursor-move
                                ${event.type === 'task' 
                                  ? event.priority && priorityColors[event.priority]
                                    ? priorityColors[event.priority]
                                    : 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                                }
                                ${snapshot.isDragging && 'shadow-lg opacity-80'}
                              `}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (event.type === 'task') {
                                  navigate(createPageUrl("TaskDetail") + "?id=" + event.id);
                                } else if (event.type === 'meeting') {
                                  navigate(createPageUrl("MeetingDetail") + "?id=" + event.id);
                                }
                              }}
                            >
                              {event.title}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {events.length > 3 && (
                        <div className="text-xs text-slate-500 pl-2">
                          +{events.length - 3} mehr
                        </div>
                      )}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, index) => {
            const events = getEventsForDate(day);
            const isToday = isSameDay(day, new Date());
            const dateId = format(day, 'yyyy-MM-dd');

            return (
              <Droppable key={index} droppableId={dateId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      rounded-lg border transition-all
                      ${isToday ? 'border-blue-900 bg-blue-50' : 'border-slate-200 bg-white'}
                      ${snapshot.isDraggingOver && 'bg-blue-100'}
                    `}
                  >
                    <div className="p-3 border-b border-slate-100">
                      <div className="text-center">
                        <div className="text-xs text-slate-600 uppercase">
                          {format(day, 'EEE', { locale: de })}
                        </div>
                        <div className={`text-xl font-bold ${isToday ? 'text-blue-900' : 'text-slate-900'}`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 space-y-2 min-h-[400px]">
                      {events.map((event, i) => (
                        <Draggable
                          key={`${event.type}-${event.id}`}
                          draggableId={`${event.type}-${event.id}`}
                          index={i}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`
                                p-2 rounded-lg cursor-move
                                ${event.type === 'task' 
                                  ? event.priority && priorityColors[event.priority]
                                    ? priorityColors[event.priority]
                                    : 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                                }
                                ${snapshot.isDragging && 'shadow-lg opacity-80'}
                              `}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (event.type === 'task') {
                                  navigate(createPageUrl("TaskDetail") + "?id=" + event.id);
                                } else if (event.type === 'meeting') {
                                  navigate(createPageUrl("MeetingDetail") + "?id=" + event.id);
                                }
                              }}
                            >
                              <div className="text-xs font-semibold">{event.title}</div>
                              {event.description && (
                                <div className="text-xs opacity-75 line-clamp-1 mt-1">
                                  {event.description}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 opacity-50 hover:opacity-100"
                        onClick={() => {
                          setCreateDialogDate(day);
                          setShowCreateDialog(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Hinzufügen
                      </Button>
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    );
  };

  const renderDayView = () => {
    const events = getEventsForDate(currentDate);
    const dateId = format(currentDate, 'yyyy-MM-dd');

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={dateId}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-3 ${snapshot.isDraggingOver && 'bg-blue-50'} p-4 rounded-lg min-h-[500px]`}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {format(currentDate, 'EEEE, d. MMMM yyyy', { locale: de })}
                  </h2>
                  <p className="text-slate-600 mt-1">{events.length} Ereignisse</p>
                </div>
                <Button
                  onClick={() => {
                    setCreateDialogDate(currentDate);
                    setShowCreateDialog(true);
                  }}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Hinzufügen
                </Button>
              </div>

              {events.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>Keine Ereignisse an diesem Tag</p>
                </div>
              ) : (
                events.map((event, i) => (
                  <Draggable
                    key={`${event.type}-${event.id}`}
                    draggableId={`${event.type}-${event.id}`}
                    index={i}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`
                          p-4 rounded-lg cursor-move border
                          ${event.type === 'task' 
                            ? event.priority && priorityColors[event.priority]
                              ? priorityColors[event.priority] + ' border-current'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-purple-100 text-purple-800 border-purple-200'
                          }
                          ${snapshot.isDragging && 'shadow-lg opacity-80'}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (event.type === 'task') {
                            navigate(createPageUrl("TaskDetail") + "?id=" + event.id);
                          } else if (event.type === 'meeting') {
                            navigate(createPageUrl("MeetingDetail") + "?id=" + event.id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {event.type === 'task' ? 'Aufgabe' : 'Termin'}
                          </Badge>
                          {event.priority && (
                            <Badge variant="secondary" className="text-xs">
                              {event.priority}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm opacity-90">{event.description}</p>
                        )}
                        {event.location && (
                          <p className="text-sm mt-2">📍 {event.location}</p>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Kalender</h1>
            <p className="text-slate-600 mt-1">Termine und Deadlines im Überblick</p>
          </div>
        </div>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevious}
                  className="border-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="min-w-[200px] text-center">
                  <CardTitle className="text-xl font-bold">
                    {view === "month" && format(currentDate, "MMMM yyyy", { locale: de })}
                    {view === "week" && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d. MMM", { locale: de })} - ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), "d. MMM yyyy", { locale: de })}`}
                    {view === "day" && format(currentDate, "d. MMMM yyyy", { locale: de })}
                  </CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  className="border-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleToday}
                  className="border-slate-200"
                >
                  Heute
                </Button>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Termin erstellen
                </Button>
                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                  <Button
                    variant={view === "month" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setView("month")}
                    className={view === "month" ? "bg-blue-900 text-white" : ""}
                  >
                    Monat
                  </Button>
                  <Button
                    variant={view === "week" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setView("week")}
                    className={view === "week" ? "bg-blue-900 text-white" : ""}
                  >
                    Woche
                  </Button>
                  <Button
                    variant={view === "day" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setView("day")}
                    className={view === "day" ? "bg-blue-900 text-white" : ""}
                  >
                    Tag
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {view === "month" && renderMonthView()}
            {view === "week" && renderWeekView()}
            {view === "day" && renderDayView()}
          </CardContent>
        </Card>

        {view === "month" && (
          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">
                {format(selectedDate, "d. MMMM yyyy", { locale: de })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm mb-3">Keine Termine an diesem Tag</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCreateDialogDate(selectedDate);
                      setShowCreateDialog(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ereignis hinzufügen
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => {
                        if (event.type === 'task') {
                          navigate(createPageUrl("TaskDetail") + "?id=" + event.id);
                        } else if (event.type === 'meeting') {
                          navigate(createPageUrl("MeetingDetail") + "?id=" + event.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Badge 
                          variant="secondary"
                          className={
                            event.type === 'task' 
                              ? event.priority && priorityColors[event.priority]
                                ? priorityColors[event.priority]
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-purple-100 text-purple-800 border-purple-200'
                          }
                        >
                          {event.type === 'task' ? 'Aufgabe' : 'Termin'}
                        </Badge>
                        {event.priority && (
                          <Badge variant="secondary" className="text-xs">
                            {event.priority}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-1">
                        {event.title}
                      </h4>
                      {event.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      {event.location && (
                        <p className="text-xs text-slate-500 mt-1">📍 {event.location}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <CreateEventDialog
        open={showCreateDialog && !showTeamsMeetingDialog}
        onOpenChange={setShowCreateDialog}
        initialDate={createDialogDate}
      />
      <CreateTeamsMeetingDialog
        open={showTeamsMeetingDialog}
        onOpenChange={setShowTeamsMeetingDialog}
      />
    </div>
  );
}