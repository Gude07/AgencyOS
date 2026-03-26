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

    const formData = await req.formData();
    const file = formData.get('file');
    const folderPath = formData.get('folderPath') || '/STS Sports';
    const fileName = formData.get('fileName') || file.name;

    if (!file) {
      return Response.json({ 
        success: false,
        error: 'Keine Datei ausgewählt' 
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

    // Datei in ArrayBuffer konvertieren
    const fileBuffer = await file.arrayBuffer();
    const filePath = `${folderPath}/${fileName}`;

    console.log(`Uploading file to Dropbox: ${filePath}`);

    // Datei zu Dropbox hochladen
    const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: filePath,
          mode: 'add',
          autorename: true,
          mute: false
        })
      },
      body: fileBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Dropbox upload error:', errorText);
      throw new Error(`Dropbox Upload fehlgeschlagen: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('Upload successful:', uploadResult.path_display);

    // Shared Link erstellen
    let sharedLink = null;
    try {
      const shareLinkResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: uploadResult.path_display,
          settings: {
            requested_visibility: 'public',
            audience: 'public',
            access: 'viewer'
          }
        })
      });

      if (shareLinkResponse.ok) {
        const linkResult = await shareLinkResponse.json();
        // Ändern zu direktem Download-Link
        sharedLink = linkResult.url.replace('?dl=0', '?dl=1');
        console.log('Shared link created:', sharedLink);
      } else {
        // Wenn Link bereits existiert, versuche ihn abzurufen
        const listLinksResponse = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: uploadResult.path_display,
            direct_only: true
          })
        });

        if (listLinksResponse.ok) {
          const linksResult = await listLinksResponse.json();
          if (linksResult.links && linksResult.links.length > 0) {
            sharedLink = linksResult.links[0].url.replace('?dl=0', '?dl=1');
            console.log('Using existing shared link:', sharedLink);
          }
        }
      }
    } catch (linkError) {
      console.error('Error creating shared link:', linkError);
      // Fortfahren auch wenn Link-Erstellung fehlschlägt
    }

    return Response.json({
      success: true,
      file: {
        id: uploadResult.id,
        name: uploadResult.name,
        path: uploadResult.path_display,
        size: uploadResult.size,
        url: sharedLink,
        uploaded_date: new Date().toISOString(),
        uploaded_by: user.email
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Upload fehlgeschlagen' 
    }, { status: 500 });
  }
});