import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Check, X, Loader2, AlertCircle } from "lucide-react";

export default function PlayerApiIdSuggestions({ player, onApiIdSelected }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setSearched(true);

    try {
      const response = await base44.functions.invoke('searchPlayerApiId', {
        playerName: player.name,
        nationality: player.nationality,
        dateOfBirth: player.date_of_birth
      });

      if (response.data.success) {
        setSuggestions(response.data.suggestions || []);
        if (response.data.suggestions.length === 0) {
          setError('Keine passenden Spieler in der API-Football Datenbank gefunden');
        }
      } else {
        setError(response.data.error || 'Fehler bei der Suche');
      }
    } catch (err) {
      setError('Fehler bei der Suche: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectApiId = async (apiId) => {
    await onApiIdSelected(apiId);
    setSuggestions([]);
    setSearched(false);
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-blue-900">API-Football ID finden</CardTitle>
            <p className="text-sm text-blue-700 mt-1">
              Suchen Sie automatisch nach dem Spieler in der API-Football Datenbank
            </p>
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-900 hover:bg-blue-800"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Suche läuft...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Jetzt suchen
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-900 font-medium">Hinweis</p>
              <p className="text-sm text-amber-800 mt-1">{error}</p>
            </div>
          </div>
        )}

        {searched && !loading && suggestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-blue-800 font-medium mb-3">
              {suggestions.length} Vorschlag{suggestions.length !== 1 ? 'e' : ''} gefunden - Bitte wählen Sie den richtigen Spieler aus:
            </p>
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.api_id}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {suggestion.photo && (
                    <img
                      src={suggestion.photo}
                      alt={suggestion.name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-bold text-slate-900">{suggestion.name}</h4>
                        <p className="text-sm text-slate-600">
                          {suggestion.firstname} {suggestion.lastname}
                        </p>
                      </div>
                      <Badge className="bg-blue-900 text-white">
                        Match: {suggestion.matchScore}%
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      {suggestion.age && (
                        <div>
                          <span className="text-slate-600">Alter: </span>
                          <span className="font-medium text-slate-900">{suggestion.age}</span>
                        </div>
                      )}
                      {suggestion.nationality && (
                        <div>
                          <span className="text-slate-600">Nationalität: </span>
                          <span className="font-medium text-slate-900">{suggestion.nationality}</span>
                        </div>
                      )}
                      {suggestion.birth_date && (
                        <div>
                          <span className="text-slate-600">Geburtsdatum: </span>
                          <span className="font-medium text-slate-900">{suggestion.birth_date}</span>
                        </div>
                      )}
                      {suggestion.height && (
                        <div>
                          <span className="text-slate-600">Größe: </span>
                          <span className="font-medium text-slate-900">{suggestion.height}</span>
                        </div>
                      )}
                      {suggestion.current_team && (
                        <div className="col-span-2">
                          <span className="text-slate-600">Verein: </span>
                          <span className="font-medium text-slate-900">{suggestion.current_team}</span>
                          {suggestion.current_league && (
                            <span className="text-slate-600"> • {suggestion.current_league}</span>
                          )}
                        </div>
                      )}
                      {suggestion.position && (
                        <div>
                          <span className="text-slate-600">Position: </span>
                          <span className="font-medium text-slate-900">{suggestion.position}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSelectApiId(suggestion.api_id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Auswählen (ID: {suggestion.api_id})
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-6">
            <Search className="w-12 h-12 text-blue-300 mx-auto mb-3" />
            <p className="text-sm text-blue-700">
              Klicken Sie auf "Jetzt suchen", um passende Spieler zu finden
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}