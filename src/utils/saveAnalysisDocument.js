import { base44 } from "@/api/base44Client";

/**
 * Generates a clean HTML document from analysis data and saves it
 * to the entity's dropbox_documents field.
 *
 * @param {Object} options
 * @param {string} options.title - Document title (e.g. "KI-Analyse Max Mustermann")
 * @param {string} options.analysisType - Label shown in header badge
 * @param {string} options.entityType - e.g. "Player" | "ClubProfile"
 * @param {string} options.entityId - ID of the entity
 * @param {string} options.htmlBody - Pre-rendered HTML body content
 * @returns {Promise<boolean>} true on success
 */
export async function saveAnalysisDocument({ title, analysisType, entityType, entityId, htmlBody }) {
  const date = new Date().toLocaleDateString("de-DE", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const fullHtml = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 960px; margin: 0 auto; padding: 40px 20px; background: #f8fafc; }
  .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
  .header h1 { margin: 0 0 8px 0; font-size: 26px; }
  .header p { margin: 0; opacity: 0.85; font-size: 13px; }
  .badge { display: inline-block; padding: 3px 10px; background: rgba(255,255,255,0.2); border-radius: 20px; font-size: 12px; margin-top: 8px; }
  .section { background: white; padding: 24px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 16px; }
  .section h2 { color: #1e3a8a; font-size: 16px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  .section h3 { color: #334155; font-size: 14px; margin: 16px 0 6px 0; }
  .section p, .section li { font-size: 14px; color: #475569; margin: 4px 0; }
  .score { display: inline-block; font-size: 28px; font-weight: 700; color: #1e3a8a; }
  .tag { display: inline-block; padding: 3px 10px; background: #e0e7ff; color: #3730a3; border-radius: 6px; font-size: 12px; margin: 2px; }
  .tag.green { background: #dcfce7; color: #166534; }
  .tag.orange { background: #ffedd5; color: #9a3412; }
  .tag.red { background: #fee2e2; color: #991b1b; }
  .pro { color: #16a34a; }
  .con { color: #dc2626; }
  .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td, th { padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; }
  th { background: #f1f5f9; font-weight: 600; }
</style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p>Erstellt am ${date} Uhr</p>
    <span class="badge">${analysisType}</span>
  </div>
  ${htmlBody}
  <div class="footer">Generiert von STS Sports Management Platform</div>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: "text/html" });
  const file = new File([blob], `${title.replace(/[^a-zA-Z0-9äöüÄÖÜß\s_-]/g, "")}.html`, { type: "text/html" });

  // Upload file
  const { file_url } = await base44.integrations.Core.UploadFile({ file });

  // Get current entity and append document
  const entityList = await base44.entities[entityType].list();
  const entity = entityList.find(e => e.id === entityId);
  if (!entity) return false;

  const newDoc = {
    id: `doc_${Date.now()}`,
    name: `${title}.html`,
    url: file_url,
    size: blob.size,
    uploaded_date: new Date().toISOString(),
    type: "analysis"
  };

  await base44.entities[entityType].update(entityId, {
    dropbox_documents: [...(entity.dropbox_documents || []), newDoc]
  });

  return true;
}

/** Build HTML from player AI analysis JSON */
export function buildPlayerAnalysisHtml(analysis, playerName) {
  const safe = (v) => (v || "").toString().replace(/</g, "&lt;");
  const list = (arr) => (arr || []).map(i => `<li>${safe(i)}</li>`).join("");
  const tags = (arr, cls = "") => (arr || []).map(t => `<span class="tag ${cls}">${safe(t)}</span>`).join(" ");

  return `
    <div class="section">
      <h2>Gesamtbewertung</h2>
      <span class="score">${safe(analysis.overall_rating)}/10</span>
      <p>${safe(analysis.summary)}</p>
    </div>
    <div class="section">
      <h2>Stärken &amp; Entwicklungsbereiche</h2>
      <h3>✓ Stärken</h3><ul>${list(analysis.strengths)}</ul>
      <h3>! Entwicklungsbereiche</h3><ul>${list(analysis.weaknesses)}</ul>
    </div>
    <div class="section">
      <h2>Spielstil &amp; Taktik</h2>
      <p>${safe(analysis.playing_style)}</p>
      ${analysis.tactical_fit?.length ? `<h3>Passende Systeme</h3><p>${tags(analysis.tactical_fit)}</p>` : ""}
    </div>
    ${analysis.market_value_assessment ? `
    <div class="section">
      <h2>Marktwert</h2>
      <table><tr><th>Geschätzter Wert</th><th>Trend</th><th>Fair?</th></tr>
      <tr><td>${safe(analysis.market_value_assessment.estimated_value)}</td>
          <td>${safe(analysis.market_value_assessment.trend)}</td>
          <td>${analysis.market_value_assessment.current_value_fair ? "✓ Ja" : "✗ Nein"}</td></tr></table>
      ${analysis.market_value_assessment.reasoning ? `<p style="margin-top:8px">${safe(analysis.market_value_assessment.reasoning)}</p>` : ""}
    </div>` : ""}
    <div class="section">
      <h2>Risiken &amp; Chancen</h2>
      <h3 class="con">Risiken</h3><ul>${list(analysis.risks)}</ul>
      <h3 class="pro">Chancen</h3><ul>${list(analysis.opportunities)}</ul>
    </div>
    ${analysis.next_steps?.length ? `
    <div class="section">
      <h2>Handlungsempfehlungen</h2>
      <ol>${list(analysis.next_steps)}</ol>
    </div>` : ""}`;
}

/** Build HTML from club-fit analysis results */
export function buildClubFitHtml(idealProfile, clubFitResults, playerName) {
  const safe = (v) => (v || "").toString().replace(/</g, "&lt;");
  const tags = (arr, cls = "") => (arr || []).map(t => `<span class="tag ${cls}">${safe(t)}</span>`).join(" ");

  const profileHtml = idealProfile ? `
    <div class="section">
      <h2>Ideales Club-Profil für ${safe(playerName)}</h2>
      ${idealProfile.player_summary ? `<p><em>${safe(idealProfile.player_summary)}</em></p>` : ""}
      ${idealProfile.tactical_role ? `<h3>Taktische Rolle</h3><p>${safe(idealProfile.tactical_role)}</p>` : ""}
      ${idealProfile.ideal_playing_style ? `<h3>Idealer Spielstil</h3><p>${safe(idealProfile.ideal_playing_style)}</p>` : ""}
      ${idealProfile.ideal_league_level ? `<h3>Liganiveau</h3><p>${safe(idealProfile.ideal_league_level)}</p>` : ""}
      ${idealProfile.ideal_formations?.length ? `<h3>Ideale Formationen</h3><p>${tags(idealProfile.ideal_formations)}</p>` : ""}
      ${idealProfile.ideal_club_attributes?.length ? `<h3>Vereinsattribute</h3><p>${tags(idealProfile.ideal_club_attributes)}</p>` : ""}
      ${idealProfile.key_requirements?.length ? `<h3>Schlüsselanforderungen</h3><p>${tags(idealProfile.key_requirements)}</p>` : ""}
    </div>` : "";

  const resultsHtml = clubFitResults.map((r, i) => {
    const scoreClass = r.fit_score >= 80 ? "green" : r.fit_score >= 60 ? "" : r.fit_score >= 40 ? "orange" : "red";
    return `
    <div class="section">
      <h2>#${i + 1} ${safe(r.club_name)} — <span class="tag ${scoreClass}">${r.fit_score}% ${safe(r.match_level)}</span></h2>
      ${r.summary ? `<p>${safe(r.summary)}</p>` : ""}
      <table>
        <tr><th class="pro">+ Spricht dafür</th><th class="con">− Spricht dagegen</th></tr>
        <tr>
          <td><ul>${(r.reasons_for || []).map(x => `<li class="pro">${safe(x)}</li>`).join("")}</ul></td>
          <td><ul>${(r.reasons_against || []).map(x => `<li class="con">${safe(x)}</li>`).join("")}</ul></td>
        </tr>
      </table>
    </div>`;
  }).join("");

  return profileHtml + resultsHtml;
}

/** Build HTML from club matching recommendations */
export function buildClubMatchingHtml(clubName, clubProfile, recommendations, summary) {
  const safe = (v) => (v || "").toString().replace(/</g, "&lt;");
  const tags = (arr, cls = "") => (arr || []).map(t => `<span class="tag ${cls}">${safe(t)}</span>`).join(" ");

  return `
    <div class="section">
      <h2>Vereinsprofil: ${safe(clubName)}</h2>
      ${clubProfile?.playing_style ? `<h3>Spielstil</h3><p>${safe(clubProfile.playing_style)}</p>` : ""}
      ${clubProfile?.formations?.length ? `<h3>Formationen</h3><p>${tags(clubProfile.formations)}</p>` : ""}
      ${clubProfile?.key_attributes?.length ? `<h3>Gesuchte Attribute</h3><p>${tags(clubProfile.key_attributes)}</p>` : ""}
      ${clubProfile?.target_positions?.length ? `<h3>Gesuchte Positionen</h3><p>${tags(clubProfile.target_positions, "orange")}</p>` : ""}
      ${clubProfile?.club_culture ? `<h3>Vereinskultur</h3><p>${safe(clubProfile.club_culture)}</p>` : ""}
    </div>
    <div class="section">
      <h2>Analyse-Zusammenfassung</h2>
      <p>${safe(summary)}</p>
    </div>
    ${recommendations.map((rec, i) => `
    <div class="section">
      <h2>#${i + 1} ${safe(rec.player_name)} — <span class="tag green">${rec.match_score}% Match</span></h2>
      <p>${safe(rec.reasoning)}</p>
      ${rec.key_strengths?.length ? `<p>${tags(rec.key_strengths, "green")}</p>` : ""}
      ${rec.risk_factors?.length ? `<p>${tags(rec.risk_factors, "orange")}</p>` : ""}
      ${rec.culture_fit ? `<p><em>🏛️ ${safe(rec.culture_fit)}</em></p>` : ""}
    </div>`).join("")}`;
}