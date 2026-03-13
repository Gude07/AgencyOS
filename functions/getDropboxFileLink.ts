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

    // Temporären Download-Link erstellen (gültig für 4 Stunden)
    const downloadResponse = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: filePath
      })
    });

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      throw new Error(`Download-Link-Erstellung fehlgeschlagen: ${errorText}`);
    }

    const downloadResult = await downloadResponse.json();

    return Response.json({
      success: true,
      url: downloadResult.link,
      metadata: downloadResult.metadata
    });

  } catch (error) {
    console.error('Get file link error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Link konnte nicht erstellt werden' 
    }, { status: 500 });
  }
});