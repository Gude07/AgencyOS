import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, Smartphone, Save } from "lucide-react";

const notificationTypes = [
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

const defaultSettings = {
  neue_anfrage: { in_app: true, email: true },
  neue_antwort: { in_app: true, email: false },
  termin_erinnerung: { in_app: true, email: true },
  deadline_erinnerung: { in_app: true, email: true },
  spieler_update: { in_app: true, email: false },
  match_vorschlag: { in_app: true, email: true },
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