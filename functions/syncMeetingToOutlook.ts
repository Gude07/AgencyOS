import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    if (!payload.data) {
      return Response.json({ success: true, message: 'No data provided' });
    }

    const meeting = payload.data;
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

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
        throw new Error(`Failed to update: ${await updateResponse.text()}`);
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
        throw new Error(`Failed to create: ${await createResponse.text()}`);
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