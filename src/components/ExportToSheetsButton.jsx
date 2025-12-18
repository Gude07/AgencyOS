import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ExportToSheetsButton({ entityName, entityLabel }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/functions/exportToGoogleSheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityName,
          title: `${entityLabel} Export - ${new Date().toLocaleDateString('de-DE')}`
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setExportResult(result);
        setShowResultDialog(true);
        toast.success('Export erfolgreich!');
      } else {
        toast.error(result.error || 'Export fehlgeschlagen');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export fehlgeschlagen: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={isExporting}
        className="border-green-600 text-green-600 hover:bg-green-50"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Exportiere...
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Nach Google Sheets exportieren
          </>
        )}
      </Button>

      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export erfolgreich!</DialogTitle>
            <DialogDescription>
              Die Daten wurden erfolgreich nach Google Sheets exportiert.
            </DialogDescription>
          </DialogHeader>
          
          {exportResult && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Sie können die Tabelle jetzt öffnen und mit anderen teilen.
              </p>
              
              <a
                href={exportResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Google Sheet öffnen
                </Button>
              </a>
              
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Link zum Teilen:</p>
                <p className="text-xs text-slate-800 break-all font-mono">{exportResult.url}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}