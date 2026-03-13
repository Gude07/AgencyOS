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

    // Versuche zuerst, existierende Links abzurufen
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

    let sharedLink = null;

    if (listLinksResponse.ok) {
      const linksResult = await listLinksResponse.json();
      if (linksResult.links && linksResult.links.length > 0) {
        // Existierenden Link verwenden
        sharedLink = linksResult.links[0].url.replace('?dl=0', '?dl=1');
      }
    }

    // Falls kein Link existiert, neuen erstellen
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
        const linkResult = await createLinkResponse.json();
        sharedLink = linkResult.url.replace('?dl=0', '?dl=1');
      } else {
        const errorText = await createLinkResponse.text();
        throw new Error(`Link-Erstellung fehlgeschlagen: ${errorText}`);
      }
    }

    return Response.json({
      success: true,
      url: sharedLink
    });

  } catch (error) {
    console.error('Get file link error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Link konnte nicht erstellt werden' 
    }, { status: 500 });
  }
});