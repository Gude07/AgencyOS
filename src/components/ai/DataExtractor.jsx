import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DataExtractor({ onDataExtracted }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExtract = async () => {
    if (!text.trim()) {
      toast.error('Bitte Text eingeben');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('extractPlayerData', { text });
      
      if (response.data.success) {
        onDataExtracted(response.data.extractedData);
        toast.success('Daten erfolgreich extrahiert!');
        setOpen(false);
        setText('');
      } else {
        toast.error('Extraktion fehlgeschlagen');
      }
    } catch (error) {
      console.error('Error extracting data:', error);
      toast.error('Fehler bei der Datenextraktion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="w-4 h-4 mr-2" />
          KI-Datenextraktion
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Spielerdaten aus Text extrahieren</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Text einfügen</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Fügen Sie hier Scouting-Berichte, Spielerbeschreibungen oder andere Texte ein..."
              className="min-h-[300px]"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <Sparkles className="w-4 h-4 inline mr-1" />
              Die KI extrahiert automatisch verfügbare Informationen wie Name, Position, Geburtsdatum, 
              Nationalität, Verein, Marktwert und weitere Details.
            </p>
          </div>

          <Button 
            onClick={handleExtract}
            disabled={loading || !text.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extrahiere Daten...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Daten extrahieren
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}