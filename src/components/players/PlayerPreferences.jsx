import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, X } from "lucide-react";

export default function PlayerPreferences({ preferences = {}, onSave }) {
  const [editedPreferences, setEditedPreferences] = useState({
    preferred_leagues: Array.isArray(preferences.preferred_leagues) ? preferences.preferred_leagues : [],
    preferred_countries: Array.isArray(preferences.preferred_countries) ? preferences.preferred_countries : [],
    min_salary: preferences.min_salary || "",
    max_salary: preferences.max_salary || "",
    excluded_clubs: Array.isArray(preferences.excluded_clubs) ? preferences.excluded_clubs : [],
    career_goals: preferences.career_goals || "",
  });

  React.useEffect(() => {
    setEditedPreferences({
      preferred_leagues: Array.isArray(preferences.preferred_leagues) ? preferences.preferred_leagues : [],
      preferred_countries: Array.isArray(preferences.preferred_countries) ? preferences.preferred_countries : [],
      min_salary: preferences.min_salary || "",
      max_salary: preferences.max_salary || "",
      excluded_clubs: Array.isArray(preferences.excluded_clubs) ? preferences.excluded_clubs : [],
      career_goals: preferences.career_goals || "",
    });
  }, [preferences]);

  const [newLeague, setNewLeague] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newExcludedClub, setNewExcludedClub] = useState("");

  const addItem = (field, value, setter) => {
    if (value.trim()) {
      setEditedPreferences({
        ...editedPreferences,
        [field]: [...editedPreferences[field], value.trim()]
      });
      setter("");
    }
  };

  const removeItem = (field, index) => {
    setEditedPreferences({
      ...editedPreferences,
      [field]: editedPreferences[field].filter((_, i) => i !== index)
    });
  };

  const handleSave = () => {
    const prefsToSave = {
      ...editedPreferences,
      min_salary: editedPreferences.min_salary ? parseFloat(editedPreferences.min_salary) : undefined,
      max_salary: editedPreferences.max_salary ? parseFloat(editedPreferences.max_salary) : undefined,
    };
    onSave(prefsToSave);
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Spielerpräferenzen</CardTitle>
          <Button onClick={handleSave} size="sm" className="bg-blue-900 hover:bg-blue-800">
            <Save className="w-4 h-4 mr-2" />
            Speichern
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <p className="text-sm text-slate-600">
          Definieren Sie die Präferenzen des Spielers für ein optimales Matching mit Vereinsanfragen.
        </p>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Bevorzugte Ligen</Label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="z.B. Bundesliga"
              value={newLeague}
              onChange={(e) => setNewLeague(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem('preferred_leagues', newLeague, setNewLeague)}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => addItem('preferred_leagues', newLeague, setNewLeague)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {editedPreferences.preferred_leagues.map((league, index) => (
              <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                {league}
                <button
                  onClick={() => removeItem('preferred_leagues', index)}
                  className="ml-2 hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Bevorzugte Länder</Label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="z.B. Deutschland"
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem('preferred_countries', newCountry, setNewCountry)}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => addItem('preferred_countries', newCountry, setNewCountry)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {editedPreferences.preferred_countries.map((country, index) => (
              <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                {country}
                <button
                  onClick={() => removeItem('preferred_countries', index)}
                  className="ml-2 hover:text-green-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="min_salary" className="text-sm mb-1.5 block">Min. Gehalt/Budget (€)</Label>
            <Input
              id="min_salary"
              type="number"
              placeholder="500000"
              value={editedPreferences.min_salary}
              onChange={(e) => setEditedPreferences({...editedPreferences, min_salary: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="max_salary" className="text-sm mb-1.5 block">Max. Gehalt/Budget (€)</Label>
            <Input
              id="max_salary"
              type="number"
              placeholder="2000000"
              value={editedPreferences.max_salary}
              onChange={(e) => setEditedPreferences({...editedPreferences, max_salary: e.target.value})}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Ausgeschlossene Vereine</Label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="z.B. Club XY"
              value={newExcludedClub}
              onChange={(e) => setNewExcludedClub(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem('excluded_clubs', newExcludedClub, setNewExcludedClub)}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => addItem('excluded_clubs', newExcludedClub, setNewExcludedClub)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {editedPreferences.excluded_clubs.map((club, index) => (
              <Badge key={index} variant="secondary" className="bg-red-100 text-red-800">
                {club}
                <button
                  onClick={() => removeItem('excluded_clubs', index)}
                  className="ml-2 hover:text-red-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="career_goals" className="text-sm font-semibold mb-2 block">Karriereziele</Label>
          <Textarea
            id="career_goals"
            placeholder="z.B. Champions League spielen, in Top 5 Liga etablieren..."
            value={editedPreferences.career_goals}
            onChange={(e) => setEditedPreferences({...editedPreferences, career_goals: e.target.value})}
            className="h-24"
          />
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 text-sm mb-2">Wie funktioniert das bidirektionale Matching?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Präferenzen werden mit Vereinsanfragen abgeglichen</li>
            <li>• Höherer Match-Score = bessere Passung für beide Seiten</li>
            <li>• Ausgeschlossene Clubs werden automatisch herausgefiltert</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}