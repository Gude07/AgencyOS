import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, Smartphone, Save, Clock, MoonStar, Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const notificationTypes = [
  {
    key: "neue_aufgabe",
    label: "Neue Aufgaben",
    description: "Benachrichtigung wenn Ihnen eine neue Aufgabe zugewiesen wird",
    icon: "✅"
  },
  {
    key: "neue_anfrage",
    label: "Neue Anfragen",
    description: "Benachrichtigung bei neuen Vereinsanfragen",
    icon: "📋"
  },
  {
    key: "neue_antwort",
    label: "Neue Antworten",
    description: "Benachrichtigung bei Antworten auf Ihre Anfragen",
    icon: "💬"
  },
  {
    key: "termin_erinnerung",
    label: "Termin-Erinnerungen",
    description: "Erinnerungen an bevorstehende Termine",
    icon: "📅"
  },
  {
    key: "deadline_erinnerung",
    label: "Deadline-Erinnerungen",
    description: "Erinnerungen an Aufgaben-Deadlines",
    icon: "⏰"
  },
  {
    key: "spieler_update",
    label: "Spielerprofil-Updates",
    description: "Updates bei wichtigen Änderungen an Spielerprofilen",
    icon: "⚽"
  },
  {
    key: "match_vorschlag",
    label: "Match-Vorschläge",
    description: "Vorschläge für passende Spieler und Vereine",
    icon: "🎯"
  }
];

const reminderOptions = [
  { value: "15", label: "15 Minuten vorher" },
  { value: "30", label: "30 Minuten vorher" },
  { value: "60", label: "1 Stunde vorher" },
  { value: "120", label: "2 Stunden vorher" },
  { value: "1440", label: "1 Tag vorher" },
];

const digestOptions = [
  { value: "sofort", label: "Sofort" },
  { value: "taeglich", label: "Tägliche Zusammenfassung" },
  { value: "woechentlich", label: "Wöchentliche Zusammenfassung" },
];

const defaultSettings = {
  neue_aufgabe: { in_app: true, email: true },
  neue_anfrage: { in_app: true, email: true },
  neue_antwort: { in_app: true, email: false },
  termin_erinnerung: { in_app: true, email: true },
  deadline_erinnerung: { in_app: true, email: true },
  spieler_update: { in_app: true, email: false },
  match_vorschlag: { in_app: true, email: true },
  reminder_minutes: "30",
  digest_frequency: "sofort",
  dnd_enabled: false,
  dnd_start: "22:00",
  dnd_end: "08:00",
};

export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      if (userData.notification_settings) {
        setSettings({ ...defaultSettings, ...userData.notification_settings });
      }
    }).catch(() => {});
  }, []);

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings) => base44.auth.updateMe({ notification_settings: newSettings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setHasChanges(false);
    },
  });

  const handleToggle = (type, channel) => {
    setSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: !prev[type][channel]
      }
    }));
    setHasChanges(true);
  };



  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Benachrichtigungseinstellungen</h1>
          <p className="text-slate-600 mt-1">Verwalten Sie Ihre Benachrichtigungspräferenzen</p>
        </div>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-900" />
              Benachrichtigungskanäle
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-6">
              {notificationTypes.map((type) => (
                <div key={type.key} className="border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl">{type.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{type.label}</h3>
                      <p className="text-sm text-slate-600 mt-1">{type.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 ml-11">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-slate-500" />
                        <Label htmlFor={`${type.key}-in-app`} className="cursor-pointer">
                          In-App
                        </Label>
                      </div>
                      <Switch
                        id={`${type.key}-in-app`}
                        checked={settings[type.key]?.in_app ?? true}
                        onCheckedChange={() => handleToggle(type.key, 'in_app')}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-slate-500" />
                        <Label htmlFor={`${type.key}-email`} className="cursor-pointer">
                          E-Mail
                        </Label>
                      </div>
                      <Switch
                        id={`${type.key}-email`}
                        checked={settings[type.key]?.email ?? false}
                        onCheckedChange={() => handleToggle(type.key, 'email')}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>


        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-900" />
              Erinnerungs-Timing
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Termin-Erinnerungen erhalten</p>
                <p className="text-sm text-slate-500 mt-0.5">Wie frühzeitig möchtest du an Termine erinnert werden?</p>
              </div>
              <Select
                value={settings.reminder_minutes || "30"}
                onValueChange={(val) => { setSettings(p => ({ ...p, reminder_minutes: val })); setHasChanges(true); }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-900" />
              E-Mail Digest
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Benachrichtigungsfrequenz</p>
                <p className="text-sm text-slate-500 mt-0.5">Wie oft möchtest du E-Mail-Benachrichtigungen erhalten?</p>
              </div>
              <Select
                value={settings.digest_frequency || "sofort"}
                onValueChange={(val) => { setSettings(p => ({ ...p, digest_frequency: val })); setHasChanges(true); }}
              >
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {digestOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <MoonStar className="w-5 h-5 text-blue-900" />
              Bitte nicht stören
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-800">Nicht-stören aktivieren</p>
                <p className="text-sm text-slate-500 mt-0.5">Keine Benachrichtigungen in bestimmten Zeiten</p>
              </div>
              <Switch
                checked={settings.dnd_enabled ?? false}
                onCheckedChange={(val) => { setSettings(p => ({ ...p, dnd_enabled: val })); setHasChanges(true); }}
              />
            </div>
            {settings.dnd_enabled && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label className="text-sm text-slate-700 mb-1 block">Von</Label>
                  <input
                    type="time"
                    value={settings.dnd_start || "22:00"}
                    onChange={(e) => { setSettings(p => ({ ...p, dnd_start: e.target.value })); setHasChanges(true); }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Label className="text-sm text-slate-700 mb-1 block">Bis</Label>
                  <input
                    type="time"
                    value={settings.dnd_end || "08:00"}
                    onChange={(e) => { setSettings(p => ({ ...p, dnd_end: e.target.value })); setHasChanges(true); }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {hasChanges && (
          <div className="sticky bottom-4 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
              className="bg-blue-900 hover:bg-blue-800 shadow-lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateSettingsMutation.isPending ? "Wird gespeichert..." : "Einstellungen speichern"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}