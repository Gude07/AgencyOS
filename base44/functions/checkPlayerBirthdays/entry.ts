import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Get all agencies' players (service role)
  const players = await base44.asServiceRole.entities.Player.list();
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  // Find players with birthday in the next 7 days
  const upcoming = [];
  for (const player of players) {
    if (!player.date_of_birth || player.archive_id) continue;
    const dob = new Date(player.date_of_birth);
    const birthMonth = dob.getMonth() + 1;
    const birthDay = dob.getDate();

    // Calculate days until birthday this year
    let birthdayThisYear = new Date(today.getFullYear(), birthMonth - 1, birthDay);
    if (birthdayThisYear < today) {
      birthdayThisYear = new Date(today.getFullYear() + 1, birthMonth - 1, birthDay);
    }
    const diffMs = birthdayThisYear - today;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 7 && diffDays >= 0) {
      const age = birthdayThisYear.getFullYear() - dob.getFullYear();
      upcoming.push({ player, diffDays, age });
    }
  }

  if (upcoming.length === 0) {
    return Response.json({ message: "Keine anstehenden Geburtstage", notified: 0 });
  }

  // Get all users per agency and send notifications
  const users = await base44.asServiceRole.entities.User.list();
  const notificationsCreated = [];

  for (const { player, diffDays, age } of upcoming) {
    // Check if notification already sent today for this player
    const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
      entity_id: player.id,
      entity_type: "Player",
      type: "spieler_update",
    });

    const today_str = new Date().toISOString().split('T')[0];
    const alreadySentToday = existingNotifs.some(n => {
      return n.created_date && n.created_date.startsWith(today_str) && n.title?.includes('Geburtstag');
    });

    if (alreadySentToday) continue;

    const agencyUsers = users.filter(u => u.agency_id === player.agency_id);
    const dayText = diffDays === 0
      ? "🎂 Heute"
      : diffDays === 1
      ? "🎉 Morgen"
      : `📅 In ${diffDays} Tagen`;

    const title = `${dayText}: Geburtstag von ${player.name}`;
    const message = diffDays === 0
      ? `${player.name} hat heute Geburtstag und wird ${age} Jahre alt! 🎂`
      : `${player.name} hat in ${diffDays} Tag${diffDays > 1 ? 'en' : ''} Geburtstag und wird ${age} Jahre alt.`;

    for (const user of agencyUsers) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: user.email,
        type: "spieler_update",
        title,
        message,
        link: `PlayerDetail?id=${player.id}`,
        entity_id: player.id,
        entity_type: "Player",
        read: false,
      });
      notificationsCreated.push(player.name);
    }
  }

  return Response.json({
    message: `${notificationsCreated.length} Geburtstags-Benachrichtigungen erstellt`,
    players: notificationsCreated,
  });
});