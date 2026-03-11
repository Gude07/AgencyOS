import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, startDateTime, endDateTime, attendees, description } = await req.json();

    if (!subject || !startDateTime || !endDateTime) {
      return Response.json({ 
        error: 'Subject, startDateTime, and endDateTime are required' 
      }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('microsoft_teams');

    // Create online meeting
    const meetingResponse = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        subject: subject
      })
    });

    if (!meetingResponse.ok) {
      const error = await meetingResponse.text();
      throw new Error(`Teams meeting creation failed: ${error}`);
    }

    const meeting = await meetingResponse.json();

    // Create calendar event with the Teams meeting
    const eventResponse = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: subject,
        body: {
          contentType: 'HTML',
          content: description || ''
        },
        start: {
          dateTime: startDateTime,
          timeZone: 'Europe/Berlin'
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'Europe/Berlin'
        },
        attendees: (attendees || []).map(email => ({
          emailAddress: {
            address: email
          },
          type: 'required'
        })),
        isOnlineMeeting: true,
        onlineMeetingUrl: meeting.joinUrl
      })
    });

    if (!eventResponse.ok) {
      const error = await eventResponse.text();
      console.error('Calendar event creation failed:', error);
    }

    return Response.json({
      success: true,
      meeting: {
        id: meeting.id,
        joinUrl: meeting.joinUrl,
        subject: subject,
        startDateTime: startDateTime,
        endDateTime: endDateTime
      }
    });

  } catch (error) {
    console.error('Meeting creation error:', error);
    return Response.json({ 
      error: error.message || 'Meeting creation failed' 
    }, { status: 500 });
  }
});