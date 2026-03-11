import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body, club_request_id, deal_id, player_id } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    // Get Outlook connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

    // Send email via Microsoft Graph API
    const emailResponse = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          subject: subject,
          body: {
            contentType: 'HTML',
            content: body.replace(/\n/g, '<br>')
          },
          toRecipients: [{
            emailAddress: {
              address: to
            }
          }]
        },
        saveToSentItems: true
      })
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Outlook API error: ${error}`);
    }

    // Save to Communication entity if club_request_id is provided
    if (club_request_id) {
      await base44.asServiceRole.entities.Communication.create({
        club_request_id: club_request_id,
        date: new Date().toISOString(),
        type: 'email',
        subject: subject,
        details: body,
        contact_person: to,
        discussed_players: player_id ? [player_id] : []
      });
    }

    // Save to DealUpdate if deal_id is provided
    if (deal_id) {
      await base44.asServiceRole.entities.DealUpdate.create({
        deal_id: deal_id,
        update_type: 'communication',
        title: `E-Mail gesendet: ${subject}`,
        description: `An: ${to}\n\n${body}`
      });
    }

    return Response.json({ 
      success: true, 
      message: 'E-Mail erfolgreich gesendet und in der App gespeichert' 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});