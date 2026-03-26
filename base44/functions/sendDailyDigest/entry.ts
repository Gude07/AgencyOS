import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service Role für Admin-Operationen
    const allUsers = await base44.asServiceRole.entities.User.list();
    const allTasks = await base44.asServiceRole.entities.Task.list();
    const allMeetings = await base44.asServiceRole.entities.Meeting.list();
    const allClubRequests = await base44.asServiceRole.entities.ClubRequest.list();
    const allDeals = await base44.asServiceRole.entities.Deal.list();
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    let digestsSent = 0;
    
    for (const user of allUsers) {
      if (!user.email) continue;
      
      // Aufgaben des Benutzers
      const userTasks = allTasks.filter(t => {
        const assigned = Array.isArray(t.assigned_to) ? t.assigned_to : [];
        return assigned.includes(user.email);
      });
      
      const openTasks = userTasks.filter(t => t.status !== 'abgeschlossen');
      const overdueTasks = userTasks.filter(t => {
        if (t.status === 'abgeschlossen' || !t.deadline) return false;
        return new Date(t.deadline) < today;
      });
      const dueSoon = userTasks.filter(t => {
        if (t.status === 'abgeschlossen' || !t.deadline) return false;
        const deadline = new Date(t.deadline);
        return deadline >= today && deadline <= nextWeek;
      });
      
      // Meetings des Benutzers
      const userMeetings = allMeetings.filter(m => {
        const participants = Array.isArray(m.participants) ? m.participants : [];
        return participants.includes(user.email);
      });
      
      const upcomingMeetings = userMeetings.filter(m => {
        const start = new Date(m.start_date);
        return start >= today && start <= nextWeek;
      }).slice(0, 5);
      
      // Neue Vereinsanfragen (letzte 7 Tage)
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const newRequests = allClubRequests.filter(r => {
        if (!r.created_date) return false;
        return new Date(r.created_date) >= lastWeek;
      });
      
      // Aktive Deals
      const activeDeals = allDeals.filter(d => {
        if (d.agency_id !== user.agency_id) return false;
        const assigned = Array.isArray(d.assigned_to) ? d.assigned_to : [];
        return assigned.includes(user.email) && 
               d.status !== 'abgeschlossen' && 
               d.status !== 'abgelehnt';
      });
      
      // Nur E-Mail senden wenn es relevante Updates gibt
      if (openTasks.length === 0 && upcomingMeetings.length === 0 && 
          newRequests.length === 0 && activeDeals.length === 0) {
        continue;
      }
      
      // E-Mail-Inhalt erstellen
      let emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">Guten Morgen, ${user.full_name}!</h2>
          <p>Hier ist Ihre tägliche Zusammenfassung für ${today.toLocaleDateString('de-DE')}:</p>
      `;
      
      if (overdueTasks.length > 0) {
        emailBody += `
          <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #991b1b; margin-top: 0;">⚠️ Überfällige Aufgaben (${overdueTasks.length})</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${overdueTasks.slice(0, 5).map(t => `<li>${t.title} - Fällig: ${new Date(t.deadline).toLocaleDateString('de-DE')}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      if (dueSoon.length > 0) {
        emailBody += `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">📋 Bald fällig (${dueSoon.length})</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${dueSoon.slice(0, 5).map(t => `<li>${t.title} - Fällig: ${new Date(t.deadline).toLocaleDateString('de-DE')}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      if (upcomingMeetings.length > 0) {
        emailBody += `
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">📅 Bevorstehende Meetings (${upcomingMeetings.length})</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${upcomingMeetings.map(m => `<li>${m.title} - ${new Date(m.start_date).toLocaleDateString('de-DE')} ${new Date(m.start_date).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      if (newRequests.length > 0) {
        emailBody += `
          <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #3730a3; margin-top: 0;">🏢 Neue Vereinsanfragen (${newRequests.length})</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${newRequests.slice(0, 5).map(r => `<li>${r.club_name} - ${r.position_needed}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      if (activeDeals.length > 0) {
        emailBody += `
          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #065f46; margin-top: 0;">💼 Aktive Deals (${activeDeals.length})</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${activeDeals.slice(0, 5).map(d => `<li>${d.title} - Status: ${d.status}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      emailBody += `
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              📊 Gesamt: ${openTasks.length} offene Aufgaben<br>
              Viel Erfolg heute!
            </p>
          </div>
        </div>
      `;
      
      // E-Mail senden
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `📊 Tägliche Zusammenfassung - ${today.toLocaleDateString('de-DE')}`,
        body: emailBody
      });
      
      digestsSent++;
    }
    
    return Response.json({ 
      success: true,
      digestsSent,
      message: `${digestsSent} Daily Digests versendet`
    });
    
  } catch (error) {
    console.error('Error sending daily digest:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});