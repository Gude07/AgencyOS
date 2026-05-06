import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";

export default function MultiRequestSummaryDialog({ open, onClose, selectedRequestIds, requests }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleDownloadPDF = () => {
    if (!summary) return;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    const maxWidth = pageW - margin * 2;
    let y = 0;

    const checkPage = (needed = 8) => {
      if (y + needed > pageH - 15) {
        doc.addPage();
        y = 18;
      }
    };

    // ── Cover header ──────────────────────────────────────────────
    doc.setFillColor(15, 40, 100);
    doc.rect(0, 0, pageW, 32, "F");

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Vereinsanfragen", margin, 13);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("KI-Spieler-Zusammenfassung", margin, 20);

    doc.setFontSize(8.5);
    doc.setTextColor(180, 200, 255);
    doc.text(`Erstellt: ${new Date().toLocaleDateString("de-DE")}  |  Anfragen: ${selectedRequests.map(r => r.club_name).join(", ")}`, margin, 27.5);

    y = 40;

    // ── Parse and render markdown ─────────────────────────────────
    const lines = summary.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();

      if (!trimmed) {
        y += 2.5;
        continue;
      }

      // H2 (## ...) → section header with colored bar
      if (trimmed.startsWith("## ")) {
        checkPage(14);
        y += 3;
        const text = trimmed.replace(/^## /, "").replace(/[#*`]/g, "").trim();
        doc.setFillColor(230, 236, 255);
        doc.rect(margin - 3, y - 5, maxWidth + 6, 9, "F");
        doc.setFillColor(15, 40, 100);
        doc.rect(margin - 3, y - 5, 3, 9, "F");
        doc.setFontSize(11.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 40, 100);
        doc.text(text, margin + 2, y);
        y += 7;
        continue;
      }

      // H3 (### ...) → sub-section
      if (trimmed.startsWith("### ")) {
        checkPage(10);
        y += 2;
        const text = trimmed.replace(/^### /, "").replace(/[#*`]/g, "").trim();
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 80, 160);
        doc.text(text, margin, y);
        y += 6;
        continue;
      }

      // H1 (# ...) → large title (rare)
      if (trimmed.startsWith("# ")) {
        checkPage(12);
        const text = trimmed.replace(/^# /, "").replace(/[#*`]/g, "").trim();
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(10, 30, 90);
        doc.text(text, margin, y);
        y += 8;
        continue;
      }

      // Horizontal rule (---)
      if (/^---+$/.test(trimmed)) {
        checkPage(6);
        y += 2;
        doc.setDrawColor(200, 210, 230);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageW - margin, y);
        y += 4;
        continue;
      }

      // Bullet points (- or •)
      if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        const text = trimmed.replace(/^[-•] /, "").replace(/\*\*/g, "").replace(/[`*]/g, "").trim();
        const indented = raw.startsWith("  ") || raw.startsWith("\t");
        const indent = indented ? margin + 8 : margin + 3;
        const bulletX = indent - 3;

        checkPage(6);
        doc.setFillColor(15, 40, 100);
        doc.circle(bulletX, y - 1.2, 0.9, "F");

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        const wrapped = doc.splitTextToSize(text, maxWidth - (indent - margin));
        wrapped.forEach((line, idx) => {
          checkPage(5);
          doc.text(line, indent, y);
          y += idx < wrapped.length - 1 ? 4.5 : 5;
        });
        continue;
      }

      // Bold standalone line (**text**)
      if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4) {
        checkPage(7);
        const text = trimmed.replace(/\*\*/g, "").trim();
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 20, 20);
        const wrapped = doc.splitTextToSize(text, maxWidth);
        wrapped.forEach(line => {
          checkPage(5);
          doc.text(line, margin, y);
          y += 5;
        });
        continue;
      }

      // Normal text – strip markdown symbols
      const cleanText = trimmed.replace(/\*\*/g, "").replace(/[`*#]/g, "").trim();
      if (!cleanText) continue;

      checkPage(6);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const wrapped = doc.splitTextToSize(cleanText, maxWidth);
      wrapped.forEach(line => {
        checkPage(5);
        doc.text(line, margin, y);
        y += 4.8;
      });
      y += 0.8;
    }

    // ── Footer on every page ──────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(`Seite ${p} / ${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
      doc.text("Vertraulich – Spieleragentur", margin, pageH - 8);
    }

    doc.save(`Spieler_Zusammenfassung_${new Date().toISOString().split("T")[0]}.pdf`);
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
              <ReactMarkdown
                className="prose prose-sm dark:prose-invert max-w-none"
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold text-blue-900 dark:text-blue-300 mt-5 mb-2 pb-1 border-b border-blue-100">{children}</h1>,
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold text-blue-900 dark:text-blue-300 mt-5 mb-2 bg-blue-50 dark:bg-blue-950 px-3 py-1.5 rounded-lg">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-1">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
                  ul: ({ children }) => <ul className="my-1.5 ml-4 space-y-1 list-disc">{children}</ul>,
                  li: ({ children }) => <li className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{children}</li>,
                  p: ({ children }) => <p className="my-1.5 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{children}</p>,
                  hr: () => <hr className="my-4 border-slate-200 dark:border-slate-700" />,
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
                <Button onClick={handleDownloadPDF} className="bg-blue-900 hover:bg-blue-800 gap-2">
                  <Download className="w-4 h-4" />
                  Als PDF herunterladen
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}