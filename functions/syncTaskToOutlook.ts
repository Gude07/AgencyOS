import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    // Nur bei Create oder Update mit Deadline
    if (!payload.data || !payload.data.deadline) {
      return Response.json({ success: true, message: 'No deadline, skipping Outlook sync' });
    }

    const task = payload.data;
    
    // Outlook Event erstellen oder aktualisieren
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');
    
    const eventData = {
      subject: `Deadline: ${task.title}`,
      body: {
        contentType: 'Text',
        content: task.description || ''
      },
      start: {
        dateTime: `${task.deadline}T09:00:00`,
        timeZone: 'Europe/Berlin'
      },
      end: {
        dateTime: `${task.deadline}T10:00:00`,
        timeZone: 'Europe/Berlin'
      },
      isReminderOn: true,
      reminderMinutesBeforeStart: 60
    };

    let outlookEventId = task.outlook_event_id;

    if (payload.event.type === 'update' && outlookEventId) {
      // Update existing Outlook event
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
        throw new Error(`Failed to update Outlook event: ${await updateResponse.text()}`);
      }
    } else if (payload.event.type === 'create') {
      // Create new Outlook event
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
        throw new Error(`Failed to create Outlook event: ${await createResponse.text()}`);
      }

      const createdEvent = await createResponse.json();
      outlookEventId = createdEvent.id;

      // Update task with Outlook event ID
      await base44.asServiceRole.entities.Task.update(task.id, {
        outlook_event_id: outlookEventId
      });
    }

    return Response.json({
      success: true,
      message: 'Task synced to Outlook',
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