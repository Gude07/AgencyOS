import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');
    
    // Get calendar events from Outlook (last 30 days and next 90 days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$top=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Outlook sync failed: ${error}`);
    }

    const data = await response.json();
    const outlookEvents = data.value || [];

    // Get existing meetings from app
    const existingMeetings = await base44.asServiceRole.entities.Meeting.list();
    
    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const event of outlookEvents) {
      // Check if meeting already exists (by outlook_event_id)
      const existing = existingMeetings.find(m => m.outlook_event_id === event.id);
      
      const meetingData = {
        agency_id: user.agency_id,
        title: event.subject,
        description: event.bodyPreview || '',
        start_date: event.start.dateTime,
        end_date: event.end.dateTime,
        location: event.location?.displayName || '',
        type: event.isOnlineMeeting ? 'teams_meeting' : 'meeting',
        teams_link: event.onlineMeetingUrl || null,
        outlook_event_id: event.id,
        participants: event.attendees?.map(a => a.emailAddress.address) || []
      };

      if (existing) {
        // Update existing meeting
        await base44.asServiceRole.entities.Meeting.update(existing.id, meetingData);
        updatedCount++;
      } else {
        // Create new meeting
        await base44.asServiceRole.entities.Meeting.create(meetingData);
        createdCount++;
      }
      syncedCount++;
    }

    return Response.json({
      success: true,
      synced: syncedCount,
      created: createdCount,
      updated: updatedCount,
      message: `Synced ${syncedCount} events from Outlook (${createdCount} new, ${updatedCount} updated)`
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ 
      error: error.message || 'Sync failed' 
    }, { status: 500 });
  }
});