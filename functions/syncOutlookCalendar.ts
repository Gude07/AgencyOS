import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get Outlook connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

    // Get calendar events from Outlook for the next 30 days
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const calendarResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${endDate.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'outlook.timezone="Europe/Berlin"'
        }
      }
    );

    if (!calendarResponse.ok) {
      const error = await calendarResponse.text();
      throw new Error(`Outlook API error: ${error}`);
    }

    const calendarData = await calendarResponse.json();
    const outlookEvents = calendarData.value || [];

    // Get existing meetings from Base44
    const existingMeetings = await base44.asServiceRole.entities.Meeting.list();
    const agencies = await base44.asServiceRole.entities.Agency.list();
    const defaultAgency = agencies[0];

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const event of outlookEvents) {
      // Check if event already exists (by Outlook ID stored in description or by matching time/title)
      const existingMeeting = existingMeetings.find(m => 
        m.description?.includes(`[Outlook-ID: ${event.id}]`) ||
        (m.title === event.subject && 
         m.start_date === event.start.dateTime &&
         m.end_date === event.end.dateTime)
      );

      const meetingData = {
        agency_id: defaultAgency?.id,
        title: event.subject || 'Ohne Titel',
        description: event.bodyPreview + `\n\n[Outlook-ID: ${event.id}]`,
        start_date: event.start.dateTime,
        end_date: event.end.dateTime,
        location: event.location?.displayName || undefined,
        type: 'meeting'
      };

      if (existingMeeting) {
        // Update if content changed
        if (existingMeeting.title !== meetingData.title || 
            existingMeeting.description !== meetingData.description) {
          await base44.asServiceRole.entities.Meeting.update(existingMeeting.id, meetingData);
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new meeting
        await base44.asServiceRole.entities.Meeting.create(meetingData);
        created++;
      }
    }

    return Response.json({ 
      success: true,
      synced: outlookEvents.length,
      created,
      updated,
      skipped,
      message: `Kalender synchronisiert: ${created} neu, ${updated} aktualisiert, ${skipped} unverändert`
    });

  } catch (error) {
    console.error('Error syncing calendar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});