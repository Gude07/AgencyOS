import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Check, X, Settings, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const notificationIcons = {
  neue_aufgabe: "✅",
  neue_anfrage: "📋",
  neue_antwort: "💬",
  termin_erinnerung: "📅",
  deadline_erinnerung: "⏰",
  spieler_update: "⚽",
  match_vorschlag: "🎯",
};

const notificationColors = {
  neue_aufgabe: "bg-emerald-50 border-emerald-200",
  neue_anfrage: "bg-blue-50 border-blue-200",
  neue_antwort: "bg-purple-50 border-purple-200",
  termin_erinnerung: "bg-orange-50 border-orange-200",
  deadline_erinnerung: "bg-red-50 border-red-200",
  spieler_update: "bg-green-50 border-green-200",
  match_vorschlag: "bg-yellow-50 border-yellow-200",
};

const filterLabels = {
  alle: "Alle",
  ungelesen: "Ungelesen",
  neue_aufgabe: "✅ Aufgaben",
  deadline_erinnerung: "⏰ Deadlines",
  termin_erinnerung: "📅 Termine",
  match_vorschlag: "🎯 Matches",
};

export default function NotificationCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState("alle");

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
    refetchInterval: 30000, // Alle 30 Sekunden aktualisieren
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => base44.entities.Notification.update(n.id, { read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate({ id: notification.id });
    }
    if (notification.link) {
      navigate(createPageUrl(notification.link));
      setOpen(false);
    }
  };

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(notifications.map(n => base44.entities.Notification.delete(n.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "alle") return notifications.slice(0, 20);
    if (activeFilter === "ungelesen") return notifications.filter(n => !n.read).slice(0, 20);
    return notifications.filter(n => n.type === activeFilter).slice(0, 20);
  }, [notifications, activeFilter]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Benachrichtigungen</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  title="Alle als gelesen markieren"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Alle lesen
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-500 hover:text-red-600"
                  onClick={() => deleteAllMutation.mutate()}
                  disabled={deleteAllMutation.isPending}
                  title="Alle löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => { navigate(createPageUrl("NotificationSettings")); setOpen(false); }}
                title="Einstellungen"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* Filter Tabs */}
          <div className="flex gap-1 mt-3 flex-wrap">
            {Object.entries(filterLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  activeFilter === key
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                {label}
                {key === "ungelesen" && unreadCount > 0 && (
                  <span className="ml-1 bg-red-500 text-white rounded-full px-1 text-[10px]">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[460px] overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">Keine Benachrichtigungen</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    !notification.read
                      ? `${notificationColors[notification.type]} border-l-4`
                      : 'hover:bg-slate-50 opacity-70'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <span className="text-2xl">{notificationIcons[notification.type] || "🔔"}</span>
                      {!notification.read && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">
                          {notification.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notification.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {format(new Date(notification.created_date), "d. MMM, HH:mm", { locale: de })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 20 && (
          <div className="border-t border-slate-200 p-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { navigate(createPageUrl("Notifications")); setOpen(false); }}
            >
              Alle anzeigen ({notifications.length})
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}