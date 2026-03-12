import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Hole alle archivierten Vereinsanfragen
        const allRequests = await base44.asServiceRole.entities.ClubRequest.list();
        const archivedRequestIds = allRequests
            .filter(req => req.archive_id)
            .map(req => req.id);

        console.log(`Gefundene archivierte Anfragen: ${archivedRequestIds.length}`);

        // Hole alle Spieler
        const allPlayers = await base44.asServiceRole.entities.Player.list();
        let updatedCount = 0;

        for (const player of allPlayers) {
            let needsUpdate = false;
            const updates = {};

            // Bereinige favorite_matches
            if (player.favorite_matches && player.favorite_matches.length > 0) {
                const cleanedFavorites = player.favorite_matches.filter(
                    id => !archivedRequestIds.includes(id)
                );
                if (cleanedFavorites.length !== player.favorite_matches.length) {
                    updates.favorite_matches = cleanedFavorites;
                    needsUpdate = true;
                }
            }

            // Bereinige offered_to_requests
            if (player.offered_to_requests && player.offered_to_requests.length > 0) {
                const cleanedOffered = player.offered_to_requests.filter(
                    id => !archivedRequestIds.includes(id)
                );
                if (cleanedOffered.length !== player.offered_to_requests.length) {
                    updates.offered_to_requests = cleanedOffered;
                    needsUpdate = true;
                }
            }

            // Update nur wenn nötig
            if (needsUpdate) {
                await base44.asServiceRole.entities.Player.update(player.id, updates);
                updatedCount++;
                console.log(`Spieler ${player.name} bereinigt`);
            }
        }

        return Response.json({
            success: true,
            archivedRequestsFound: archivedRequestIds.length,
            playersUpdated: updatedCount,
            message: `${updatedCount} Spieler wurden bereinigt`
        });
    } catch (error) {
        console.error('Fehler beim Bereinigen:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});