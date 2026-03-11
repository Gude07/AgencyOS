import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Download, Trash2, FileText, Loader2, Cloud } from "lucide-react";
import { toast } from "sonner";
import { formatInGermanTime } from "@/components/utils/dateUtils";

export default function DropboxDocumentManager({ entityType, entityId }) {
  const queryClient = useQueryClient();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentName, setDocumentName] = useState("");

  const { data: entity } = useQuery({
    queryKey: [entityType, entityId],
    queryFn: async () => {
      const items = await base44.entities[entityType].list();
      return items.find(item => item.id === entityId);
    },
    enabled: !!entityId && !!entityType,
  });

  const documents = entity?.dropbox_documents || [];

  const updateEntityMutation = useMutation({
    mutationFn: ({ data }) => base44.entities[entityType].update(entityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType.toLowerCase(), entityId] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['clubRequests'] });
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setDocumentName(file.name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Bitte wählen Sie eine Datei aus');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileName', documentName || selectedFile.name);
      formData.append('folderPath', `/STS Sports/${entityType}`);

      const response = await base44.functions.invoke('uploadToDropbox', formData);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Upload failed');
      }

      const newDocument = {
        ...response.data.file,
        name: documentName || selectedFile.name,
        type: selectedFile.type
      };

      const updatedDocuments = [...documents, newDocument];
      
      await updateEntityMutation.mutateAsync({
        data: { dropbox_documents: updatedDocuments }
      });

      toast.success('Dokument erfolgreich in Dropbox hochgeladen');
      setShowUploadDialog(false);
      setSelectedFile(null);
      setDocumentName("");
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Fehler beim Hochladen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docIndex) => {
    const updatedDocuments = documents.filter((_, index) => index !== docIndex);
    await updateEntityMutation.mutateAsync({
      data: { dropbox_documents: updatedDocuments }
    });
    toast.success('Dokument gelöscht');
  };

  const handleDownload = (doc) => {
    if (doc.url) {
      window.open(doc.url, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-800">Dropbox Dokumente</h3>
        </div>
        <Button
          onClick={() => setShowUploadDialog(true)}
          variant="outline"
          size="sm"
          className="text-blue-600 hover:text-blue-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          In Dropbox hochladen
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-8 text-center">
            <Cloud className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Noch keine Dokumente in Dropbox</p>
            <p className="text-sm text-slate-500 mt-1">Klicken Sie auf "In Dropbox hochladen"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <Card key={index} className="border-slate-200 bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 truncate">{doc.name}</p>
                        <Cloud className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-xs text-slate-500">
                        {doc.uploaded_date && formatInGermanTime(doc.uploaded_date, "dd.MM.yyyy HH:mm")}
                        {doc.uploaded_by && ` • ${doc.uploaded_by}`}
                        {doc.size && ` • ${(doc.size / 1024).toFixed(1)} KB`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      disabled={!doc.url}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dokument in Dropbox hochladen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="file-upload">Datei auswählen *</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                className="mt-1.5"
              />
              {selectedFile && (
                <p className="text-xs text-slate-500 mt-1">
                  Ausgewählt: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="doc-name">Dokumentname</Label>
              <Input
                id="doc-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Name des Dokuments..."
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowUploadDialog(false);
                setSelectedFile(null);
                setDocumentName("");
              }}
              disabled={uploading}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Lädt hoch...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 mr-2" />
                  In Dropbox hochladen
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}