import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    let connectionData;
    try {
      connectionData = await base44.asServiceRole.connectors.getConnection('outlook');
    } catch (error) {
      console.error('Outlook connection error:', error);
      return Response.json({ 
        success: false,
        error: 'Outlook-Verbindung nicht verfügbar',
        skipRetry: true
      }, { status: 400 });
    }
    
    const { accessToken } = connectionData;
    
    // Reduzierter Zeitraum: nur letzte 7 Tage und nächste 60 Tage
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 60);

    // Limit auf 50 Events um API-Last zu reduzieren
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$top=50`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        throw new Error(`Outlook sync failed: ${errorText}`);
      }
      
      // Throttling-Fehler: Keine Wiederholungsversuche
      if (errorData.error?.code === 'ApplicationThrottled' || 
          errorData.error?.code === 'ErrorExceededMessageLimit') {
        return Response.json({ 
          success: false,
          error: `Outlook API-Limit erreicht. Synchronisation wird später fortgesetzt.`,
          skipRetry: true
        }, { status: 429 });
      }
      
      // Token-Fehler
      if (errorData.error?.code === 'InvalidAuthenticationToken') {
        return Response.json({ 
          success: false,
          error: 'Outlook Access Token ungültig',
          skipRetry: true
        }, { status: 401 });
      }
      
      throw new Error(`Outlook sync failed: ${errorText}`);
    }

    const data = await response.json();
    const outlookEvents = data.value || [];

    // Get existing meetings from app
    const existingMeetings = await base44.asServiceRole.entities.Meeting.list();
    
    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    // Rate Limiting: Kleine Verzögerungen zwischen Updates
    for (const event of outlookEvents) {
      await new Promise(resolve => setTimeout(resolve, 200));
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