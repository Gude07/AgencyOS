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
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
    
    if (!accessToken) {
      return Response.json({ 
        success: false,
        error: 'Dropbox nicht verbunden' 
      }, { status: 500 });
    }

    // Datei direkt von Dropbox herunterladen
    const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: filePath
        })
      }
    });

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      throw new Error(`Download fehlgeschlagen: ${errorText}`);
    }

    // Dateiname aus Pfad extrahieren
    const fileName = filePath.split('/').pop();
    
    // Content-Type aus Response-Header holen
    const contentType = downloadResponse.headers.get('content-type') || 'application/octet-stream';
    
    // Dateiinhalt als ArrayBuffer
    const fileBuffer = await downloadResponse.arrayBuffer();

    // Datei direkt zurückgeben
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.byteLength.toString()
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Download fehlgeschlagen' 
    }, { status: 500 });
  }
});