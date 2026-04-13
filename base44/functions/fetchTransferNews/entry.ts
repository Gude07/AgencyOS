import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RSS_FEEDS = [
  { name: "Kicker", url: "https://www.kicker.de/news/fussball/bundesliga/transfers/rss/transfers.rss" },
  { name: "Transfermarkt", url: "https://www.transfermarkt.de/rss/news" },
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
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;

    for (const item of rawItems.slice(0, 30)) {
      const title = (/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/.exec(item) || /<title>([^<]*)<\/title>/.exec(item) || [])[1] || "";

      const linkMatch =
        /<link><!\[CDATA\[([^\]]+)\]\]><\/link>/.exec(item) ||
        /<link>(https?:\/\/[^<]+)<\/link>/.exec(item) ||
        /<guid[^>]*isPermaLink="true"[^>]*>([^<]+)<\/guid>/.exec(item) ||
        /<guid>([^<]+)<\/guid>/.exec(item);
      let link = linkMatch ? linkMatch[1].trim() : "";

      const description = (/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/.exec(item) || /<description>([^<]*)<\/description>/.exec(item) || [])[1] || "";

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
    return items;
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

    // Fetch RSS feeds from Kicker and Transfermarkt
    const feedResults = await Promise.all(RSS_FEEDS.map(fetchRSS));
    const allItems = feedResults.flat();

    const newsContext = allItems
      .map(i => `[${i.source}] ${i.title}: ${i.description} (URL: ${i.link || "n/a"})`)
      .join("\n\n");

    const today = new Date().toISOString().split('T')[0];

    const clubInstruction = clubFilter
      ? `IMPORTANT: Only extract rumors that directly involve the club "${clubFilter}" — either as the buying or selling club. Ignore all other rumors.`
      : `Extract all transfer rumors you find in the articles.`;

    const prompt = `You are a football transfer expert analyzing news from Kicker and Transfermarkt (Germany's most reliable transfer sources).
Today is ${today}.

${clubInstruction}

Analyze these recent articles and extract concrete transfer rumors:
${newsContext}

RULES:
- Only include rumors from the current transfer window (Winter 2025/26 or Sommer 2026)
- For source_url: use EXACTLY the direct article URL from (URL: ...). Never use a homepage. If no valid path URL exists, leave it empty.
- Only real, named players and real clubs. Do not invent anything.
- Use internet search to verify and supplement with the most current rumors from Kicker and Transfermarkt if the RSS data is insufficient.`;

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

    // Get existing to avoid duplicates
    const existing = await base44.asServiceRole.entities.TransferRumor.filter({ agency_id: user.agency_id });
    const existingNames = new Set(existing.map(r => r.player_name?.toLowerCase()));

    let created = 0;
    for (const rumor of rumors) {
      if (!rumor.player_name) continue;
      if (existingNames.has(rumor.player_name.toLowerCase())) continue;

      let sourceUrl = rumor.source_url || "";
      if (sourceUrl) {
        try {
          const u = new URL(sourceUrl);
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
      total_articles: allItems.length,
      rumors_found: rumors.length,
      created,
    });
  } catch (error) {
    console.error("fetchTransferNews error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});