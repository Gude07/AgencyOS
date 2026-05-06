import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function MultiRequestSummaryDialog({ open, onClose, selectedRequestIds, requests }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const summaryRef = useRef(null);

  const selectedRequests = requests.filter(r => selectedRequestIds.has(r.id));

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    const res = await base44.functions.invoke("generateMultiRequestSummary", {
      requestIds: Array.from(selectedRequestIds),
    });
    if (res.data?.summary) {
      setSummary(res.data.summary);
    } else {
      setError("Fehler beim Generieren der Zusammenfassung.");
    }
    setLoading(false);
  };

  const handleDownloadPDF = async () => {
    if (!summary) return;
    setDownloading(true);

    // Build a standalone HTML page for rendering
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #222; background: #fff; padding: 0; }
  .page { width: 794px; padding: 0; }
  
  /* Header banner */
  .header { background: #0f2864; color: #fff; padding: 22px 32px 18px; }
  .header h1 { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
  .header .subtitle { font-size: 12px; color: #b4c8ff; }
  .header .meta { font-size: 11px; color: #93aee8; margin-top: 6px; }
  
  /* Body */
  .body { padding: 28px 32px; }
  
  /* H2 → club section header */
  h2 { font-size: 14px; font-weight: bold; color: #0f2864; background: #e6ecff;
       border-left: 4px solid #0f2864; padding: 7px 12px; margin: 20px 0 10px; border-radius: 0 4px 4px 0; }
  
  /* H3 → sub-section */
  h3 { font-size: 12px; font-weight: bold; color: #2850a0; margin: 14px 0 5px; padding-bottom: 3px;
       border-bottom: 1px solid #d0d8ef; }
  
  /* H1 */
  h1.content-h1 { font-size: 17px; font-weight: bold; color: #0a1e5a; margin: 16px 0 8px;
                  padding-bottom: 5px; border-bottom: 2px solid #0f2864; }
  
  /* Paragraphs */
  p { font-size: 12px; line-height: 1.65; color: #333; margin: 5px 0; }
  
  /* Lists */
  ul { margin: 5px 0 5px 20px; }
  li { font-size: 12px; line-height: 1.7; color: #333; margin: 2px 0; }
  
  /* Bold */
  strong { font-weight: bold; color: #111; }
  
  /* HR */
  hr { border: none; border-top: 1px solid #d0d8ef; margin: 16px 0; }
  
  /* Blockquote – used for highlighted info */
  blockquote { border-left: 3px solid #0f2864; background: #f4f6ff; padding: 8px 12px;
               margin: 8px 0; border-radius: 0 4px 4px 0; font-size: 12px; color: #333; }
  
  /* Footer */
  .footer { border-top: 1px solid #d0d8ef; padding: 10px 32px; display: flex;
            justify-content: space-between; font-size: 10px; color: #999; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>KI-Spieler-Zusammenfassung</h1>
    <div class="subtitle">Vereinsanfragen Scout-Report</div>
    <div class="meta">Erstellt: ${new Date().toLocaleDateString("de-DE")} &nbsp;|&nbsp; Anfragen: ${selectedRequests.map(r => r.club_name).join(", ")}</div>
  </div>
  <div class="body">
    ${markdownToHtml(summary)}
  </div>
  <div class="footer">
    <span>Vertraulich – Spieleragentur</span>
    <span>${new Date().toLocaleDateString("de-DE")}</span>
  </div>
</div>
</body>
</html>`;

    // Render in an off-screen iframe
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:794px;height:1200px;border:none;visibility:hidden;";
    document.body.appendChild(iframe);

    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();

    // Wait for fonts/images to load
    await new Promise(r => setTimeout(r, 600));

    const iframeBody = iframe.contentDocument.body;
    const totalHeight = iframeBody.scrollHeight;
    iframe.style.height = totalHeight + "px";

    await new Promise(r => setTimeout(r, 200));

    const canvas = await html2canvas(iframeBody, {
      scale: 2,
      useCORS: true,
      width: 794,
      height: totalHeight,
      windowWidth: 794,
      windowHeight: totalHeight,
    });

    document.body.removeChild(iframe);

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const pagesNeeded = Math.ceil(imgH / pageH);

    for (let i = 0; i < pagesNeeded; i++) {
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -i * pageH, imgW, imgH);
    }

    // Page numbers
    const total = pdf.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      pdf.setPage(p);
      pdf.setFontSize(8);
      pdf.setTextColor(160, 160, 160);
      pdf.text(`${p} / ${total}`, pageW - 10, pageH - 5, { align: "right" });
    }

    pdf.save(`Spieler_Zusammenfassung_${new Date().toISOString().split("T")[0]}.pdf`);
    setDownloading(false);
  };

  const handleClose = () => {
    setSummary(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="w-5 h-5 text-purple-600" />
            KI-Spieler-Zusammenfassung
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Selected requests */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {selectedRequests.length} ausgewählte Anfragen:
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedRequests.map(r => (
                <Badge key={r.id} variant="outline" className="border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                  {r.club_name} – {r.position_needed}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Die KI prüft <strong>alle Spieler im Portfolio</strong> gegen die Kriterien jeder Anfrage (Position, Alter, Budget, Fuß) und listet Shortlist-Spieler sowie die besten Kriterien-Matches auf. Spieler die zu mehreren Vereinen passen werden besonders hervorgehoben.
            </p>
          </div>

          {!summary && !loading && (
            <div className="flex justify-center py-8">
              <Button
                onClick={handleGenerate}
                className="bg-purple-700 hover:bg-purple-800 text-white gap-2 px-8 py-5 text-base"
              >
                <Sparkles className="w-5 h-5" />
                Zusammenfassung generieren
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-600 dark:text-slate-400">
              <Loader2 className="w-9 h-9 animate-spin text-purple-600" />
              <p className="text-sm font-medium">KI analysiert Spieler gegen alle Kriterien...</p>
              <p className="text-xs text-slate-400">Das kann 20–40 Sekunden dauern.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
          )}

          {summary && (
            <div ref={summaryRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
              <ReactMarkdown
                className="prose prose-sm dark:prose-invert max-w-none"
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold text-blue-900 dark:text-blue-300 mt-5 mb-2 pb-1 border-b-2 border-blue-200">{children}</h1>,
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold text-blue-900 dark:text-blue-300 mt-5 mb-2 bg-blue-50 dark:bg-blue-950 px-3 py-1.5 rounded-lg border-l-4 border-blue-800">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-1 border-b border-slate-200 pb-1">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
                  ul: ({ children }) => <ul className="my-1.5 ml-4 space-y-1 list-disc">{children}</ul>,
                  li: ({ children }) => <li className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{children}</li>,
                  p: ({ children }) => <p className="my-1.5 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{children}</p>,
                  hr: () => <hr className="my-4 border-slate-200 dark:border-slate-700" />,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-2 my-2 rounded-r-lg text-sm text-slate-700 dark:text-slate-300">{children}</blockquote>,
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700 mt-2">
          <Button variant="outline" onClick={handleClose}>Schließen</Button>
          <div className="flex gap-2">
            {summary && (
              <>
                <Button variant="outline" onClick={handleGenerate} disabled={loading} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Neu generieren
                </Button>
                <Button onClick={handleDownloadPDF} disabled={downloading} className="bg-blue-900 hover:bg-blue-800 gap-2">
                  {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {downloading ? "Wird erstellt..." : "Als PDF herunterladen"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simple markdown → HTML converter for the PDF iframe
function markdownToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let inList = false;

  for (const line of lines) {
    const t = line.trim();

    if (!t) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push("<br/>");
      continue;
    }

    if (t.startsWith("# ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h1 class="content-h1">${escHtml(t.slice(2)).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</h1>`);
    } else if (t.startsWith("## ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h2>${escHtml(t.slice(3)).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</h2>`);
    } else if (t.startsWith("### ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h3>${escHtml(t.slice(4)).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</h3>`);
    } else if (/^---+$/.test(t)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push("<hr/>");
    } else if (t.startsWith("- ") || t.startsWith("• ")) {
      if (!inList) { out.push("<ul>"); inList = true; }
      const txt = escHtml(t.replace(/^[-•] /, "")).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      out.push(`<li>${txt}</li>`);
    } else if (t.startsWith("> ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      const txt = escHtml(t.slice(2)).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      out.push(`<blockquote>${txt}</blockquote>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      const txt = escHtml(t).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      out.push(`<p>${txt}</p>`);
    }
  }

  if (inList) out.push("</ul>");
  return out.join("\n");
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}