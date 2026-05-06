import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Sparkles, Loader2, FileText } from "lucide-react";
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
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const addText = (text, fontSize, bold = false, color = [30, 30, 30]) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach(line => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += fontSize * 0.45;
      });
      y += 2;
    };

    // Header
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, 14, "F");
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Vereinsanfragen – KI-Zusammenfassung", margin, 9.5);
    y = 22;

    addText(`Erstellt am: ${new Date().toLocaleDateString("de-DE")}`, 9, false, [100, 100, 100]);
    addText(`Analysierte Anfragen: ${selectedRequests.map(r => r.club_name).join(", ")}`, 9, false, [100, 100, 100]);
    y += 4;

    // Strip markdown for PDF and render clean
    const lines = summary.split("\n");
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) { y += 3; return; }

      if (trimmed.startsWith("### ")) {
        addText(trimmed.replace(/^### /, ""), 11, true, [30, 58, 138]);
      } else if (trimmed.startsWith("## ")) {
        y += 2;
        addText(trimmed.replace(/^## /, ""), 13, true, [30, 58, 138]);
      } else if (trimmed.startsWith("# ")) {
        y += 3;
        addText(trimmed.replace(/^# /, ""), 15, true, [15, 30, 100]);
      } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        addText(trimmed.replace(/\*\*/g, ""), 10, true);
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        addText("  • " + trimmed.replace(/^[-•] /, "").replace(/\*\*/g, ""), 9);
      } else {
        addText(trimmed.replace(/\*\*/g, ""), 9.5);
      }
    });

    doc.save(`Vereinsanfragen_Zusammenfassung_${new Date().toISOString().split("T")[0]}.pdf`);
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
            KI-Zusammenfassung
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Selected requests overview */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {selectedRequests.length} ausgewählte Anfragen:
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedRequests.map(r => (
                <Badge key={r.id} variant="outline" className="border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                  {r.club_name} – {r.position_needed}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              Die KI analysiert die Shortlist-Spieler jeder Anfrage sowie weitere mögliche Kandidaten und erstellt eine strukturierte Übersicht.
              Spieler, die zu mehreren Anfragen passen, werden besonders hervorgehoben.
            </p>
          </div>

          {/* Generate button or result */}
          {!summary && !loading && (
            <div className="flex justify-center py-6">
              <Button
                onClick={handleGenerate}
                className="bg-purple-700 hover:bg-purple-800 text-white gap-2 px-6"
                disabled={loading}
              >
                <Sparkles className="w-4 h-4" />
                Zusammenfassung generieren
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-600 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <p className="text-sm">KI analysiert Spieler und Vereinsanfragen...</p>
              <p className="text-xs text-slate-400">Das kann 15–30 Sekunden dauern.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {summary && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
              <ReactMarkdown
                className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200"
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold text-blue-900 dark:text-blue-300 mt-4 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mt-4 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
                  ul: ({ children }) => <ul className="my-2 ml-4 space-y-1 list-disc">{children}</ul>,
                  li: ({ children }) => <li className="text-slate-700 dark:text-slate-300">{children}</li>,
                  p: ({ children }) => <p className="my-1.5 text-slate-700 dark:text-slate-300 leading-relaxed">{children}</p>,
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700 mt-2">
          <Button variant="outline" onClick={handleClose}>
            Schließen
          </Button>
          <div className="flex gap-2">
            {summary && (
              <>
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Neu generieren
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  className="bg-blue-900 hover:bg-blue-800 gap-2"
                >
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