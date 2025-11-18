import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

export default function LanguagesEditor({ languages, onChange }) {
  const [newLanguage, setNewLanguage] = useState("");
  
  const currentLanguages = Array.isArray(languages) ? languages : [];

  const handleAdd = () => {
    if (!newLanguage.trim()) return;
    if (currentLanguages.includes(newLanguage.trim())) return;
    
    const updated = [...currentLanguages, newLanguage.trim()];
    onChange(updated);
    setNewLanguage("");
  };

  const handleRemove = (language) => {
    const updated = currentLanguages.filter(l => l !== language);
    onChange(updated);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm">Sprachen</Label>
      <div className="flex gap-2">
        <Input 
          value={newLanguage} 
          onChange={(e) => setNewLanguage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="z.B. Deutsch, Englisch..."
          className="flex-1"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={handleAdd}
          disabled={!newLanguage.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {currentLanguages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentLanguages.map((language) => (
            <Badge key={language} variant="secondary" className="bg-slate-100 text-slate-800 border border-slate-200">
              {language}
              <button
                type="button"
                onClick={() => handleRemove(language)}
                className="ml-2 hover:text-slate-900 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}