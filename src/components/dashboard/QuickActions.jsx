import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, UserPlus, Building2, Sparkles, Calendar, FileText } from "lucide-react";

const actions = [
  { label: "Neue Aufgabe", icon: Plus, color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200", url: "Tasks", params: "?new=true" },
  { label: "Spieler hinzufügen", icon: UserPlus, color: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200", url: "Players", params: "?new=true" },
  { label: "Vereinsanfrage", icon: Building2, color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200", url: "ClubRequests", params: "?new=true" },
  { label: "Termin erstellen", icon: Calendar, color: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200", url: "Calendar", params: "" },
  { label: "KI-Analyse", icon: Sparkles, color: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200", url: "AIChat", params: "" },
  { label: "Notiz erstellen", icon: FileText, color: "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200", url: "OrganizationalOverview", params: "" },
];

export default function QuickActions() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Schnellaktionen</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={createPageUrl(action.url) + action.params}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150 ${action.color}`}
          >
            <action.icon className="w-5 h-5" />
            <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}