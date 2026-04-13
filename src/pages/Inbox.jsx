import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Calendar, RefreshCw, MapPin, Clock, User, ExternalLink, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

export default function Inbox() {
  const [data, setData] = useState({ emails: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke("getOutlookInbox", {});
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setData(res.data);
      setLastUpdated(new Date());
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const formatTime = (dateStr) => {
    try { return format(parseISO(dateStr), "d. MMM, HH:mm", { locale: de }); }
    catch { return dateStr; }
  };

  const formatEventTime = (startStr, endStr) => {
    try {
      const start = parseISO(startStr);
      const end = parseISO(endStr);
      return `${format(start, "EEE, d. MMM · HH:mm", { locale: de })} – ${format(end, "HH:mm")} Uhr`;
    } catch { return startStr; }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Posteingang & Kalender</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Deine Outlook E-Mails und bevorstehende Termine auf einen Blick
              {lastUpdated && ` · Aktualisiert: ${format(lastUpdated, "HH:mm")} Uhr`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </Button>
        </div>

        {error && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800 dark:text-orange-300">Verbindungsfehler</p>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                  Outlook ist möglicherweise nicht verbunden. Bitte prüfe die Verbindung in den{" "}
                  <a href="/AccountSettings" className="underline font-medium">Kontoeinstellungen</a>.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : !error && (
          <Tabs defaultValue="calendar">
            <TabsList className="mb-4">
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="w-4 h-4" />
                Termine
                {data.events.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{data.events.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="emails" className="gap-2">
                <Mail className="w-4 h-4" />
                E-Mails
                {data.emails.filter(e => !e.isRead).length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {data.emails.filter(e => !e.isRead).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              {data.events.length === 0 ? (
                <Card>
                  <CardContent className="p-10 text-center text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                    <p>Keine bevorstehenden Termine in den nächsten 7 Tagen</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {data.events.map((event) => (
                    <Card key={event.id} className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white">{event.subject || "Ohne Titel"}</h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                              <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatEventTime(event.start?.dateTime, event.end?.dateTime)}
                              </span>
                              {event.location?.displayName && (
                                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {event.location.displayName}
                                </span>
                              )}
                              {event.organizer?.emailAddress?.name && (
                                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  {event.organizer.emailAddress.name}
                                </span>
                              )}
                            </div>
                            {event.bodyPreview && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 line-clamp-2">{event.bodyPreview}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="emails">
              {data.emails.length === 0 ? (
                <Card>
                  <CardContent className="p-10 text-center text-slate-400">
                    <Mail className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                    <p>Keine E-Mails gefunden</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {data.emails.map((email) => (
                    <Card
                      key={email.id}
                      className={`border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow ${
                        !email.isRead ? "border-l-4 border-l-blue-500" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                            !email.isRead ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}>
                            {email.from?.emailAddress?.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={`text-sm truncate ${!email.isRead ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                                  {email.from?.emailAddress?.name || email.from?.emailAddress?.address}
                                </p>
                                <p className={`truncate ${!email.isRead ? "font-semibold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                                  {email.subject || "(Kein Betreff)"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {!email.isRead && <Badge variant="default" className="bg-blue-600 text-xs">Neu</Badge>}
                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                  {formatTime(email.receivedDateTime)}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">{email.bodyPreview}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}