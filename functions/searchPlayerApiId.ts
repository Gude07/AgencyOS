import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerName, nationality, dateOfBirth } = await req.json();

    if (!playerName) {
      return Response.json({ error: 'Player name is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      return Response.json({ error: 'API_FOOTBALL_KEY not configured' }, { status: 500 });
    }

    // Search for player by name
    const searchUrl = `https://v3.football.api-sports.io/players?search=${encodeURIComponent(playerName)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (!response.ok) {
      throw new Error(`API-Football request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.response || data.response.length === 0) {
      return Response.json({ 
        success: true, 
        suggestions: [],
        message: 'Keine Spieler gefunden'
      });
    }

    // Filter and format suggestions
    const suggestions = data.response
      .filter(item => item.player)
      .map(item => {
        const player = item.player;
        const statistics = item.statistics?.[0] || {};
        
        // Calculate match score based on available data
        let matchScore = 50; // Base score
        
        if (nationality && player.nationality?.toLowerCase().includes(nationality.toLowerCase())) {
          matchScore += 30;
        }
        
        if (dateOfBirth && player.birth?.date === dateOfBirth) {
          matchScore += 20;
        }

        return {
          api_id: player.id,
          name: player.name,
          firstname: player.firstname,
          lastname: player.lastname,
          age: player.age,
          nationality: player.nationality,
          birth_date: player.birth?.date,
          birth_place: player.birth?.place,
          birth_country: player.birth?.country,
          height: player.height,
          weight: player.weight,
          photo: player.photo,
          current_team: statistics.team?.name,
          current_league: statistics.league?.name,
          position: statistics.games?.position,
          matchScore: Math.min(matchScore, 100)
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10); // Limit to top 10 results

    return Response.json({
      success: true,
      suggestions,
      total: suggestions.length
    });

  } catch (error) {
    console.error('Error in searchPlayerApiId:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});