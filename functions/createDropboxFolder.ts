import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    const { folderPath, entityType, entityId, entityName } = await req.json();
    
    if (!folderPath) {
      return Response.json({ 
        error: 'Ordnerpfad erforderlich' 
      }, { status: 400 });
    }
    
    // Dropbox Verbindung abrufen
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
    
    if (!accessToken) {
      return Response.json({ 
        error: 'Dropbox nicht verbunden' 
      }, { status: 500 });
    }
    
    // Ordner erstellen
    const createFolderResponse = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: folderPath,
        autorename: false
      })
    });
    
    let folderMetadata;
    
    if (createFolderResponse.ok) {
      const result = await createFolderResponse.json();
      folderMetadata = result.metadata;
      console.log('Ordner erstellt:', folderMetadata.path_display);
    } else {
      const errorData = await createFolderResponse.json();
      
      // Wenn Ordner bereits existiert, ist das OK
      if (errorData.error_summary && errorData.error_summary.includes('path/conflict')) {
        console.log('Ordner existiert bereits:', folderPath);
        folderMetadata = { path_display: folderPath };
      } else {
        throw new Error(`Ordner-Erstellung fehlgeschlagen: ${errorData.error_summary}`);
      }
    }
    
    return Response.json({
      success: true,
      folder: {
        path: folderMetadata.path_display,
        created: true
      }
    });
    
  } catch (error) {
    console.error('Error creating Dropbox folder:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});