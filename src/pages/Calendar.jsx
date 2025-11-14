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
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Calendar() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list(),
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date) => {
    const taskEvents = tasks
      .filter(task => task.deadline && isSameDay(new Date(task.deadline), date))
      .map(task => ({ ...task, type: 'task' }));
    
    const meetingEvents = meetings
      .filter(meeting => meeting.start_date && isSameDay(new Date(meeting.start_date), date))
      .map(meeting => ({ ...meeting, type: 'meeting' }));
    
    return [...taskEvents, ...meetingEvents];
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Kalender</h1>
            <p className="text-slate-600 mt-1">Termine und Deadlines im Überblick</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold">
                    {format(currentMonth, "MMMM yyyy", { locale: de })}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="border-slate-200"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentMonth(new Date())}
                      className="border-slate-200"
                    >
                      Heute
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="border-slate-200"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-slate-600 py-2">
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((day, index) => {
                    const events = getEventsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          aspect-square p-2 rounded-lg transition-all duration-200
                          ${!isCurrentMonth && 'opacity-30'}
                          ${isSelected && 'bg-blue-900 text-white shadow-md'}
                          ${!isSelected && isToday && 'bg-blue-100 text-blue-900 font-bold'}
                          ${!isSelected && !isToday && 'hover:bg-slate-100'}
                        `}
                      >
                        <div className="text-sm font-medium mb-1">
                          {format(day, 'd')}
                        </div>
                        {events.length > 0 && (
                          <div className="flex justify-center gap-0.5">
                            {events.slice(0, 3).map((_, i) => (
                              <div
                                key={i}
                                className={`w-1 h-1 rounded-full ${
                                  isSelected ? 'bg-white' : 'bg-blue-900'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
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
                    <p className="text-sm">Keine Termine an diesem Tag</p>
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
                          }
                        }}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <Badge 
                            variant="secondary"
                            className={
                              event.type === 'task' 
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
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

            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">Legende</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-900 rounded-full" />
                  <span className="text-sm text-slate-700">Termine & Deadlines</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-900">15</span>
                  </div>
                  <span className="text-sm text-slate-700">Heute</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-white">15</span>
                  </div>
                  <span className="text-sm text-slate-700">Ausgewählter Tag</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}