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

    // Shared Link erstellen (funktioniert für alle Dateitypen und kann direkt geöffnet werden)
    const sharedLinkResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
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

    let sharedLink;
    
    if (!sharedLinkResponse.ok) {
      const errorText = await sharedLinkResponse.text();
      const errorData = JSON.parse(errorText);
      
      // Wenn Link bereits existiert, bestehenden Link abrufen
      if (errorData.error && errorData.error['.tag'] === 'shared_link_already_exists') {
        const existingLinkResponse = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
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
        
        if (!existingLinkResponse.ok) {
          throw new Error('Fehler beim Abrufen des bestehenden Links');
        }
        
        const existingResult = await existingLinkResponse.json();
        if (existingResult.links && existingResult.links.length > 0) {
          sharedLink = existingResult.links[0].url;
        } else {
          throw new Error('Kein bestehender Link gefunden');
        }
      } else {
        throw new Error(`Shared-Link-Erstellung fehlgeschlagen: ${errorText}`);
      }
    } else {
      const sharedResult = await sharedLinkResponse.json();
      sharedLink = sharedResult.url;
    }

    // Dropbox-Link in direkten Download-/Vorschau-Link umwandeln
    // Ändere ?dl=0 zu ?raw=1 für direkte Ansicht im Browser
    const directLink = sharedLink.replace('?dl=0', '?raw=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');

    return Response.json({
      success: true,
      url: directLink,
      shareUrl: sharedLink
    });

  } catch (error) {
    console.error('Get file link error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Link konnte nicht erstellt werden' 
    }, { status: 500 });
  }
});