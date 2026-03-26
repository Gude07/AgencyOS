import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const { event, data } = await req.json();
    
    // Automatisch Dropbox-Ordner erstellen
    if (data && data.title) {
      const base44 = createClientFromRequest(req);
      
      const folderPath = `/STS Sports/Deal/${data.title}`;
      
      // Dropbox Verbindung abrufen
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
      
      if (accessToken) {
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
        
        if (createFolderResponse.ok) {
          console.log(`Dropbox-Ordner erstellt für Deal: ${data.title}`);
        } else {
          const errorData = await createFolderResponse.json();
          if (!errorData.error_summary?.includes('path/conflict')) {
            console.error('Fehler beim Erstellen des Dropbox-Ordners:', errorData);
          }
        }
      }
    }
    
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('Error in onDealCreated:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});