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
    const items = [];
    const rawItems = text.split('<item>').slice(1);
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000; // 14 days ago

    for (const item of rawItems.slice(0, 20)) {
      const title = (/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/.exec(item) || /<title>([^<]*)<\/title>/.exec(item) || [])[1] || "";

      // Try to get direct article link (not homepage)
      // Priority: <link> CDATA, plain <link>, guid isPermaLink, guid plain
      const linkMatch =
        /<link><!\[CDATA\[([^\]]+)\]\]><\/link>/.exec(item) ||
        /<link>https?:\/\/[^<]+<\/link>/.exec(item) ||
        /<guid\s[^>]*isPermaLink="true"[^>]*>([^<]+)<\/guid>/.exec(item) ||
        /<guid>([^<]+)<\/guid>/.exec(item);
      let link = "";
      if (linkMatch) {
        // Extract URL from match
        const raw = linkMatch[0];
        const urlMatch = /https?:\/\/[^\s<\]]+/.exec(raw);
        link = urlMatch ? urlMatch[0].trim() : "";
      }

      const description = (/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/.exec(item) || /<description>([^<]*)<\/description>/.exec(item) || [])[1] || "";

      // Date filtering — skip articles older than 14 days
      const pubDateStr = (/<pubDate>([^<]+)<\/pubDate>/.exec(item) || [])[1] || "";
      if (pubDateStr) {
        const pubDate = new Date(pubDateStr).getTime();
        if (!isNaN(pubDate) && pubDate < cutoff) continue;
      }

      if (title.trim()) {
        items.push({
          title: title.trim(),
          link,
          description: description.replace(/<[^>]+>/g, "").trim().slice(0, 500),
          source: feed.name,
          pubDate: pubDateStr,
        });
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

    const transferKeywords = ["transfer", "wechsel", "ablöse", "leihe", "verpflichtung", "verhandlung", "interesse", "angebot", "signing", "move", "deal", "loan", "bid", "rumour", "rumor", "fee"];
    const relevantItems = allItems.filter(item => {
      const text = (item.title + " " + item.description).toLowerCase();
      return transferKeywords.some(kw => text.includes(kw));
    });

    const contextItems = relevantItems.slice(0, 30);

    let focusInstruction = "";
    if (clubFilter && leagueFilter) {
      focusInstruction = `Focus specifically on transfers involving the club "${clubFilter}" or from the league "${leagueFilter}".`;
    } else if (clubFilter) {
      focusInstruction = `Focus specifically on transfers involving the club "${clubFilter}".`;
    } else if (leagueFilter) {
      focusInstruction = `Focus specifically on transfers in the "${leagueFilter}" league.`;
    }

    const newsContext = contextItems.length > 0
      ? contextItems.map(i => `[${i.source}] ${i.title}: ${i.description} (URL: ${i.link || "n/a"})`).join("\n\n")
      : "No RSS data available.";

    const today = new Date().toISOString().split('T')[0];
    const prompt = `You are a football transfer intelligence analyst. Today's date is ${today}. ${focusInstruction}

Analyze the following recent news articles (from the last 14 days) and extract structured transfer rumors.
CRITICAL RULES:
- Only include rumors that are CURRENT as of ${today} (2025/2026 season, Winter 2025/26 or Sommer 2026 window)
- For "source_url": use EXACTLY the direct article URL provided in (URL: ...) field. Do NOT use a homepage like kicker.de or skysports.com. If the URL starts with "http" and contains a path (e.g. /news/...), it is valid. If no valid direct URL exists, leave source_url empty.
- Only include REAL, named players with REAL club names — do not invent anything
- Supplement with current rumors from your knowledge if the RSS articles are insufficient, but only include rumors from the last 3 months

NEWS ARTICLES:
${newsContext}

Extract up to 10 concrete, current transfer rumors.`;

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

      // Validate source_url: must be a full URL with a path (not just a homepage)
      let sourceUrl = rumor.source_url || "";
      if (sourceUrl) {
        try {
          const u = new URL(sourceUrl);
          // Reject if path is "/" or empty (just a homepage)
          if (u.pathname === "/" || u.pathname === "") sourceUrl = "";
        } catch {
          sourceUrl = "";
        }
      }

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
        source_url: sourceUrl,
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