import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Mail, Calendar, User, RefreshCw, ExternalLink } from "lucide-react";

const steps = [
  {
    icon: User,
    title: "Konto verknüpfen",
    desc: "Microsoft-Konto mit der App verbinden",
    permission: "User.Read"
  },
  {
    icon: Mail,
    title: "E-Mails lesen & senden",
    desc: "Auf deinen Posteingang zugreifen und E-Mails versenden",
    permission: "Mail.ReadWrite, Mail.Send"
  },
  {
    icon: Calendar,
    title: "Kalender synchronisieren",
    desc: "Termine lesen und in Outlook erstellen",
    permission: "Calendars.ReadWrite"
  },
];

export default function OutlookConnectionCard() {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null); // null | 'connected' | 'error'

  const testConnection = async () => {
    setTesting(true);
    setStatus(null);
    const res = await base44.functions.invoke("getOutlookInbox", {});
    setStatus(res.data?.error ? "error" : "connected");
    setTesting(false);
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <CardTitle className="text-slate-900 dark:text-white">Outlook-Verbindung</CardTitle>
          </div>
          {status === "connected" && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200">
              ✓ Verbunden
            </Badge>
          )}
          {status === "error" && (
            <Badge variant="destructive">Nicht verbunden</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Durch die Verbindung mit Outlook kannst du E-Mails direkt aus der App senden, deinen Kalender synchronisieren und Termine automatisch erstellen lassen.
        </p>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Was wird synchronisiert:</p>
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                <step.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{step.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.desc}</p>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-mono">{step.permission}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
            </div>
          ))}
        </div>

        {status === "error" && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            Die Verbindung zu Outlook konnte nicht hergestellt werden. Bitte wende dich an einen Administrator, um die Outlook-Integration zu autorisieren.
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={testConnection}
          disabled={testing}
        >
          <RefreshCw className={`w-4 h-4 ${testing ? "animate-spin" : ""}`} />
          {testing ? "Verbindung wird geprüft..." : "Verbindung testen"}
        </Button>
      </CardContent>
    </Card>
  );
}