import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const apiKey = Deno.env.get("API_FOOTBALL_KEY");
        if (!apiKey) {
            return Response.json({ error: 'API_FOOTBALL_KEY not configured' }, { status: 500 });
        }

        const currentSeason = 2024;
        
        // Hole alle aktiven Spieler mit API-ID (nicht archiviert)
        const allPlayers = await base44.asServiceRole.entities.Player.list();
        const activePlayers = allPlayers.filter(player => 
            player.player_api_id && 
            !player.archive_id
        );

        console.log(`Found ${activePlayers.length} active players with API IDs`);

        let successCount = 0;
        let failCount = 0;
        let noDataCount = 0;
        const errors = [];

        for (const player of activePlayers) {
            try {
                console.log(`Fetching stats for ${player.name} (API ID: ${player.player_api_id})`);
                
                const stats = await fetchPlayerStats(player.player_api_id, currentSeason, apiKey);
                
                if (stats.hasData) {
                    // Upsert: prüfe ob bereits ein Datensatz existiert
                    const existingStats = await base44.asServiceRole.entities.PlayerStats.filter({
                        player_id: player.id,
                        season: String(currentSeason),
                        source: 'api_football'
                    });

                    const statsData = {
                        player_id: player.id,
                        player_name_external: player.name,
                        source: 'api_football',
                        season: String(currentSeason),
                        competition: stats.league || null,
                        club: stats.team || null,
                        position: stats.position || null,
                        appearances: stats.appearances,
                        starts: stats.starts,
                        minutes_played: stats.minutes,
                        goals: stats.goals,
                        assists: stats.assists,
                        yellow_cards: stats.yellow_cards,
                        red_cards: stats.red_cards,
                        data_status: 'api_data_available',
                        data_note: null,
                        last_updated: new Date().toISOString(),
                        raw_data: JSON.stringify(stats.raw)
                    };

                    if (existingStats.length > 0) {
                        await base44.asServiceRole.entities.PlayerStats.update(existingStats[0].id, statsData);
                        console.log(`Updated stats for ${player.name}`);
                    } else {
                        await base44.asServiceRole.entities.PlayerStats.create(statsData);
                        console.log(`Created stats for ${player.name}`);
                    }
                    
                    successCount++;
                } else {
                    // Keine Daten verfügbar
                    const existingStats = await base44.asServiceRole.entities.PlayerStats.filter({
                        player_id: player.id,
                        season: String(currentSeason),
                        source: 'api_football'
                    });

                    const noDataRecord = {
                        player_id: player.id,
                        player_name_external: player.name,
                        source: 'api_football',
                        season: String(currentSeason),
                        competition: null,
                        club: null,
                        position: null,
                        appearances: null,
                        starts: null,
                        minutes_played: null,
                        goals: null,
                        assists: null,
                        yellow_cards: null,
                        red_cards: null,
                        data_status: 'no_api_data_found',
                        data_note: 'No statistics available from API-Football for this player.',
                        last_updated: new Date().toISOString(),
                        raw_data: null
                    };

                    if (existingStats.length > 0) {
                        await base44.asServiceRole.entities.PlayerStats.update(existingStats[0].id, noDataRecord);
                    } else {
                        await base44.asServiceRole.entities.PlayerStats.create(noDataRecord);
                    }
                    
                    noDataCount++;
                    console.log(`No data available for ${player.name}`);
                }
            } catch (error) {
                console.error(`Error processing ${player.name}:`, error.message);
                errors.push({ player: player.name, error: error.message });
                failCount++;
            }

            // Kurze Pause zwischen Requests (Rate Limiting)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return Response.json({
            success: true,
            processed: activePlayers.length,
            successful: successCount,
            noData: noDataCount,
            failed: failCount,
            errors: errors
        });
    } catch (error) {
        console.error('Fatal error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function fetchPlayerStats(playerId, season, apiKey) {
    const url = `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`;
    
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
        try {
            const response = await fetch(url, {
                headers: {
                    'x-apisports-key': apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();

            if (!data.response || data.response.length === 0) {
                return { hasData: false };
            }

            const playerData = data.response[0];
            const statistics = playerData.statistics?.[0];

            if (!statistics) {
                return { hasData: false };
            }

            return {
                hasData: true,
                goals: statistics.goals?.total || 0,
                assists: statistics.goals?.assists || 0,
                minutes: statistics.games?.minutes || 0,
                appearances: statistics.games?.appearences || 0,
                starts: statistics.games?.lineups || 0,
                yellow_cards: statistics.cards?.yellow || 0,
                red_cards: statistics.cards?.red || 0,
                league: statistics.league?.name || null,
                team: statistics.team?.name || null,
                position: statistics.games?.position || null,
                raw: statistics
            };
        } catch (error) {
            attempt++;
            if (attempt >= maxAttempts) {
                throw error;
            }
            console.log(`Retry ${attempt} for player ${playerId}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}