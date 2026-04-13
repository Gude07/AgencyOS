import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Plus, X, Building2, CheckCircle, AlertTriangle, TrendingUp, FileText, Save } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

function ScoreBar({ score }) {
  const color = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="font-bold text-sm w-10 text-right">{score}/100</span>
    </div>
  );
}

export default function CoachClubAnalysis({ coach, coachId }) {
  const [targetLeagues, setTargetLeagues] = useState([]);
  const [leagueInput, setLeagueInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addLeague = () => {
    const val = leagueInput.trim();
    if (val && !targetLeagues.includes(val)) {
      setTargetLeagues(prev => [...prev, val]);
    }
    setLeagueInput("");
  };

  const removeLeague = (l) => setTargetLeagues(prev => prev.filter(x => x !== l));

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    setSaved(false);
    try {
      const res = await base44.functions.invoke('analyzeCoachForClubs', {
        coachId,
        targetLeagues: targetLeagues.length > 0 ? targetLeagues : []
      });
      setAnalysis(res.data.analysis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAsDocument = async () => {
    setIsSaving(true);
    try {
      const content = generateHTML(analysis);
      const blob = new Blob([content], { type: 'text/html' });
      const file = new File([blob], `KI-Vereinsanalyse_${coach?.name}_${format(new Date(), 'yyyy-MM-dd')}.html`);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const existing = Array.isArray(coach?.documents) ? coach.documents : [];
      const newDoc = {
        id: `analysis_${Date.now()}`,
        name: `KI-Vereinsanalyse ${format(new Date(), 'dd.MM.yyyy')}`,
        url: file_url,
        uploaded_date: new Date().toISOString(),
        type: 'ki_analyse'
      };
      await base44.entities.Coach.update(coachId, {
        documents: [...existing, newDoc]
      });
      setSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const generateHTML = (a) => {
    if (!a) return '';
    const date = a.analysiert_am ? format(new Date(a.analysiert_am), 'dd.MM.yyyy HH:mm', { locale: de }) : '-';
    const ligen = (a.ziel_ligen || []).join(', ') || 'Alle Ligen';

    const scoreColor = (s) => s >= 75 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626';
    const scoreBar = (s) => `<div style="background:#f1f5f9;border-radius:999px;height:10px;margin:6px 0"><div style="background:${scoreColor(s)};height:10px;border-radius:999px;width:${s}%"></div></div>`;

    const vereineHTML = (a.top_vereine || []).map((v, i) => `
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;background:#fff">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div>
            <div style="font-size:18px;font-weight:700;color:#1e293b">
              <span style="color:#7c3aed">#${i+1}</span> ${v.verein}
            </div>
            ${v.liga ? `<span style="font-size:12px;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;padding:2px 8px;display:inline-block;margin-top:4px">${v.liga}</span>` : ''}
          </div>
          <div style="text-align:right">
            <div style="font-size:28px;font-weight:900;color:#7c3aed">${v.match_score}</div>
            <div style="font-size:11px;color:#94a3b8">Match-Score</div>
          </div>
        </div>
        ${scoreBar(v.match_score)}
        ${v.begruendung ? `<p style="font-size:14px;color:#475569;line-height:1.6;margin:12px 0">${v.begruendung}</p>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">
          ${v.vorteile?.length ? `<div><div style="font-size:12px;font-weight:700;color:#16a34a;margin-bottom:6px">✅ Vorteile</div>${(v.vorteile).map(x => `<div style="font-size:13px;color:#475569;margin-bottom:4px">+ ${x}</div>`).join('')}</div>` : ''}
          ${v.risiken?.length ? `<div><div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:6px">⚠️ Risiken</div>${(v.risiken).map(x => `<div style="font-size:13px;color:#475569;margin-bottom:4px">- ${x}</div>`).join('')}</div>` : ''}
        </div>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KI-Vereinsanalyse: ${a.trainer_name}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:860px;margin:0 auto;padding:32px 24px;background:#f8fafc;color:#1e293b}
  h1{font-size:28px;font-weight:800;margin:0 0 4px}
  .meta{font-size:14px;color:#64748b;margin-bottom:32px}
  .section{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:20px}
  .section-title{font-size:16px;font-weight:700;color:#1e293b;margin:0 0 16px;display:flex;align-items:center;gap:8px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  .label{font-size:13px;font-weight:600;color:#475569;margin-bottom:6px}
  ul{margin:0;padding-left:20px}li{font-size:14px;color:#475569;margin-bottom:4px;line-height:1.5}
  @media(max-width:600px){.grid2{grid-template-columns:1fr}}
</style>
</head>
<body>
<div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:16px;padding:32px;margin-bottom:28px;color:#fff">
  <div style="font-size:13px;opacity:0.8;margin-bottom:8px">🤖 KI-Vereinsanalyse</div>
  <h1 style="color:#fff">${a.trainer_name}</h1>
  <div style="font-size:14px;opacity:0.85;margin-top:8px">Analysiert am ${date} · Ligen: ${ligen}</div>
</div>

<div class="section">
  <div class="section-title">📊 Spielsystem & Gesamtbewertung</div>
  ${a.trainer_bewertung?.spielsystem_analyse ? `<div class="label">Spielsystem-Analyse</div><p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:16px">${a.trainer_bewertung.spielsystem_analyse}</p>` : ''}
  ${a.trainer_bewertung?.gesamtbewertung ? `<div class="label">Gesamtbewertung</div><p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:16px">${a.trainer_bewertung.gesamtbewertung}</p>` : ''}
  <div class="grid2">
    ${a.trainer_bewertung?.staerken?.length ? `<div><div style="font-size:13px;font-weight:700;color:#16a34a;margin-bottom:8px">✅ Stärken</div><ul>${a.trainer_bewertung.staerken.map(s => `<li>${s}</li>`).join('')}</ul></div>` : ''}
    ${a.trainer_bewertung?.schwaechen?.length ? `<div><div style="font-size:13px;font-weight:700;color:#dc2626;margin-bottom:8px">⚠️ Schwächen</div><ul>${a.trainer_bewertung.schwaechen.map(s => `<li>${s}</li>`).join('')}</ul></div>` : ''}
  </div>
</div>

${vereineHTML ? `<div class="section-title" style="font-size:18px;font-weight:700;margin:24px 0 12px">🏆 Top passende Vereine</div>${vereineHTML}` : ''}

<div class="grid2">
  ${a.liga_empfehlungen?.length ? `<div class="section"><div class="section-title">📈 Liga-Empfehlungen</div><ul>${a.liga_empfehlungen.map(l => `<li>${l}</li>`).join('')}</ul></div>` : ''}
  ${a.handlungsempfehlungen?.length ? `<div class="section"><div class="section-title">📋 Handlungsempfehlungen</div><ol style="margin:0;padding-left:20px">${a.handlungsempfehlungen.map(h => `<li style="font-size:14px;color:#475569;margin-bottom:6px;line-height:1.5">${h}</li>`).join('')}</ol></div>` : ''}
</div>

</body></html>`;
  };


    if (!a) return '';
    let txt = `KI-VEREINSANALYSE: ${a.trainer_name}\n`;
    txt += `Analysiert am: ${a.analysiert_am ? format(new Date(a.analysiert_am), "dd.MM.yyyy HH:mm", { locale: de }) : '-'}\n`;
    txt += `Ziel-Ligen: ${(a.ziel_ligen || []).join(', ') || 'Alle'}\n\n`;
    txt += `=== SPIELSYSTEM & BEWERTUNG ===\n${a.trainer_bewertung?.spielsystem_analyse || ''}\n\n`;
    txt += `Gesamtbewertung: ${a.trainer_bewertung?.gesamtbewertung || ''}\n\n`;
    txt += `Stärken: ${(a.trainer_bewertung?.staerken || []).join(', ')}\n`;
    txt += `Schwächen: ${(a.trainer_bewertung?.schwaechen || []).join(', ')}\n\n`;
    txt += `=== TOP-VEREINE ===\n`;
    (a.top_vereine || []).forEach((v, i) => {
      txt += `\n${i + 1}. ${v.verein} (${v.liga}) — Match-Score: ${v.match_score}/100\n`;
      txt += `Begründung: ${v.begruendung}\n`;
      txt += `Vorteile: ${(v.vorteile || []).join(', ')}\n`;
      txt += `Risiken: ${(v.risiken || []).join(', ')}\n`;
    });
    txt += `\n=== LIGA-EMPFEHLUNGEN ===\n${(a.liga_empfehlungen || []).join('\n')}\n\n`;
    txt += `=== HANDLUNGSEMPFEHLUNGEN ===\n${(a.handlungsempfehlungen || []).join('\n')}\n`;
    return txt;
  };

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card className="border-slate-200 bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            KI-Vereinsanalyse für {coach?.name}
          </CardTitle>
          <p className="text-sm text-slate-500">Die KI analysiert das Trainerprofil und findet passende Vereine</p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
              Ziel-Ligen (optional — leer lassen für alle)
            </Label>
            <div className="flex gap-2">
              <Input
                value={leagueInput}
                onChange={(e) => setLeagueInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLeague()}
                placeholder="z.B. Bundesliga, Premier League, Serie A..."
                className="flex-1"
              />
              <Button onClick={addLeague} variant="outline" size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {targetLeagues.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {targetLeagues.map(l => (
                  <Badge key={l} className="bg-purple-100 text-purple-800 border-purple-200 gap-1 pr-1">
                    {l}
                    <button onClick={() => removeLeague(l)} className="ml-1 hover:text-purple-600">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="w-full bg-purple-700 hover:bg-purple-800 text-white"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />KI analysiert... (ca. 30 Sek.)</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Analyse starten</>
            )}
          </Button>
          {isAnalyzing && (
            <p className="text-xs text-slate-500 text-center">
              Die KI wertet das Trainerprofil und Vereinsdaten aus. Bitte warten...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {analysis && (
        <div className="space-y-5">
          {/* Header with save */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Analyseergebnisse</h2>
              <p className="text-sm text-slate-500">
                {analysis.analysiert_am 
                  ? format(new Date(analysis.analysiert_am), "dd.MM.yyyy HH:mm", { locale: de })
                  : ''
                }
                {analysis.ziel_ligen?.length > 0 && ` · Ligen: ${analysis.ziel_ligen.join(', ')}`}
              </p>
            </div>
            <Button
              onClick={saveAsDocument}
              disabled={isSaving || saved}
              variant="outline"
              className={saved ? "border-green-500 text-green-600" : ""}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird gespeichert...</>
              ) : saved ? (
                <><CheckCircle className="w-4 h-4 mr-2" />Gespeichert</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Als Dokument speichern</>
              )}
            </Button>
          </div>

          {/* Trainer Bewertung */}
          <Card className="border-slate-200 bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Spielsystem & Gesamtbewertung
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {analysis.trainer_bewertung?.spielsystem_analyse && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Spielsystem-Analyse</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{analysis.trainer_bewertung.spielsystem_analyse}</p>
                </div>
              )}
              {analysis.trainer_bewertung?.gesamtbewertung && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Gesamtbewertung</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{analysis.trainer_bewertung.gesamtbewertung}</p>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                {analysis.trainer_bewertung?.staerken?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-green-700 mb-2">✅ Stärken</p>
                    <ul className="space-y-1">
                      {analysis.trainer_bewertung.staerken.map((s, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.trainer_bewertung?.schwaechen?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-red-700 mb-2">⚠️ Schwächen</p>
                    <ul className="space-y-1">
                      {analysis.trainer_bewertung.schwaechen.map((s, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-red-400 mt-0.5">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Vereine */}
          {analysis.top_vereine?.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                Top passende Vereine
              </h3>
              <div className="space-y-4">
                {analysis.top_vereine.map((verein, i) => (
                  <Card key={i} className="border-slate-200 bg-white dark:bg-slate-900">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-purple-700">#{i + 1}</span>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">{verein.verein}</h4>
                          </div>
                          {verein.liga && (
                            <Badge variant="outline" className="text-xs mt-1 border-slate-300 text-slate-600">
                              {verein.liga}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-purple-700">{verein.match_score}</div>
                          <div className="text-xs text-slate-500">Match-Score</div>
                        </div>
                      </div>
                      <ScoreBar score={verein.match_score} />
                      {verein.begruendung && (
                        <p className="text-sm text-slate-600 leading-relaxed mt-3">{verein.begruendung}</p>
                      )}
                      <div className="grid md:grid-cols-2 gap-3 mt-3">
                        {verein.vorteile?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-green-700 mb-1">Vorteile</p>
                            <ul className="space-y-0.5">
                              {verein.vorteile.map((v, j) => (
                                <li key={j} className="text-xs text-slate-600 flex items-start gap-1">
                                  <span className="text-green-500">+</span> {v}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {verein.risiken?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-700 mb-1">Risiken</p>
                            <ul className="space-y-0.5">
                              {verein.risiken.map((r, j) => (
                                <li key={j} className="text-xs text-slate-600 flex items-start gap-1">
                                  <span className="text-red-400">-</span> {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Liga Empfehlungen & Handlungsempfehlungen */}
          <div className="grid md:grid-cols-2 gap-4">
            {analysis.liga_empfehlungen?.length > 0 && (
              <Card className="border-slate-200 bg-white dark:bg-slate-900">
                <CardContent className="p-5">
                  <p className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" /> Liga-Empfehlungen
                  </p>
                  <ul className="space-y-2">
                    {analysis.liga_empfehlungen.map((l, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">→</span> {l}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {analysis.handlungsempfehlungen?.length > 0 && (
              <Card className="border-slate-200 bg-white dark:bg-slate-900">
                <CardContent className="p-5">
                  <p className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" /> Handlungsempfehlungen
                  </p>
                  <ul className="space-y-2">
                    {analysis.handlungsempfehlungen.map((h, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">{i + 1}.</span> {h}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}