import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const folderPath = formData.get('folderPath') || '/STS Sports';
    const fileName = formData.get('fileName') || file.name;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
    
    const fileBuffer = await file.arrayBuffer();
    const filePath = `${folderPath}/${fileName}`;

    // Upload file to Dropbox
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
      const error = await uploadResponse.text();
      throw new Error(`Dropbox upload failed: ${error}`);
    }

    const uploadResult = await uploadResponse.json();

    // Create a shared link for the file
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

    let sharedLink = null;
    if (shareLinkResponse.ok) {
      const linkResult = await shareLinkResponse.json();
      sharedLink = linkResult.url.replace('?dl=0', '?dl=1');
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
      error: error.message || 'Upload failed' 
    }, { status: 500 });
  }
});