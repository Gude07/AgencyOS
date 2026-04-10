import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, TrendingDown, Minus, Loader2, ExternalLink, 
  Save, AlertTriangle, Target, Clock, BarChart2, Users,
  ArrowUpRight, ArrowDownRight, CheckCircle, Info
} from "lucide-react";
import { toast } from "sonner";

function formatValue(v) {
  if (!v && v !== 0) return "—";
  if (typeof v === "string") return v;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)} Mio €`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)} Tsd €`;
  return `${v} €`;
}

function TrendBadge({ direction }) {
  const map = {
    "stark steigend": { color: "bg-green-100 text-green-800", icon: <ArrowUpRight className="w-3 h-3" /> },
    "steigend": { color: "bg-green-50 text-green-700", icon: <ArrowUpRight className="w-3 h-3" /> },
    "stabil": { color: "bg-slate-100 text-slate-700", icon: <Minus className="w-3 h-3" /> },
    "fallend": { color: "bg-red-50 text-red-700", icon: <ArrowDownRight className="w-3 h-3" /> },
    "stark fallend": { color: "bg-red-100 text-red-800", icon: <ArrowDownRight className="w-3 h-3" /> },
  };
  const style = map[direction] || map["stabil"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${style.color}`}>
      {style.icon}{direction}
    </span>
  );
}

function RelevanceBadge({ r }) {
  const map = { hoch: "bg-red-100 text-red-700", mittel: "bg-yellow-100 text-yellow-700", niedrig: "bg-slate-100 text-slate-600" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[r] || map.mittel}`}>{r}</span>;
}

function LikelihoodBadge({ l }) {
  const map = {
    "sehr wahrscheinlich": "bg-green-100 text-green-800",
    "wahrscheinlich": "bg-blue-100 text-blue-800",
    "möglich": "bg-yellow-100 text-yellow-700",
    "spekulativ": "bg-slate-100 text-slate-600"
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[l] || "bg-slate-100 text-slate-600"}`}>{l}</span>;
}

function buildHtmlDocument(analysis, player, generatedAt) {
  const newsHtml = (analysis.current_news || []).map(n => `
    <div class="news-card">
      <div class="news-header">
        <span class="headline">${n.headline || ""}</span>
        <span class="relevance-badge relevance-${n.relevance || "mittel"}">${n.relevance || "mittel"}</span>
      </div>
      <p class="summary">${n.summary || ""}</p>
      <div class="source-row">
        <span>📰 Quelle: ${n.source || "Unbekannt"}</span>
        ${n.date ? `<span>${n.date}</span>` : ""}
        ${n.source_url ? `<a href="${n.source_url}" target="_blank" class="source-link">🔗 Quelle öffnen</a>` : ""}
      </div>
    </div>`).join("");

  const transfersHtml = (analysis.comparable_transfers || []).map(t => `
    <div class="transfer-row">
      <div>
        <strong>${t.player || ""}</strong>${t.age_at_transfer ? ` (${t.age_at_transfer})` : ""}
        <div class="transfer-clubs">${t.from_club || ""} → ${t.to_club || ""}</div>
        ${t.similarity_reason ? `<div class="similarity">${t.similarity_reason}</div>` : ""}
      </div>
      <div class="transfer-fee">
        <span class="fee-badge">${t.fee || "k.A."}</span>
        <div class="transfer-date">${t.date || ""}</div>
      </div>
    </div>`).join("");

  const clubsHtml = (analysis.interested_clubs || []).map(c => `
    <div class="club-row">
      <div>
        <strong>${c.club || ""}</strong>
        ${c.league ? `<span class="league-tag">${c.league}</span>` : ""}
        ${c.reason ? `<div class="club-reason">${c.reason}</div>` : ""}
      </div>
      <span class="likelihood-${(c.likelihood || "").replace(/ /g, "-")}">${c.likelihood || ""}</span>
    </div>`).join("");

  const risksHtml = (analysis.risks_opportunities?.risks || []).map(r => `<li>${r}</li>`).join("");
  const oppsHtml = (analysis.risks_opportunities?.opportunities || []).map(o => `<li>${o}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Markttrend-Analyse – ${player.name || "Spieler"}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f8fafc; color: #1e293b; }
    .header { background: linear-gradient(135deg,#1e3a8a,#3b82f6); color: white; padding: 36px 40px; }
    .header h1 { margin: 0 0 6px; font-size: 26px; }
    .header .meta { opacity: .85; font-size: 13px; margin-top: 4px; }
    .header .badges span { display: inline-block; background: rgba(255,255,255,.2); border-radius: 20px; padding: 3px 12px; font-size: 12px; margin: 8px 4px 0 0; }
    .body { max-width: 900px; margin: 0 auto; padding: 32px 20px; }
    .section { background: white; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.08); margin-bottom: 20px; overflow: hidden; }
    .section-title { display: flex; align-items: center; gap: 8px; background: #f1f5f9; padding: 14px 20px; font-weight: 700; font-size: 15px; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; }
    .section-body { padding: 20px; }
    .value-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
    .value-box { background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center; }
    .value-box .label { font-size: 11px; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
    .value-box .val { font-size: 20px; font-weight: 800; color: #1e3a8a; }
    .value-box .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .news-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
    .news-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
    .headline { font-weight: 600; font-size: 14px; flex: 1; }
    .summary { font-size: 13px; color: #475569; margin: 0 0 8px; }
    .source-row { display: flex; gap: 12px; font-size: 11px; color: #64748b; align-items: center; flex-wrap: wrap; }
    .source-link { color: #3b82f6; text-decoration: none; font-weight: 500; }
    .source-link:hover { text-decoration: underline; }
    .relevance-badge { padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap; }
    .relevance-hoch { background: #fee2e2; color: #991b1b; }
    .relevance-mittel { background: #fef9c3; color: #854d0e; }
    .relevance-niedrig { background: #f1f5f9; color: #475569; }
    .transfer-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px; }
    .transfer-clubs { font-size: 13px; color: #475569; margin-top: 3px; }
    .similarity { font-size: 11px; color: #64748b; margin-top: 4px; font-style: italic; }
    .fee-badge { background: #dbeafe; color: #1d4ed8; border-radius: 6px; padding: 4px 12px; font-weight: 700; font-size: 14px; }
    .transfer-fee { text-align: right; }
    .transfer-date { font-size: 11px; color: #64748b; margin-top: 4px; }
    .club-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .club-row:last-child { border-bottom: none; }
    .league-tag { display: inline-block; margin-left: 8px; padding: 1px 8px; background: #e0e7ff; color: #3730a3; border-radius: 20px; font-size: 11px; }
    .club-reason { font-size: 12px; color: #64748b; margin-top: 4px; }
    .risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .risk-box { border-radius: 8px; padding: 16px; }
    .risk-box.risks { background: #fef2f2; }
    .risk-box.opps { background: #f0fdf4; }
    .risk-box h4 { margin: 0 0 10px; font-size: 14px; }
    .risk-box.risks h4 { color: #991b1b; }
    .risk-box.opps h4 { color: #166534; }
    .risk-box ul { margin: 0; padding-left: 18px; }
    .risk-box li { font-size: 13px; margin-bottom: 5px; color: #374151; }
    .recommendation { background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 16px; font-size: 14px; color: #1e40af; line-height: 1.6; }
    .timing-box { display: flex; gap: 16px; align-items: flex-start; }
    .urgency-tag { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #92400e; white-space: nowrap; }
    .risk-analysis p { font-size: 13px; color: #475569; margin: 6px 0; }
    .risk-analysis strong { color: #1e293b; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; padding: 24px; }
    .confidence { display: inline-block; margin-top: 4px; padding: 2px 10px; background: rgba(255,255,255,.2); border-radius: 20px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Markttrend-Analyse</h1>
    <h2 style="margin:4px 0 0;font-size:20px;font-weight:400;">${player.name || "Spieler"}</h2>
    <div class="badges">
      ${player.position ? `<span>${player.position}</span>` : ""}
      ${player.club ? `<span>⚽ ${player.club}</span>` : ""}
      ${player.marketValue ? `<span>💰 ${formatValue(player.marketValue)}</span>` : ""}
      ${analysis.confidence_score ? `<span class="confidence">Konfidenz: ${analysis.confidence_score}%</span>` : ""}
    </div>
    <div class="meta">Erstellt am ${new Date(generatedAt).toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} Uhr</div>
  </div>

  <div class="body">
    ${analysis.market_value_assessment ? `
    <div class="section">
      <div class="section-title">💰 Marktwert-Einschätzung</div>
      <div class="section-body">
        <div class="value-grid">
          <div class="value-box"><div class="label">Aktuelle Schätzung</div><div class="val">${analysis.market_value_assessment.current_estimate || "—"}</div></div>
          <div class="value-box"><div class="label">Minimum</div><div class="val" style="color:#b91c1c">${analysis.market_value_assessment.low_estimate || "—"}</div></div>
          <div class="value-box"><div class="label">Maximum</div><div class="val" style="color:#166534">${analysis.market_value_assessment.high_estimate || "—"}</div></div>
        </div>
        <div style="margin-top:16px">
          <strong>Trend:</strong> ${analysis.market_value_assessment.trend || "—"} &nbsp;|&nbsp;
          <strong>12 Monate:</strong> ${analysis.market_value_assessment.trend_12_months || "—"}
        </div>
        ${analysis.market_value_assessment.reasoning ? `<p style="color:#475569;font-size:13px;margin-top:10px">${analysis.market_value_assessment.reasoning}</p>` : ""}
        ${analysis.market_value_assessment.contract_impact ? `<p style="color:#7c3aed;font-size:13px"><strong>Vertragseinfluss:</strong> ${analysis.market_value_assessment.contract_impact}</p>` : ""}
      </div>
    </div>` : ""}

    ${(analysis.current_news || []).length > 0 ? `
    <div class="section">
      <div class="section-title">📰 Aktuelle Nachrichten & Gerüchte</div>
      <div class="section-body">${newsHtml}</div>
    </div>` : ""}

    ${analysis.market_trends ? `
    <div class="section">
      <div class="section-title">📈 Markttrends – ${player.position || "Position"}</div>
      <div class="section-body">
        <p><strong>Nachfrage:</strong> ${analysis.market_trends.position_demand || "—"}</p>
        <p><strong>Durchschnittl. Ablöse:</strong> ${analysis.market_trends.average_transfer_fee || "—"}</p>
        <p><strong>Marktüberblick:</strong> ${analysis.market_trends.market_overview || "—"}</p>
        ${(analysis.market_trends.top_paying_leagues || []).length > 0 ? `<p><strong>Top Ligen:</strong> ${analysis.market_trends.top_paying_leagues.join(", ")}</p>` : ""}
      </div>
    </div>` : ""}

    ${(analysis.comparable_transfers || []).length > 0 ? `
    <div class="section">
      <div class="section-title">🔄 Vergleichbare Transfers</div>
      <div class="section-body">${transfersHtml}</div>
    </div>` : ""}

    ${(analysis.interested_clubs || []).length > 0 ? `
    <div class="section">
      <div class="section-title">🏟 Interessierte Vereine</div>
      <div class="section-body">${clubsHtml}</div>
    </div>` : ""}

    ${analysis.transfer_timing ? `
    <div class="section">
      <div class="section-title">⏰ Transfer-Timing</div>
      <div class="section-body">
        <div class="timing-box">
          <span class="urgency-tag">${analysis.transfer_timing.urgency || "abwarten"}</span>
          <div>
            <strong>${analysis.transfer_timing.optimal_window || ""}</strong>
            ${analysis.transfer_timing.reasoning ? `<p style="font-size:13px;color:#475569;margin:6px 0 0">${analysis.transfer_timing.reasoning}</p>` : ""}
          </div>
        </div>
      </div>
    </div>` : ""}

    ${analysis.risk_analysis ? `
    <div class="section">
      <div class="section-title">⚠️ Risiko-Analyse</div>
      <div class="section-body risk-analysis">
        ${analysis.risk_analysis.form_assessment ? `<p><strong>Form:</strong> ${analysis.risk_analysis.form_assessment}</p>` : ""}
        ${analysis.risk_analysis.injury_history ? `<p><strong>Verletzungshistorie:</strong> ${analysis.risk_analysis.injury_history}</p>` : ""}
        ${analysis.risk_analysis.age_factor ? `<p><strong>Altersfaktor:</strong> ${analysis.risk_analysis.age_factor}</p>` : ""}
        ${analysis.risk_analysis.contract_risk ? `<p><strong>Vertragsrisiko:</strong> ${analysis.risk_analysis.contract_risk}</p>` : ""}
      </div>
    </div>` : ""}

    ${analysis.risks_opportunities ? `
    <div class="section">
      <div class="section-title">⚡ Chancen & Risiken</div>
      <div class="section-body">
        <div class="risk-grid">
          <div class="risk-box risks"><h4>⚠️ Risiken</h4><ul>${risksHtml}</ul></div>
          <div class="risk-box opps"><h4>✅ Chancen</h4><ul>${oppsHtml}</ul></div>
        </div>
      </div>
    </div>` : ""}

    ${analysis.overall_recommendation ? `
    <div class="section">
      <div class="section-title">🎯 Gesamtempfehlung</div>
      <div class="section-body"><div class="recommendation">${analysis.overall_recommendation}</div></div>
    </div>` : ""}

    <div class="footer">Generiert von STS Sports Management Platform · ${new Date(generatedAt).toLocaleDateString("de-DE")}</div>
  </div>
</body>
</html>`;
}

export default function MarketTrendAnalysis({ player }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const response = await base44.functions.invoke('getMarketTrends', {
        entityType: 'player',
        entityId: player.id,
        playerName: player.name,
        position: player.position,
        league: player.current_club,
        marketValue: player.market_value,
        nationality: player.nationality,
        contractUntil: player.contract_until,
        age: player.age
      });
      if (response.data.success) {
        setAnalysis(response.data.analysis);
        setGeneratedAt(response.data.generated_at);
        toast.success('Marktanalyse abgeschlossen!');
      } else {
        toast.error('Analyse fehlgeschlagen');
      }
    } catch (error) {
      toast.error('Fehler bei der Marktanalyse');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDocument = async () => {
    if (!analysis) return;
    setSaving(true);
    try {
      const playerContext = { name: player.name, position: player.position, club: player.current_club, marketValue: player.market_value };
      const htmlContent = buildHtmlDocument(analysis, playerContext, generatedAt || new Date().toISOString());
      const fileName = `Marktanalyse_${player.name}_${new Date().toISOString().split('T')[0]}`;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const file = new File([blob], `${fileName}.html`, { type: 'text/html' });

      const uploadResponse = await base44.functions.invoke('uploadToDropbox', {
        file,
        path: `/Analysen/Player/${fileName}.html`
      });

      if (!uploadResponse.data.success) throw new Error(uploadResponse.data.error || "Upload fehlgeschlagen");

      const linkResponse = await base44.functions.invoke('getDropboxFileLink', {
        filePath: uploadResponse.data.path
      });

      const documentData = {
        id: uploadResponse.data.metadata.id,
        name: `${fileName}.html`,
        path: uploadResponse.data.path,
        url: linkResponse.data.url,
        size: uploadResponse.data.metadata.size,
        uploaded_date: new Date().toISOString(),
        uploaded_by: (await base44.auth.me()).email,
        type: 'analysis'
      };

      const currentPlayer = await base44.entities.Player.filter({ id: player.id });
      const p = currentPlayer[0];
      await base44.entities.Player.update(player.id, {
        dropbox_documents: [...(p?.dropbox_documents || []), documentData]
      });

      toast.success('Analyse direkt in Spieler-Dokumenten gespeichert!');
    } catch (error) {
      console.error(error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const trendDir = analysis?.market_trends?.trending_direction;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <TrendingUp className="w-4 h-4 mr-2" />
          Markttrends analysieren
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle className="text-lg font-bold">Markttrend-Analyse – {player.name}</DialogTitle>
            {analysis && (
              <Button
                size="sm"
                onClick={handleSaveAsDocument}
                disabled={saving}
                className="bg-blue-900 hover:bg-blue-800 gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Wird gespeichert..." : "Als Dokument speichern"}
              </Button>
            )}
          </div>
        </DialogHeader>

        {!analysis ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
              <TrendingUp className="w-8 h-8 text-blue-900" />
            </div>
            <div>
              <p className="font-semibold text-lg">KI-Marktanalyse starten</p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Analysiert aktuelle Transfergerüchte, Markttrends, vergleichbare Transfers und gibt eine Handlungsempfehlung.
              </p>
            </div>
            <Button onClick={handleAnalyze} disabled={loading} size="lg" className="bg-blue-900 hover:bg-blue-800">
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Analysiere Markt...</>
              ) : (
                <><TrendingUp className="w-5 h-5 mr-2" />Analyse starten</>
              )}
            </Button>
            {loading && (
              <p className="text-xs text-slate-400">Dies kann 15–30 Sekunden dauern – die KI recherchiert aktuelle Daten im Internet.</p>
            )}
          </div>
        ) : (
          <div className="space-y-5">

            {/* Marktwert */}
            {analysis.market_value_assessment && (
              <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">💰 Marktwert-Einschätzung</h3>
                  {trendDir && <TrendBadge direction={trendDir} />}
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-xs opacity-75 mb-1">Schätzung</div>
                    <div className="font-bold text-xl">{analysis.market_value_assessment.current_estimate || "—"}</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-xs opacity-75 mb-1">Minimum</div>
                    <div className="font-bold text-lg text-red-300">{analysis.market_value_assessment.low_estimate || "—"}</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-xs opacity-75 mb-1">Maximum</div>
                    <div className="font-bold text-lg text-green-300">{analysis.market_value_assessment.high_estimate || "—"}</div>
                  </div>
                </div>
                {analysis.market_value_assessment.reasoning && (
                  <p className="text-sm text-blue-100 leading-relaxed">{analysis.market_value_assessment.reasoning}</p>
                )}
                {analysis.market_value_assessment.contract_impact && (
                  <p className="text-xs text-yellow-300 mt-2">⚠️ {analysis.market_value_assessment.contract_impact}</p>
                )}
                {analysis.confidence_score && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-blue-200">
                    <CheckCircle className="w-3 h-3" />
                    Analyse-Konfidenz: {analysis.confidence_score}%
                  </div>
                )}
              </div>
            )}

            {/* Nachrichten */}
            {(analysis.current_news || []).length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="text-base">📰</span> Aktuelle Nachrichten & Gerüchte
                </h3>
                <div className="space-y-3">
                  {analysis.current_news.map((news, idx) => (
                    <div key={idx} className="p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="font-semibold text-sm leading-snug flex-1">{news.headline}</p>
                        {news.relevance && <RelevanceBadge r={news.relevance} />}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{news.summary}</p>
                      <div className="flex items-center flex-wrap gap-3 text-xs text-slate-400">
                        {news.source && <span>📰 {news.source}</span>}
                        {news.date && <span>{news.date}</span>}
                        {news.source_url && (
                          <a
                            href={news.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Quelle öffnen
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Markttrends */}
            {analysis.market_trends && (
              <div className="p-4 bg-slate-50 rounded-xl border">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-900" /> Markttrends – {player.position}
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Nachfrage:</span> <span className="font-medium ml-1">{analysis.market_trends.position_demand}</span></div>
                  <div><span className="text-slate-500">Ø Ablöse:</span> <span className="font-medium ml-1">{analysis.market_trends.average_transfer_fee}</span></div>
                  {(analysis.market_trends.top_paying_leagues || []).length > 0 && (
                    <div className="sm:col-span-2"><span className="text-slate-500">Top Ligen:</span> <span className="font-medium ml-1">{analysis.market_trends.top_paying_leagues.join(", ")}</span></div>
                  )}
                  {analysis.market_trends.market_overview && (
                    <div className="sm:col-span-2 text-slate-600">{analysis.market_trends.market_overview}</div>
                  )}
                </div>
              </div>
            )}

            {/* Vergleichbare Transfers */}
            {(analysis.comparable_transfers || []).length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="text-base">🔄</span> Vergleichbare Transfers
                </h3>
                <div className="space-y-2">
                  {analysis.comparable_transfers.map((t, idx) => (
                    <div key={idx} className="p-3 border rounded-xl flex justify-between items-start bg-white">
                      <div>
                        <p className="font-semibold text-sm">{t.player} {t.age_at_transfer && <span className="text-slate-400 font-normal">({t.age_at_transfer})</span>}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t.from_club} → {t.to_club}</p>
                        {t.similarity_reason && <p className="text-xs text-slate-400 mt-1 italic">{t.similarity_reason}</p>}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <Badge className="bg-blue-100 text-blue-800 border-0">{t.fee}</Badge>
                        <p className="text-xs text-slate-400 mt-1">{t.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interessierte Vereine */}
            {(analysis.interested_clubs || []).length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-900" /> Interessierte Vereine
                </h3>
                <div className="space-y-2">
                  {analysis.interested_clubs.map((c, idx) => (
                    <div key={idx} className="p-3 border rounded-xl flex justify-between items-start bg-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{c.club}</p>
                          {c.league && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{c.league}</span>}
                        </div>
                        {c.reason && <p className="text-xs text-slate-500 mt-1">{c.reason}</p>}
                      </div>
                      {c.likelihood && <LikelihoodBadge l={c.likelihood} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risiko-Analyse */}
            {analysis.risk_analysis && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4" /> Risiko-Analyse
                </h3>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  {analysis.risk_analysis.form_assessment && <div><span className="text-amber-700 font-medium">Form:</span> <span className="text-slate-700 ml-1">{analysis.risk_analysis.form_assessment}</span></div>}
                  {analysis.risk_analysis.injury_history && <div><span className="text-amber-700 font-medium">Verletzungen:</span> <span className="text-slate-700 ml-1">{analysis.risk_analysis.injury_history}</span></div>}
                  {analysis.risk_analysis.age_factor && <div><span className="text-amber-700 font-medium">Alter:</span> <span className="text-slate-700 ml-1">{analysis.risk_analysis.age_factor}</span></div>}
                  {analysis.risk_analysis.contract_risk && <div><span className="text-amber-700 font-medium">Vertrag:</span> <span className="text-slate-700 ml-1">{analysis.risk_analysis.contract_risk}</span></div>}
                </div>
              </div>
            )}

            {/* Transfer-Timing */}
            {analysis.transfer_timing && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-purple-900">
                  <Clock className="w-4 h-4" /> Optimaler Transfer-Zeitpunkt
                </h3>
                <div className="flex items-start gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                    analysis.transfer_timing.urgency === "sofort handeln" ? "bg-red-100 text-red-800" :
                    analysis.transfer_timing.urgency === "zeitnah" ? "bg-orange-100 text-orange-800" :
                    "bg-purple-100 text-purple-800"
                  }`}>
                    {analysis.transfer_timing.urgency}
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-purple-900">{analysis.transfer_timing.optimal_window}</p>
                    {analysis.transfer_timing.reasoning && <p className="text-sm text-slate-600 mt-1">{analysis.transfer_timing.reasoning}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Chancen & Risiken */}
            {analysis.risks_opportunities && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <h3 className="font-semibold mb-2 text-red-900 flex items-center gap-1">⚠️ Risiken</h3>
                  <ul className="space-y-1.5">
                    {(analysis.risks_opportunities.risks || []).map((r, i) => (
                      <li key={i} className="text-sm text-red-800 flex gap-2"><span>•</span><span>{r}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <h3 className="font-semibold mb-2 text-green-900 flex items-center gap-1">✅ Chancen</h3>
                  <ul className="space-y-1.5">
                    {(analysis.risks_opportunities.opportunities || []).map((o, i) => (
                      <li key={i} className="text-sm text-green-800 flex gap-2"><span>•</span><span>{o}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Gesamtempfehlung */}
            {analysis.overall_recommendation && (
              <div className="p-5 bg-slate-900 rounded-xl">
                <h3 className="font-bold mb-2 flex items-center gap-2 text-white">
                  <Target className="w-4 h-4 text-blue-400" /> Gesamtempfehlung
                </h3>
                <p className="text-slate-200 text-sm leading-relaxed">{analysis.overall_recommendation}</p>
              </div>
            )}

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}