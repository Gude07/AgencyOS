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

    // Versuche zuerst bestehende Shared Links zu holen
    const listLinksResponse = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: filePath,
        direct_only: true
      })
    });

    let sharedLink;

    if (listLinksResponse.ok) {
      const listResult = await listLinksResponse.json();
      if (listResult.links && listResult.links.length > 0) {
        // Bestehenden Link verwenden
        sharedLink = listResult.links[0].url;
      }
    }

    // Falls kein bestehender Link, neuen erstellen
    if (!sharedLink) {
      const createLinkResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: filePath,
          settings: {
            requested_visibility: 'public',
            audience: 'public',
            access: 'viewer'
          }
        })
      });

      if (createLinkResponse.ok) {
        const createResult = await createLinkResponse.json();
        sharedLink = createResult.url;
      } else {
        const errorText = await createLinkResponse.text();
        console.error('Create link error:', errorText);
        return Response.json({ 
          success: false,
          error: 'Fehler beim Erstellen des Links' 
        }, { status: 500 });
      }
    }

    if (!sharedLink) {
      return Response.json({ 
        success: false,
        error: 'Kein Link verfügbar' 
      }, { status: 500 });
    }

    // Erstelle verschiedene Link-Versionen für unterschiedliche Zwecke
    // 1. Vorschau-Link (öffnet Datei direkt im Browser)
    const previewLink = sharedLink.replace('?dl=0', '?raw=1');
    
    // 2. Download-Link (forciert Download)
    const downloadLink = sharedLink.replace('?dl=0', '?dl=1');

    return Response.json({
      success: true,
      previewUrl: previewLink,      // Für Öffnen/Ansehen
      downloadUrl: downloadLink,    // Für Download
      shareUrl: sharedLink          // Für Teilen (Standard Dropbox Link)
    });

  } catch (error) {
    console.error('Get file link error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Link konnte nicht erstellt werden' 
    }, { status: 500 });
  }
});