import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    if (!payload.data) {
      return Response.json({ success: true, message: 'No data provided' });
    }

    const meeting = payload.data;
    
    // Überprüfe ob Outlook-Verbindung autorisiert ist
    let connectionData;
    try {
      connectionData = await base44.asServiceRole.connectors.getConnection('outlook');
    } catch (error) {
      console.error('Outlook connection error:', error);
      return Response.json({ 
        success: false,
        error: 'Outlook-Verbindung nicht autorisiert. Bitte autorisieren Sie die Outlook-Integration in den Einstellungen.',
        skipRetry: true
      }, { status: 400 });
    }

    const { accessToken } = connectionData;
    
    if (!accessToken || accessToken.length < 50) {
      return Response.json({ 
        success: false,
        error: 'Ungültiges Outlook Access Token. Bitte autorisieren Sie die Outlook-Integration neu.',
        skipRetry: true
      }, { status: 400 });
    }

    // DELETE: Remove from Outlook
    if (payload.event.type === 'delete' && meeting.outlook_event_id) {
      await fetch(
        `https://graph.microsoft.com/v1.0/me/events/${meeting.outlook_event_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return Response.json({
        success: true,
        message: 'Meeting deleted from Outlook'
      });
    }

    // CREATE or UPDATE
    const eventData = {
      subject: meeting.title,
      body: {
        contentType: 'Text',
        content: meeting.description || ''
      },
      start: {
        dateTime: meeting.start_date,
        timeZone: 'Europe/Berlin'
      },
      end: {
        dateTime: meeting.end_date,
        timeZone: 'Europe/Berlin'
      },
      location: {
        displayName: meeting.location || ''
      },
      attendees: (meeting.participants || []).map(email => ({
        emailAddress: {
          address: email
        },
        type: 'required'
      })),
      isOnlineMeeting: meeting.type === 'teams_meeting',
      onlineMeetingProvider: meeting.type === 'teams_meeting' ? 'teamsForBusiness' : null
    };

    let outlookEventId = meeting.outlook_event_id;

    if (payload.event.type === 'update' && outlookEventId) {
      // Update existing
      const updateResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/events/${outlookEventId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        const errorData = JSON.parse(errorText);
        
        // Throttling-Fehler: Warten und nicht sofort neu versuchen
        if (errorData.error?.code === 'ApplicationThrottled' || 
            errorData.error?.code === 'ErrorExceededMessageLimit') {
          return Response.json({ 
            success: false,
            error: `Outlook API-Limit erreicht: ${errorData.error.message}. Bitte warten Sie einige Minuten.`,
            skipRetry: true
          }, { status: 429 });
        }
        
        throw new Error(`Failed to update: ${errorText}`);
      }

      const updatedEvent = await updateResponse.json();
      
      // Update teams_link if it's a teams meeting
      if (meeting.type === 'teams_meeting' && updatedEvent.onlineMeeting) {
        await base44.asServiceRole.entities.Meeting.update(meeting.id, {
          teams_link: updatedEvent.onlineMeeting.joinUrl
        });
      }

    } else if (payload.event.type === 'create') {
      // Create new
      const createResponse = await fetch(
        'https://graph.microsoft.com/v1.0/me/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        const errorData = JSON.parse(errorText);
        
        // Token-Fehler: Keine Wiederholungsversuche
        if (errorData.error?.code === 'InvalidAuthenticationToken') {
          return Response.json({ 
            success: false,
            error: 'Outlook Access Token ist ungültig oder abgelaufen. Bitte autorisieren Sie die Outlook-Integration neu.',
            skipRetry: true
          }, { status: 401 });
        }
        
        // Throttling-Fehler
        if (errorData.error?.code === 'ApplicationThrottled' || 
            errorData.error?.code === 'ErrorExceededMessageLimit') {
          return Response.json({ 
            success: false,
            error: `Outlook API-Limit erreicht: ${errorData.error.message}. Bitte warten Sie einige Minuten.`,
            skipRetry: true
          }, { status: 429 });
        }
        
        throw new Error(`Failed to create: ${errorText}`);
      }

      const createdEvent = await createResponse.json();
      outlookEventId = createdEvent.id;

      // Update meeting with Outlook event ID and Teams link
      const updateData = {
        outlook_event_id: outlookEventId
      };

      if (meeting.type === 'teams_meeting' && createdEvent.onlineMeeting) {
        updateData.teams_link = createdEvent.onlineMeeting.joinUrl;
      }

      await base44.asServiceRole.entities.Meeting.update(meeting.id, updateData);
    }

    return Response.json({
      success: true,
      message: 'Meeting synced to Outlook',
      outlookEventId
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});