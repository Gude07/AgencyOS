import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, start_date, end_date, location, description } = await req.json();

    if (!title || !start_date) {
      return Response.json({ error: 'Missing required fields: title, start_date' }, { status: 400 });
    }

    // Get Outlook connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

    // Create event in Outlook
    const eventResponse = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: title,
        body: {
          contentType: 'Text',
          content: description || ''
        },
        start: {
          dateTime: start_date,
          timeZone: 'Europe/Berlin'
        },
        end: {
          dateTime: end_date || start_date,
          timeZone: 'Europe/Berlin'
        },
        location: location ? {
          displayName: location
        } : undefined
      })
    });

    if (!eventResponse.ok) {
      const error = await eventResponse.text();
      throw new Error(`Outlook API error: ${error}`);
    }

    const createdEvent = await eventResponse.json();

    return Response.json({ 
      success: true, 
      outlook_event_id: createdEvent.id,
      message: 'Termin erfolgreich in Outlook erstellt' 
    });

  } catch (error) {
    console.error('Error creating Outlook event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});