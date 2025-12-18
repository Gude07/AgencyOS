export default async function exportToGoogleSheets({ entityName, title, user_email }) {
  const { base44 } = await import('@base44/sdk/server');
  
  try {
    // Hole die Access Token für Google Sheets
    const { access_token } = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    
    // Hole die Daten basierend auf der Entity
    let data = [];
    let headers = [];
    
    if (entityName === 'InternalNote') {
      data = await base44.entities.InternalNote.list();
      headers = ['Titel', 'Kategorie', 'Inhalt (Text)', 'Angepinnt', 'Erstellt von', 'Erstellt am'];
      data = data.map(note => [
        note.title,
        note.category,
        note.content.replace(/<[^>]*>/g, ''), // HTML entfernen
        note.pinned ? 'Ja' : 'Nein',
        note.created_by,
        new Date(note.created_date).toLocaleDateString('de-DE')
      ]);
    } else if (entityName === 'Player') {
      data = await base44.entities.Player.list();
      headers = ['Name', 'Position', 'Alter', 'Nationalität', 'Verein', 'Marktwert', 'Vertragsende', 'Kategorie', 'Status'];
      data = data.map(player => [
        player.name,
        player.position,
        player.age || '',
        player.nationality || '',
        player.current_club || '',
        player.market_value ? `${(player.market_value / 1000000).toFixed(2)}M €` : '',
        player.contract_until || '',
        player.category || '',
        player.status || ''
      ]);
    } else if (entityName === 'ClubRequest') {
      data = await base44.entities.ClubRequest.list();
      headers = ['Verein', 'Position', 'Liga', 'Land', 'Status', 'Priorität', 'Budget Min', 'Budget Max', 'Alter Min', 'Alter Max', 'Transferperiode'];
      data = data.map(req => [
        req.club_name,
        req.position_needed,
        req.league || '',
        req.country || '',
        req.status,
        req.priority,
        req.budget_min ? `${(req.budget_min / 1000000).toFixed(2)}M €` : '',
        req.budget_max ? `${(req.budget_max / 1000000).toFixed(2)}M €` : '',
        req.age_min || '',
        req.age_max || '',
        req.transfer_period || ''
      ]);
    } else if (entityName === 'Task') {
      data = await base44.entities.Task.list();
      headers = ['Titel', 'Beschreibung', 'Status', 'Priorität', 'Kategorie', 'Deadline', 'Fortschritt', 'Zugewiesen an'];
      data = data.map(task => [
        task.title,
        task.description || '',
        task.status,
        task.priority,
        task.category || '',
        task.deadline || '',
        `${task.progress || 0}%`,
        Array.isArray(task.assigned_to) ? task.assigned_to.join(', ') : ''
      ]);
    }
    
    // Erstelle ein neues Google Sheet
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: title || `${entityName} Export - ${new Date().toLocaleDateString('de-DE')}`
        },
        sheets: [{
          properties: {
            title: 'Daten'
          }
        }]
      })
    });
    
    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;
    
    // Füge die Daten ein
    const values = [headers, ...data];
    
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daten!A1:append?valueInputOption=RAW`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values
      })
    });
    
    // Formatiere die Header-Zeile (fett)
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  bold: true
                },
                backgroundColor: {
                  red: 0.9,
                  green: 0.9,
                  blue: 0.9
                }
              }
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)'
          }
        }]
      })
    });
    
    return {
      success: true,
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      message: 'Daten erfolgreich nach Google Sheets exportiert'
    };
    
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}