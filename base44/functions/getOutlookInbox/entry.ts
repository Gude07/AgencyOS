import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

    const [emailsRes, calendarRes] = await Promise.all([
      fetch('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=20&$select=id,subject,from,receivedDateTime,isRead,bodyPreview&$orderby=receivedDateTime desc', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      fetch(`https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${new Date().toISOString()}&endDateTime=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}&$select=id,subject,start,end,location,bodyPreview,organizer&$orderby=start/dateTime`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Prefer': 'outlook.timezone="Europe/Berlin"' }
      })
    ]);

    const emailsData = emailsRes.ok ? await emailsRes.json() : { value: [] };
    const calendarData = calendarRes.ok ? await calendarRes.json() : { value: [] };

    return Response.json({
      emails: emailsData.value || [],
      events: calendarData.value || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});