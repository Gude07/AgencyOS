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
import { Upload, Download, Trash2, FileText, Loader2, Cloud, Share2 } from "lucide-react";
import { toast } from "sonner";
import { formatInGermanTime } from "@/components/utils/dateUtils";

export default function DropboxDocumentManager({ entityType, entityId }) {
  const queryClient = useQueryClient();
  const [showBrowseDialog, setShowBrowseDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropboxFiles, setDropboxFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('');
  const [folders, setFolders] = useState([]);
  const [selectedDropboxFile, setSelectedDropboxFile] = useState(null);

  const { data: entity } = useQuery({
    queryKey: [entityType.toLowerCase(), entityId],
    queryFn: async () => {
      return await base44.entities[entityType].get(entityId);
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
      queryClient.invalidateQueries({ queryKey: ['player', entityId] });
      queryClient.invalidateQueries({ queryKey: ['coach', entityId] });
    },
  });

  const loadDropboxFiles = async (folderPath = '') => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('listDropboxFiles', { 
        folderPath,
        recursive: false 
      });

      if (response.data.success) {
        setDropboxFiles(response.data.files || []);
        setFolders(response.data.folders || []);
      } else {
        throw new Error(response.data.error || 'Fehler beim Laden der Dateien');
      }
    } catch (error) {
      console.error('Error loading Dropbox files:', error);
      toast.error('Fehler beim Laden: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folderPath) => {
    setCurrentFolder(folderPath);
    loadDropboxFiles(folderPath);
  };

  const handleBackClick = () => {
    const parentPath = currentFolder.substring(0, currentFolder.lastIndexOf('/'));
    setCurrentFolder(parentPath);
    loadDropboxFiles(parentPath);
  };

  const handleSelectDropboxFile = async (file) => {
    setLoading(true);
    try {
      const user = await base44.auth.me();

      // Dokument direkt mit Pfad speichern (Link wird beim Öffnen generiert)
      const newDocument = {
        id: file.id,
        name: file.name,
        path: file.path.trim(), // Pfad bereinigen
        size: file.size,
        uploaded_date: file.modified || new Date().toISOString(),
        uploaded_by: user.email,
        type: file.name.split('.').pop()
      };

      const updatedDocuments = [...documents, newDocument];
      
      await updateEntityMutation.mutateAsync({
        data: { 
          ...entity,
          dropbox_documents: updatedDocuments 
        }
      });

      toast.success('Dokument aus Dropbox verknüpft');
      setShowBrowseDialog(false);
      setSelectedDropboxFile(null);
    } catch (error) {
      console.error('Error linking document:', error);
      toast.error('Fehler beim Verknüpfen: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (showBrowseDialog) {
      loadDropboxFiles('');
    }
  }, [showBrowseDialog]);

  const handleDelete = async (docIndex) => {
    try {
      const updatedDocuments = documents.filter((_, index) => index !== docIndex);
      await updateEntityMutation.mutateAsync({
        data: { 
          ...entity,
          dropbox_documents: updatedDocuments 
        }
      });
      toast.success('Dokument aus Liste entfernt');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleView = async (doc) => {
    // Dokument mit direkter URL (KI-Analyse oder einfaches URL-Dokument)
    if (doc.url) {
      window.open(doc.url, '_blank');
      return;
    }
    try {
      toast.loading('Dokument wird geladen...', { id: 'doc-view' });
      const response = await base44.functions.invoke('getDropboxFileLink', { filePath: doc.path });
      if (response.data.success) {
        window.open(response.data.previewUrl, '_blank');
        toast.success('Dokument geöffnet', { id: 'doc-view' });
      } else {
        throw new Error(response.data.error || 'Fehler beim Laden');
      }
    } catch (error) {
      toast.error('Dokument konnte nicht geöffnet werden', { id: 'doc-view' });
    }
  };

  const handleDownload = async (doc) => {
    // Dokument mit direkter URL: fetch + blob für korrekten Download
    if (doc.url) {
      try {
        toast.loading('Download wird vorbereitet...', { id: 'doc-dl' });
        const res = await fetch(doc.url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = (doc.name || 'Dokument') + '.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        toast.success('Download gestartet', { id: 'doc-dl' });
      } catch {
        toast.error('Download fehlgeschlagen', { id: 'doc-dl' });
      }
      return;
    }

    try {
      toast.loading('Download wird vorbereitet...', { id: 'doc-download' });
      
      const response = await base44.functions.invoke('getDropboxFileLink', {
        filePath: doc.path
      });

      if (response.data.success) {
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = doc.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Download gestartet', { id: 'doc-download' });
      } else {
        throw new Error(response.data.error || 'Fehler beim Download');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download fehlgeschlagen', { id: 'doc-download' });
    }
  };

  const handleShare = async (doc) => {
    // Dokument mit direkter URL (KI-Analyse)
    if (doc.url && doc.type === 'ki_analyse') {
      try {
        await navigator.clipboard.writeText(doc.url);
        toast.success('Link in Zwischenablage kopiert');
      } catch {
        toast.error('Link konnte nicht kopiert werden');
      }
      return;
    }
    try {
      const response = await base44.functions.invoke('getDropboxFileLink', {
        filePath: doc.path
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Fehler beim Teilen');
      }

      // Web Share API für mobile Geräte
      if (navigator.share) {
        try {
          await navigator.share({
            title: doc.name,
            text: `Dokument: ${doc.name}`,
            url: response.data.shareUrl
          });
          toast.success('Dokument geteilt');
        } catch (shareError) {
          // Benutzer hat Teilen abgebrochen
          if (shareError.name !== 'AbortError') {
            throw shareError;
          }
        }
      } else {
        // Fallback: Link in Zwischenablage kopieren
        await navigator.clipboard.writeText(response.data.shareUrl);
        toast.success('Link in Zwischenablage kopiert');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Teilen fehlgeschlagen');
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
          onClick={() => setShowBrowseDialog(true)}
          variant="outline"
          size="sm"
          className="text-blue-600 hover:text-blue-700 border-blue-600"
        >
          <Cloud className="w-4 h-4 mr-2" />
          Aus Dropbox verknüpfen
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-8 text-center">
            <Cloud className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Noch keine Dokumente verknüpft</p>
            <p className="text-sm text-slate-500 mt-1">Klicken Sie auf "Aus Dropbox verknüpfen" um Dokumente hinzuzufügen</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <Card 
              key={index} 
              className="border-slate-200 bg-white hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleView(doc)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 truncate">{doc.name}</p>
                        <Cloud className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      </div>
                      <p className="text-xs text-slate-500">
                        {doc.uploaded_date && formatInGermanTime(doc.uploaded_date, "dd.MM.yyyy HH:mm")}
                        {doc.uploaded_by && ` • ${doc.uploaded_by}`}
                        {doc.size && ` • ${(doc.size / 1024).toFixed(1)} KB`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      title="Herunterladen"
                      className="hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare(doc)}
                      title="Teilen"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      title="Entfernen"
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

      <Dialog open={showBrowseDialog} onOpenChange={setShowBrowseDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              Dokument aus Dropbox auswählen
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentFolder('');
                  loadDropboxFiles('');
                }}
                className="h-7 px-2"
              >
                Dropbox
              </Button>
              {currentFolder.split('/').filter(Boolean).map((folder, idx, arr) => {
                const path = '/' + arr.slice(0, idx + 1).join('/');
                return (
                  <React.Fragment key={path}>
                    <span>/</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentFolder(path);
                        loadDropboxFiles(path);
                      }}
                      className="h-7 px-2"
                    >
                      {folder}
                    </Button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Back Button */}
            {currentFolder && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackClick}
                className="w-full justify-start"
              >
                ← Zurück
              </Button>
            )}

            {/* Folder and File List */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Lade Dateien...</p>
                </div>
              ) : (
                <div className="divide-y">
                  {/* Folders */}
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleFolderClick(folder.path)}
                      className="w-full p-3 hover:bg-slate-50 transition-colors text-left flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{folder.name}</p>
                        <p className="text-xs text-slate-500">Ordner</p>
                      </div>
                    </button>
                  ))}

                  {/* Files */}
                  {dropboxFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => setSelectedDropboxFile(file)}
                      className={`w-full p-3 hover:bg-slate-50 transition-colors text-left flex items-center gap-3 ${
                        selectedDropboxFile?.id === file.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </button>
                  ))}

                  {folders.length === 0 && dropboxFiles.length === 0 && (
                    <div className="p-8 text-center">
                      <Cloud className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600">Keine Dateien in diesem Ordner</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBrowseDialog(false);
                setSelectedDropboxFile(null);
                setCurrentFolder('');
              }}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={() => handleSelectDropboxFile(selectedDropboxFile)}
              disabled={!selectedDropboxFile || loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird verknüpft...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 mr-2" />
                  Verknüpfen
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}