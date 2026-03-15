import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ 
        success: false,
        error: 'Nicht autorisiert - bitte anmelden' 
      }, { status: 401 });
    }

    const { filePath } = await req.json();

    if (!filePath) {
      return Response.json({ 
        success: false,
        error: 'Dateipfad fehlt' 
      }, { status: 400 });
    }

    // Dropbox Verbindung abrufen
    let connectionData;
    try {
      connectionData = await base44.asServiceRole.connectors.getConnection('dropbox');
    } catch (error) {
      return Response.json({ 
        success: false,
        error: 'Dropbox nicht verbunden' 
      }, { status: 500 });
    }
    
    const { accessToken } = connectionData;

    // Datei direkt von Dropbox herunterladen
    const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: filePath })
      }
    });

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      console.error('Download error:', errorText);
      return Response.json({ 
        success: false,
        error: 'Datei konnte nicht heruntergeladen werden' 
      }, { status: 500 });
    }

    // Datei als Blob lesen
    const fileBlob = await downloadResponse.blob();
    const fileName = filePath.split('/').pop();

    // Datei zu Base44 hochladen
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);

    const uploadResult = await base44.integrations.Core.UploadFile({ file: fileBlob });

    if (!uploadResult.file_url) {
      return Response.json({ 
        success: false,
        error: 'Upload fehlgeschlagen' 
      }, { status: 500 });
    }

    // Alle drei Link-Typen zurückgeben (alle zeigen auf die gleiche Base44-URL)
    return Response.json({
      success: true,
      previewUrl: uploadResult.file_url,   // Für Öffnen/Ansehen
      downloadUrl: uploadResult.file_url,  // Für Download
      shareUrl: uploadResult.file_url      // Für Teilen
    });

  } catch (error) {
    console.error('Get file link error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Link konnte nicht erstellt werden' 
    }, { status: 500 });
  }
});