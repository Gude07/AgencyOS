import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MessageCircle, Loader2, Copy, Sparkles, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

export default function EmailDraftGenerator({ type, entityId, defaultRecipient }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refineLoading, setRefineLoading] = useState(false);
  const [mode, setMode] = useState('email'); // 'email' | 'whatsapp'
  const [recipient, setRecipient] = useState(defaultRecipient || '');
  const [tone, setTone] = useState('professional');
  const [draft, setDraft] = useState(null);
  const [editedBody, setEditedBody] = useState('');
  const [refineInstruction, setRefineInstruction] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateEmailDraft', {
        type,
        entityId,
        recipientName: recipient,
        tone,
        channel: mode
      });
      if (response.data.success) {
        setDraft(response.data.draft);
        setEditedBody(response.data.draft.body_plain || response.data.draft.body_html?.replace(/<[^>]+>/g, '') || '');
        toast.success('Entwurf erstellt!');
      } else {
        toast.error('Erstellung fehlgeschlagen');
      }
    } catch (error) {
      toast.error('Fehler bei der Entwurfs-Erstellung');
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refineInstruction.trim()) return;
    setRefineLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein professioneller Texter für eine Spieleragentur.

Aktueller Text:
${editedBody}

Anweisung des Nutzers: ${refineInstruction}

Bitte überarbeite den Text entsprechend. Gib NUR den überarbeiteten Text zurück, ohne Erklärungen.`,
      });
      setEditedBody(result);
      setRefineInstruction('');
      toast.success('Text überarbeitet!');
    } catch (error) {
      toast.error('Fehler bei der Überarbeitung');
    } finally {
      setRefineLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedBody || draft?.body_plain || '');
    toast.success('In Zwischenablage kopiert');
  };

  const handleReset = () => {
    setDraft(null);
    setEditedBody('');
    setRefineInstruction('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="w-4 h-4 mr-2" />
          KI-Nachricht
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>KI-Nachricht verfassen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Kanal-Auswahl */}
          <div>
            <Label className="mb-2 block">Kanal</Label>
            <div className="flex gap-2">
              <Button
                variant={mode === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('email')}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                E-Mail
              </Button>
              <Button
                variant={mode === 'whatsapp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('whatsapp')}
                className={`flex-1 ${mode === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </div>

          <div>
            <Label>Empfänger Name</Label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="z.B. Herr Müller"
            />
          </div>

          <div>
            <Label>Ton</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professionell</SelectItem>
                <SelectItem value="friendly">Freundlich & locker</SelectItem>
                <SelectItem value="formal">Förmlich</SelectItem>
                <SelectItem value="direct">Direkt & knapp</SelectItem>
                <SelectItem value="enthusiastic">Enthusiastisch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!draft ? (
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generiere...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />{mode === 'whatsapp' ? 'WhatsApp-Nachricht' : 'E-Mail'} erstellen</>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              {draft.subject && mode === 'email' && (
                <div>
                  <Label>Betreff</Label>
                  <Input value={draft.subject} readOnly />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Text (bearbeitbar)</Label>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-1" />
                    Kopieren
                  </Button>
                </div>
                <Textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              {/* KI-Überarbeitung */}
              <div className="border rounded-lg p-4 bg-purple-50 border-purple-200 space-y-3">
                <p className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Mit KI überarbeiten
                </p>
                <div className="flex gap-2">
                  <Input
                    value={refineInstruction}
                    onChange={(e) => setRefineInstruction(e.target.value)}
                    placeholder="z.B. Kürzer formulieren, formeller gestalten, Absatz 2 überzeugender..."
                    onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleRefine}
                    disabled={refineLoading || !refineInstruction.trim()}
                    size="sm"
                  >
                    {refineLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Neu generieren
                </Button>
                <Button onClick={handleCopy} className="flex-1">
                  <Copy className="w-4 h-4 mr-2" />
                  Kopieren
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}) {
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