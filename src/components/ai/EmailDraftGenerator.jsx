import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

export default function EmailDraftGenerator({ type, entityId, defaultRecipient }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState(defaultRecipient || '');
  const [tone, setTone] = useState('professional');
  const [draft, setDraft] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateEmailDraft', {
        type,
        entityId,
        recipientName: recipient,
        tone
      });
      
      if (response.data.success) {
        setDraft(response.data.draft);
        toast.success('E-Mail-Entwurf erstellt!');
      } else {
        toast.error('Erstellung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Error generating draft:', error);
      toast.error('Fehler bei der Entwurfs-Erstellung');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (draft) {
      navigator.clipboard.writeText(draft.body_plain || draft.body_html);
      toast.success('In Zwischenablage kopiert');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="w-4 h-4 mr-2" />
          KI-E-Mail-Entwurf
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>E-Mail-Entwurf generieren</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Empfänger Name</Label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="z.B. Herr Müller"
            />
          </div>

          <div>
            <Label>Tonfall</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professionell</SelectItem>
                <SelectItem value="friendly">Freundlich</SelectItem>
                <SelectItem value="formal">Förmlich</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!draft ? (
            <Button 
              onClick={handleGenerate}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generiere E-Mail...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  E-Mail-Entwurf erstellen
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Betreff</Label>
                <Input value={draft.subject} readOnly />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>E-Mail-Text</Label>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-1" />
                    Kopieren
                  </Button>
                </div>
                <div 
                  className="p-4 border rounded-lg bg-slate-50 max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: draft.body_html }}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setDraft(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Neu generieren
                </Button>
                <Button 
                  onClick={handleCopy}
                  className="flex-1"
                >
                  Text kopieren
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}