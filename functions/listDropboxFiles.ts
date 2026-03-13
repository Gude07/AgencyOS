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

    const { folderPath = '', recursive = false } = await req.json();

    // Dropbox Verbindung abrufen
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
    
    if (!accessToken) {
      return Response.json({ 
        success: false,
        error: 'Dropbox nicht verbunden' 
      }, { status: 500 });
    }

    // Liste der Dateien und Ordner abrufen
    const listResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: folderPath === '' ? '' : folderPath,
        recursive: recursive,
        include_media_info: false,
        include_deleted: false,
        include_has_explicit_shared_members: false
      })
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('Dropbox list error:', errorText);
      throw new Error(`Dropbox Listing fehlgeschlagen: ${errorText}`);
    }

    const listResult = await listResponse.json();
    
    // Nur Dateien zurückgeben, keine Ordner
    const files = listResult.entries
      .filter(entry => entry['.tag'] === 'file')
      .map(file => ({
        id: file.id,
        name: file.name,
        path: file.path_display,
        size: file.size,
        modified: file.server_modified,
        isFolder: false
      }));

    // Ordner auch zurückgeben für Navigation
    const folders = listResult.entries
      .filter(entry => entry['.tag'] === 'folder')
      .map(folder => ({
        id: folder.id,
        name: folder.name,
        path: folder.path_display,
        isFolder: true
      }));

    return Response.json({
      success: true,
      files: files,
      folders: folders,
      hasMore: listResult.has_more,
      cursor: listResult.cursor
    });

  } catch (error) {
    console.error('List files error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Dateien konnten nicht geladen werden' 
    }, { status: 500 });
  }
});