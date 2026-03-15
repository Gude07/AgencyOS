import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        success: false,
        error: 'Nur Administratoren können diese Funktion ausführen' 
      }, { status: 403 });
    }

    let fixedCount = 0;
    const entityTypes = ['Player', 'Coach', 'ClubRequest'];

    for (const entityType of entityTypes) {
      const entities = await base44.asServiceRole.entities[entityType].list();
      
      for (const entity of entities) {
        if (entity.dropbox_documents && entity.dropbox_documents.length > 0) {
          let needsUpdate = false;
          const cleanedDocs = entity.dropbox_documents.map(doc => {
            if (doc.path && doc.path.trim() !== doc.path) {
              needsUpdate = true;
              return {
                ...doc,
                path: doc.path.trim()
              };
            }
            return doc;
          });

          if (needsUpdate) {
            await base44.asServiceRole.entities[entityType].update(entity.id, {
              dropbox_documents: cleanedDocs
            });
            fixedCount++;
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: `${fixedCount} Datensätze bereinigt`
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});