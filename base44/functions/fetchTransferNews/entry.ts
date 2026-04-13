import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RSS_FEEDS = [
  { name: "Kicker", url: "https://www.kicker.de/news/fussball/bundesliga/transfers/rss/transfers.rss" },
  { name: "Transfermarkt", url: "https://www.transfermarkt.de/rss/news" },
  { name: "Sky Sports", url: "https://www.skysports.com/rss/12040" },
  { name: "Goal.com", url: "https://www.goal.com/feeds/en/news" },
  { name: "Sport1", url: "https://www.sport1.de/news/fussball.rss" },
];

async function fetchRSS(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TransferBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    // Parse items from RSS
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const item = match[1];
      const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(item) || /<title>(.*?)<\/title>/.exec(item) || [])[1] || "";
      const link = (/<link>(.*?)<\/link>/.exec(item) || [])[1] || "";
      const description = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(item) || /<description>(.*?)<\/description>/.exec(item) || [])[1] || "";
      if (title) {
        items.push({ title: title.trim(), link: link.trim(), description: description.replace(/<[^>]+>/g, "").trim().slice(0, 500), source: feed.name });
      }
    }
    return items.slice(0, 15);
  } catch (e) {
    console.log(`RSS fetch failed for ${feed.name}: ${e.message}`);
    return [];
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const clubFilter = body.club || null;
    const leagueFilter = body.league || null;

    // Fetch all RSS feeds in parallel
    const feedResults = await Promise.all(RSS_FEEDS.map(fetchRSS));
    const allItems = feedResults.flat();

    if (allItems.length === 0) {
      // Fallback: use LLM directly without RSS
      console.log("RSS feeds returned no items, using LLM direct search");
    }

    // Build prompt for LLM to extract transfer rumors
    const transferKeywords = ["transfer", "wechsel", "ablöse", "leihe", "verpflichtung", "verhandlung", "interesse", "angebot", "signing", "move", "deal", "loan", "bid", "rumour", "rumor", "fee"];

    // Filter items that are likely transfer related
    const relevantItems = allItems.filter(item => {
      const text = (item.title + " " + item.description).toLowerCase();
      return transferKeywords.some(kw => text.includes(kw));
    });

    const contextItems = relevantItems.slice(0, 30);

    let focusInstruction = "";
    if (clubFilter && leagueFilter) {
      focusInstruction = `Focus specifically on transfers involving the club "${clubFilter}" or from the league "${leagueFilter}". Only include rumors directly related to these.`;
    } else if (clubFilter) {
      focusInstruction = `Focus specifically on transfers involving the club "${clubFilter}". Only include rumors directly related to this club.`;
    } else if (leagueFilter) {
      focusInstruction = `Focus specifically on transfers in the "${leagueFilter}" league. Only include rumors from players or clubs in this league.`;
    }

    const newsContext = contextItems.length > 0
      ? contextItems.map(i => `[${i.source}] ${i.title}: ${i.description} (URL: ${i.link})`).join("\n\n")
      : "No RSS data available - use your knowledge of current transfer market.";

    const prompt = `You are a football transfer intelligence analyst. ${focusInstruction}

Analyze the following recent news articles and extract structured transfer rumors. If RSS data is sparse, supplement with your knowledge of current (2025/2026 season) transfer rumors and market activity.

NEWS ARTICLES:
${newsContext}

Extract up to 10 concrete transfer rumors. For each rumor, identify:
- The player involved
- Their current club (from_club)  
- The interested/target club (to_club)
- Player position
- League of the target club
- A brief summary (2-3 sentences in German)
- Estimated transfer fee in millions of euros (if mentioned)
- Confidence score (0-100) based on how concrete the rumor is
- Transfer period (Winter 2025/26, Sommer 2026, or Winter 2026/27)
- Source URL
- Source name

Only include REAL, specific players with REAL club names. Do not invent players. If you cannot find enough from the RSS, use well-known current transfer rumors from your training data for this transfer window.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          rumors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                player_name: { type: "string" },
                from_club: { type: "string" },
                to_club: { type: "string" },
                position: { type: "string" },
                league: { type: "string" },
                summary: { type: "string" },
                fee_estimate: { type: "number" },
                confidence_score: { type: "number" },
                transfer_period: { type: "string", enum: ["Winter 2025/26", "Sommer 2026", "Winter 2026/27"] },
                source_url: { type: "string" },
                source_name: { type: "string" },
              },
              required: ["player_name"]
            }
          }
        },
        required: ["rumors"]
      }
    });

    const rumors = result.rumors || [];

    // Get existing rumors to avoid duplicates
    const existing = await base44.asServiceRole.entities.TransferRumor.filter({ agency_id: user.agency_id });
    const existingNames = new Set(existing.map(r => r.player_name?.toLowerCase()));

    let created = 0;
    for (const rumor of rumors) {
      if (!rumor.player_name) continue;
      if (existingNames.has(rumor.player_name.toLowerCase())) continue;

      await base44.asServiceRole.entities.TransferRumor.create({
        agency_id: user.agency_id,
        player_name: rumor.player_name,
        from_club: rumor.from_club || "",
        to_club: rumor.to_club || "",
        position: rumor.position || "",
        league: rumor.league || "",
        summary: rumor.summary || "",
        fee_estimate: rumor.fee_estimate || null,
        confidence_score: rumor.confidence_score || 50,
        transfer_period: rumor.transfer_period || "Sommer 2026",
        source_url: rumor.source_url || "",
        source_name: rumor.source_name || "",
        status: "neu",
      });
      created++;
    }

    return Response.json({
      success: true,
      total_analyzed: allItems.length,
      relevant_articles: contextItems.length,
      rumors_found: rumors.length,
      created,
    });
  } catch (error) {
    console.error("fetchTransferNews error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});