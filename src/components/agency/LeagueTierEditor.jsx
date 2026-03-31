import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Save, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { DEFAULT_LEAGUE_TIER_CONFIGS } from "@/utils/matchmaking";

function formatMV(val) {
  if (!val && val !== 0) return "?";
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M €`;
  return `${(val / 1_000).toFixed(0)}K €`;
}

export default function LeagueTierEditor({ agencyId, onClose }) {
  const queryClient = useQueryClient();
  const [configs, setConfigs] = useState(null);
  const [newLeague, setNewLeague] = useState({});
  const [expanded, setExpanded] = useState({1: true, 2: false, 3: false, 4: false});

  const { data: agency } = useQuery({
    queryKey: ["agency", agencyId],
    queryFn: () => base44.entities.Agency.list().then(a => a.find(ag => ag.id === agencyId)),
    enabled: !!agencyId,
  });

  useEffect(() => {
    if (agency) {
      const existing = agency.league_tier_configs;
      if (existing && existing.length > 0) {
        setConfigs(existing);
      } else {
        setConfigs(DEFAULT_LEAGUE_TIER_CONFIGS.map(t => ({ ...t, leagues: [...t.leagues] })));
      }
    }
  }, [agency]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Agency.update(agencyId, { league_tier_configs: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
  });

  if (!configs) return <div className="p-8 text-center text-slate-400">Lade Konfiguration...</div>;

  const updateTierField = (tierNum, field, value) => {
    setConfigs(prev => prev.map(t => t.tier_number === tierNum ? { ...t, [field]: value } : t));
  };

  const addLeague = (tierNum) => {
    const val = newLeague[tierNum]?.trim();
    if (!val) return;
    setConfigs(prev => prev.map(t =>
      t.tier_number === tierNum ? { ...t, leagues: [...(t.leagues || []), val] } : t
    ));
    setNewLeague(prev => ({ ...prev, [tierNum]: "" }));
  };

  const removeLeague = (tierNum, league) => {
    setConfigs(prev => prev.map(t =>
      t.tier_number === tierNum ? { ...t, leagues: t.leagues.filter(l => l !== league) } : t
    ));
  };

  const tierColors = {
    1: "border-yellow-300 bg-yellow-50",
    2: "border-blue-300 bg-blue-50",
    3: "border-green-300 bg-green-50",
    4: "border-slate-300 bg-slate-50",
  };
  const tierBadgeColors = {
    1: "bg-yellow-100 text-yellow-800 border-yellow-300",
    2: "bg-blue-100 text-blue-800 border-blue-300",
    3: "bg-green-100 text-green-800 border-green-300",
    4: "bg-slate-100 text-slate-700 border-slate-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-500">
          Definieren Sie welche Ligen zu welchem Tier gehören. Das System erkennt Ligen aus Vereinsanfragen und ordnet sie automatisch zu.
        </p>
      </div>

      {configs.map((tier) => (
        <div key={tier.tier_number} className={`rounded-xl border-2 ${tierColors[tier.tier_number]} overflow-hidden`}>
          <button
            className="w-full flex items-center justify-between p-4 text-left"
            onClick={() => setExpanded(prev => ({ ...prev, [tier.tier_number]: !prev[tier.tier_number] }))}
          >
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${tierBadgeColors[tier.tier_number]}`}>
                Tier {tier.tier_number}
              </span>
              <div>
                <p className="font-semibold text-slate-900">{tier.tier_name}</p>
                <p className="text-xs text-slate-500">{tier.leagues?.length || 0} Ligen · {formatMV(tier.min_market_value)} – {formatMV(tier.max_market_value)}</p>
              </div>
            </div>
            {expanded[tier.tier_number] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expanded[tier.tier_number] && (
            <div className="px-4 pb-4 space-y-4 border-t border-current border-opacity-20">
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">Tier-Name</Label>
                  <Input
                    value={tier.tier_name || ""}
                    onChange={(e) => updateTierField(tier.tier_number, 'tier_name', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Min. Marktwert (€)</Label>
                    <Input
                      type="number"
                      value={tier.min_market_value || ""}
                      onChange={(e) => updateTierField(tier.tier_number, 'min_market_value', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Max. Marktwert (€)</Label>
                    <Input
                      type="number"
                      value={tier.max_market_value || ""}
                      onChange={(e) => updateTierField(tier.tier_number, 'max_market_value', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-600 mb-1 block">Beschreibung</Label>
                <Textarea
                  value={tier.description || ""}
                  onChange={(e) => updateTierField(tier.tier_number, 'description', e.target.value)}
                  className="h-16 text-sm"
                  placeholder="Welche Art von Ligen gehören in dieses Tier?"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-600 mb-2 block">Ligen in diesem Tier</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(tier.leagues || []).map((league) => (
                    <Badge key={league} variant="outline" className={`${tierBadgeColors[tier.tier_number]} pr-1 flex items-center gap-1`}>
                      {league}
                      <button onClick={() => removeLeague(tier.tier_number, league)} className="ml-1 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {(tier.leagues || []).length === 0 && (
                    <p className="text-xs text-slate-400 italic">Noch keine Ligen hinzugefügt</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Liga hinzufügen (z.B. Bundesliga)"
                    value={newLeague[tier.tier_number] || ""}
                    onChange={(e) => setNewLeague(prev => ({ ...prev, [tier.tier_number]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addLeague(tier.tier_number)}
                    className="h-8 text-sm flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={() => addLeague(tier.tier_number)} className="h-8">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-end gap-2 pt-2">
        {onClose && (
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        )}
        <Button
          onClick={() => updateMutation.mutate(configs)}
          disabled={updateMutation.isPending}
          className="bg-blue-900 hover:bg-blue-800"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? "Speichern..." : "Konfiguration speichern"}
        </Button>
      </div>
    </div>
  );
}