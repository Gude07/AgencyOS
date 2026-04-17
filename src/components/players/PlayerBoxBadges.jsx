import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const BOX_COLOR_CLASSES = {
  blue:   "border-blue-300 bg-blue-50 text-blue-800",
  green:  "border-green-300 bg-green-50 text-green-800",
  purple: "border-purple-300 bg-purple-50 text-purple-800",
  orange: "border-orange-300 bg-orange-50 text-orange-800",
  red:    "border-red-300 bg-red-50 text-red-800",
  slate:  "border-slate-300 bg-slate-100 text-slate-700",
};

const BOX_DOT_CLASSES = {
  blue: "bg-blue-500", green: "bg-green-500", purple: "bg-purple-500",
  orange: "bg-orange-500", red: "bg-red-500", slate: "bg-slate-500",
};

function useAllBoxes() {
  return useQuery({
    queryKey: ["playerBoxes"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const all = await base44.entities.PlayerBox.list("order");
      return all.filter(b => b.agency_id === user.agency_id);
    },
    staleTime: 30000,
  });
}

export default function PlayerBoxBadges({ playerBoxes }) {
  const { data: boxes = [] } = useAllBoxes();
  const assignedBoxes = boxes.filter(b => Array.isArray(playerBoxes) && playerBoxes.includes(b.id));
  if (assignedBoxes.length === 0) return null;
  return (
    <>
      {assignedBoxes.map(box => (
        <Badge
          key={box.id}
          variant="outline"
          className={`text-xs flex items-center gap-1 ${BOX_COLOR_CLASSES[box.color] || BOX_COLOR_CLASSES.slate}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${BOX_DOT_CLASSES[box.color] || BOX_DOT_CLASSES.slate}`} />
          {box.name}
        </Badge>
      ))}
    </>
  );
}

// Edit variant: checkboxes to toggle box membership
export function PlayerBoxEditor({ playerBoxes = [], onChange }) {
  const { data: boxes = [] } = useAllBoxes();
  if (boxes.length === 0) return null;

  const toggle = (boxId) => {
    const current = Array.isArray(playerBoxes) ? playerBoxes : [];
    const next = current.includes(boxId)
      ? current.filter(b => b !== boxId)
      : [...current, boxId];
    onChange(next);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {boxes.map(box => {
        const isIn = Array.isArray(playerBoxes) && playerBoxes.includes(box.id);
        const colorClass = BOX_COLOR_CLASSES[box.color] || BOX_COLOR_CLASSES.slate;
        const dotClass = BOX_DOT_CLASSES[box.color] || BOX_DOT_CLASSES.slate;
        return (
          <button
            key={box.id}
            type="button"
            onClick={() => toggle(box.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
              isIn
                ? `${colorClass} border-current shadow-sm`
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isIn ? dotClass : "bg-slate-300"}`} />
            {box.name}
            {isIn && <Check className="w-3.5 h-3.5" />}
          </button>
        );
      })}
    </div>
  );
}