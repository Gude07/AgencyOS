import React from "react";
import { ExternalLink } from "lucide-react";

/**
 * Kleiner, klickbarer Kader-Link (Transfermarkt), der in Karten angezeigt wird.
 * Stoppt die Weitergabe des Klicks, damit nicht die Karte geöffnet wird.
 */
export default function KaderLink({ url, className = "", compact = false }) {
  if (!url) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Transfermarkt-Kader öffnen"
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900 transition-colors ${className}`}
    >
      <ExternalLink className="w-3.5 h-3.5" />
      {!compact && <span>Kader</span>}
    </button>
  );
}