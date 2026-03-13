import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Save, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function AnalysisDocumentSaver({ 
  analysisContent, 
  analysisType, 
  entityType, 
  entityId, 
  defaultFileName,
  triggerButton 
}) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState(defaultFileName || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!fileName.trim()) {
      toast.error("Bitte geben Sie einen Dateinamen ein");
      return;
    }

    setIsSaving(true);
    try {
      // Erstelle HTML-Dokument
      const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f8fafc;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .content h2 {
      color: #1e3a8a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    .content h3 {
      color: #334155;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .content ul, .content ol {
      margin: 10px 0;
      padding-left: 25px;
    }
    .content li {
      margin: 5px 0;
    }
    .content p {
      margin: 10px 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: #e0e7ff;
      color: #3730a3;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      margin-right: 8px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${fileName}</h1>
    <p>Erstellt am ${new Date().toLocaleDateString('de-DE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })} Uhr</p>
    <p><span class="badge">${analysisType}</span></p>
  </div>
  
  <div class="content">
    ${analysisContent.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
  </div>
  
  <div class="footer">
    Generiert von STS Sports Management Platform
  </div>
</body>
</html>`;

      // Erstelle Blob und File
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const file = new File([blob], `${fileName}.html`, { type: 'text/html' });

      // Upload zu Dropbox
      const uploadResponse = await base44.functions.invoke('uploadToDropbox', {
        file: file,
        path: `/Analysen/${entityType}/${fileName}.html`
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.error || "Upload fehlgeschlagen");
      }

      // Hole Dokument-Link
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

      // Aktualisiere Entity mit neuem Dokument
      const entity = await base44.entities[entityType].list();
      const currentEntity = entity.find(e => e.id === entityId);
      
      const updatedDocuments = [
        ...(currentEntity.dropbox_documents || []),
        documentData
      ];

      await base44.entities[entityType].update(entityId, {
        dropbox_documents: updatedDocuments
      });

      toast.success("Analyse erfolgreich gespeichert!");
      setOpen(false);
      setFileName(defaultFileName || "");
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      toast.error("Fehler beim Speichern der Analyse");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div onClick={() => {
        setFileName(defaultFileName || "");
        setOpen(true);
      }}>
        {triggerButton || (
          <Button variant="outline" className="gap-2">
            <Save className="w-4 h-4" />
            Als Dokument speichern
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analyse als Dokument speichern</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="fileName">Dokumentname</Label>
              <Input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="z.B. Marktanalyse Max Mustermann März 2026"
                className="mt-1.5"
              />
              <p className="text-xs text-slate-500 mt-1">
                Das Dokument wird als HTML-Datei in Dropbox gespeichert
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={!fileName.trim() || isSaving}
              className="bg-blue-900 hover:bg-blue-800"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Speichern
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}