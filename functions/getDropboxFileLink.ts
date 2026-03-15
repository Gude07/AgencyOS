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

    // Pfad bereinigen (Leerzeichen am Anfang entfernen)
    const cleanPath = filePath.trim();

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

    // Temporären Download-Link erstellen
    const tempLinkResponse = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: cleanPath })
    });

    if (!tempLinkResponse.ok) {
      const errorText = await tempLinkResponse.text();
      console.error('Temporary link error:', errorText);
      return Response.json({ 
        success: false,
        error: 'Datei konnte nicht gefunden werden. Möglicherweise wurde sie gelöscht oder verschoben.' 
      }, { status: 404 });
    }

    const tempLinkData = await tempLinkResponse.json();
    const downloadUrl = tempLinkData.link;

    // Alle Link-Varianten zurückgeben
    // Der temporäre Link funktioniert für alle Zwecke (4 Stunden gültig)
    return Response.json({
      success: true,
      previewUrl: downloadUrl,   // Für Öffnen/Ansehen
      downloadUrl: downloadUrl,  // Für Download  
      shareUrl: downloadUrl      // Für Teilen
    });

  } catch (error) {
    console.error('Get file link error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Link konnte nicht erstellt werden' 
    }, { status: 500 });
  }
});