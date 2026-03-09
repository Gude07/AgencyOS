import React from "react";
import { X, CheckCircle2, AlertTriangle, Euro } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const recommendationConfig = {
  sehr_empfehlenswert: { label: "Sehr empfehlenswert", color: "bg-green-100 text-green-800" },
  empfehlenswert: { label: "Empfehlenswert", color: "bg-blue-100 text-blue-800" },
  bedingt_empfehlenswert: { label: "Bedingt empfehlenswert", color: "bg-yellow-100 text-yellow-800" },
  beobachten: { label: "Beobachten", color: "bg-slate-100 text-slate-700" },
};

export default function PlayerCompareModal({ targets, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-bold text-slate-900 text-lg">Spieler-Vergleich</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-5 overflow-auto">
          <div className={`grid gap-4 ${targets.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {targets.map((target, idx) => {
              const cfg = recommendationConfig[target.recommendation] || recommendationConfig.empfehlenswert;
              return (
                <div key={target.player_id || idx} className="space-y-4">
                  {/* Header */}
                  <div className="p-4 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl text-center">
                    <div className="text-white font-black text-3xl mb-1">{idx + 1}</div>
                    <h3 className="text-white font-bold text-base leading-tight">{target.player_name}</h3>
                    <p className="text-slate-400 text-xs mt-1">{target.position}</p>
                    <p className="text-slate-300 text-xs">{target.current_club} • {target.age} J.</p>
                    <div className="mt-2">
                      <Badge className={`${cfg.color} text-xs border-0`}>{cfg.label}</Badge>
                    </div>
                    <div className="mt-1 text-purple-400 font-bold text-lg">{target.fit_score}%</div>
                  </div>

                  {/* Profile match */}
                  {target.profile_match && (
                    <div className="space-y-1.5 p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Profil-Match</p>
                      {target.profile_match.position_fit && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Position</span>
                          <span className={`font-medium ${target.profile_match.position_fit === "perfekt" ? "text-green-700" : target.profile_match.position_fit === "gut" ? "text-blue-700" : "text-yellow-700"}`}>
                            {target.profile_match.position_fit}
                          </span>
                        </div>
                      )}
                      {target.profile_match.age_fit && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Alter</span>
                          <span className={`font-medium ${target.profile_match.age_fit === "perfekt" ? "text-green-700" : target.profile_match.age_fit === "gut" ? "text-blue-700" : "text-yellow-700"}`}>
                            {target.profile_match.age_fit}
                          </span>
                        </div>
                      )}
                      {target.profile_match.budget_fit && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Budget</span>
                          <span className={`font-medium ${target.profile_match.budget_fit === "im_budget" ? "text-green-700" : target.profile_match.budget_fit === "grenzwertig" ? "text-yellow-700" : "text-red-700"}`}>
                            {target.profile_match.budget_fit.replace("_", " ")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Financials */}
                  {(target.estimated_fee || target.estimated_annual_salary || target.estimated_total_cost_3yr) && (
                    <div className="p-3 bg-slate-50 rounded-lg space-y-1.5">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1 mb-2">
                        <Euro className="w-3 h-3" /> Finanzen
                      </p>
                      {target.estimated_fee && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Ablöse</span>
                          <span className="font-medium text-slate-800">{target.estimated_fee}</span>
                        </div>
                      )}
                      {target.estimated_annual_salary && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Jahresgehalt</span>
                          <span className="font-medium text-slate-800">{target.estimated_annual_salary}</span>
                        </div>
                      )}
                      {target.estimated_total_cost_3yr && (
                        <div className="flex justify-between text-xs border-t border-slate-200 pt-1 mt-1">
                          <span className="text-slate-500 font-medium">Gesamt (3 J.)</span>
                          <span className="font-bold text-purple-800">{target.estimated_total_cost_3yr}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Strengths */}
                  {target.key_strengths?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Stärken
                      </p>
                      <ul className="space-y-1">
                        {target.key_strengths.map((s, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-1">
                            <span className="text-green-500 shrink-0">✓</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Concerns */}
                  {target.concerns?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-red-700 uppercase tracking-wide flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Bedenken
                      </p>
                      <ul className="space-y-1">
                        {target.concerns.map((c, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-1">
                            <span className="text-red-400 shrink-0">!</span> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Transfer approach */}
                  {target.transfer_approach && (
                    <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-xs text-purple-800 leading-relaxed">{target.transfer_approach}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}