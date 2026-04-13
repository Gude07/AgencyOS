import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { htmlContent, fileName, coachId, entityType = 'Coach' } = await req.json();

    if (!htmlContent || !fileName || !coachId) {
      return Response.json({ success: false, error: 'Fehlende Parameter' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
    if (!accessToken) {
      return Response.json({ success: false, error: 'Dropbox nicht verbunden' }, { status: 500 });
    }

    const filePath = `/STS Sports/Analysen/${fileName}`;
    const fileBuffer = new TextEncoder().encode(htmlContent);

    // Upload to Dropbox
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
      throw new Error(`Dropbox Upload fehlgeschlagen: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();

    // Create shared link
    let sharedUrl = null;
    const shareLinkResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: uploadResult.path_display,
        settings: { requested_visibility: 'public', audience: 'public', access: 'viewer' }
      })
    });

    if (shareLinkResponse.ok) {
      const linkResult = await shareLinkResponse.json();
      sharedUrl = linkResult.url.replace('?dl=0', '?raw=1');
    } else {
      // Try to get existing link
      const listRes = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: uploadResult.path_display, direct_only: true })
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData.links?.length > 0) {
          sharedUrl = listData.links[0].url.replace('?dl=0', '?raw=1');
        }
      }
    }

    // Save to Coach's dropbox_documents
    const entity = await base44.asServiceRole.entities[entityType].get(coachId);
    const existingDocs = Array.isArray(entity?.dropbox_documents) ? entity.dropbox_documents : [];
    const newDoc = {
      id: uploadResult.id,
      name: fileName.replace('.html', ''),
      path: uploadResult.path_display,
      url: sharedUrl,
      size: uploadResult.size,
      uploaded_date: new Date().toISOString(),
      uploaded_by: user.email,
      type: 'ki_analyse'
    };

    await base44.asServiceRole.entities[entityType].update(coachId, {
      dropbox_documents: [...existingDocs, newDoc]
    });

    return Response.json({ success: true, doc: newDoc });

  } catch (error) {
    console.error('saveAnalysisToDropbox error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});