import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowUp, Minus, ArrowDown } from "lucide-react";

const priorityConfig = {
  kritisch: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-200",
    icon: AlertCircle,
  },
  hoch: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-200",
    icon: ArrowUp,
  },
  mittel: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-200",
    icon: Minus,
  },
  niedrig: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: ArrowDown,
  },
};

export default function PriorityBadge({ priority, showIcon = true }) {
  const config = priorityConfig[priority] || priorityConfig.mittel;
  const Icon = config.icon;

  return (
    <Badge 
      className={`${config.bg} ${config.text} border ${config.border} font-medium`}
      variant="secondary"
    >
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {priority}
    </Badge>
  );
}