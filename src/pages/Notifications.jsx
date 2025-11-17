import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, Check, Trash2, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const notificationIcons = {
  neue_anfrage: "📋",
  neue_antwort: "💬",
  termin_erinnerung: "📅",
  deadline_erinnerung: "⏰",
  spieler_update: "⚽",
  match_vorschlag: "🎯",
};

const notificationColors = {
  neue_anfrage: "bg-blue-50 border-blue-200",
  neue_antwort: "bg-purple-50 border-purple-200",
  termin_erinnerung: "bg-orange-50 border-orange-200",
  deadline_erinnerung: "bg-red-50 border-red-200",
  spieler_update: "bg-green-50 border-green-200",
  match_vorschlag: "bg-yellow-50 border-yellow-200",
};

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("all");

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
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

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      const readNotifications = notifications.filter(n => n.read);
      await Promise.all(readNotifications.map(n => base44.entities.Notification.delete(n.id)));
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
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Benachrichtigungen</h1>
            <p className="text-slate-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} ungelesene Benachrichtigungen` : 'Alle Benachrichtigungen gelesen'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => deleteAllReadMutation.mutate()}
              disabled={deleteAllReadMutation.isPending || notifications.filter(n => n.read).length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Gelesene löschen
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("NotificationSettings"))}
              className="bg-blue-900 hover:bg-blue-800"
            >
              <Settings className="w-4 h-4 mr-2" />
              Einstellungen
            </Button>
          </div>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="all">
              Alle ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Ungelesen ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read">
              Gelesen ({notifications.length - unreadCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-3 mt-6">
            {filteredNotifications.length === 0 ? (
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-12 text-center">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-600">Keine Benachrichtigungen</p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`border-slate-200 cursor-pointer transition-all hover:shadow-md ${
                    !notification.read ? notificationColors[notification.type] + ' border-l-4' : 'bg-white'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl flex-shrink-0">
                        {notificationIcons[notification.type] || "🔔"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">
                              {notification.title}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.read && (
                            <Badge className="bg-blue-900 text-white flex-shrink-0">
                              Neu
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-3">
                          <p className="text-xs text-slate-500">
                            {format(new Date(notification.created_date), "d. MMMM yyyy, HH:mm 'Uhr'", { locale: de })}
                          </p>
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsReadMutation.mutate({ id: notification.id });
                                }}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Als gelesen markieren
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotificationMutation.mutate(notification.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}