import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { leagueName } = await req.json();
  if (!leagueName) return Response.json({ error: 'leagueName fehlt' }, { status: 400 });

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Liste alle aktuellen Vereine (Saison 2025/26) in der folgenden Liga auf: "${leagueName}".
Antworte NUR mit einem JSON-Objekt ohne Markdown:
{
  "league_name": "Offizieller Liganame",
  "country": "Land",
  "clubs": ["Vereinsname1", "Vereinsname2", ...]
}
Gib alle Erstligisten an, typischerweise 16-20 Vereine.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        league_name: { type: "string" },
        country: { type: "string" },
        clubs: { type: "array", items: { type: "string" } }
      }
    }
  });

  const data = typeof result === 'string' ? JSON.parse(result) : result;
  return Response.json({ success: true, ...data });
});