import React from "react";
import { Badge } from "@/components/ui/badge";
import { Circle, Clock, Eye, CheckCircle2, AlertTriangle } from "lucide-react";

const statusConfig = {
  offen: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    icon: Circle,
  },
  in_bearbeitung: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-200",
    icon: Clock,
  },
  review: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-200",
    icon: Eye,
  },
  abgeschlossen: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200",
    icon: CheckCircle2,
  },
  überfällig: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-200",
    icon: AlertTriangle,
  },
};

export default function StatusBadge({ status, showIcon = true }) {
  const config = statusConfig[status] || statusConfig.offen;
  const Icon = config.icon;

  return (
    <Badge 
      className={`${config.bg} ${config.text} border ${config.border} font-medium`}
      variant="secondary"
    >
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}