import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Mail, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export default function SendEmailDialog({ 
  open, 
  onOpenChange, 
  defaultTo = "",
  defaultSubject = "",
  clubRequestId,
  dealId,
  playerId 
}) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error('Bitte füllen Sie alle Felder aus');
      return;
    }

    setSending(true);
    try {
      const result = await base44.functions.invoke('sendEmailViaOutlook', {
        to,
        subject,
        body,
        club_request_id: clubRequestId,
        deal_id: dealId,
        player_id: playerId
      });

      if (result.data.success) {
        setSent(true);
        toast.success('E-Mail erfolgreich gesendet');
        setTimeout(() => {
          onOpenChange(false);
          // Reset state
          setTo(defaultTo);
          setSubject(defaultSubject);
          setBody("");
          setSent(false);
        }, 1500);
      } else {
        toast.error('Fehler beim Senden: ' + result.data.error);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Fehler beim Senden der E-Mail');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            E-Mail senden via Outlook
          </DialogTitle>
          <DialogDescription>
            Die E-Mail wird über Ihr verbundenes Outlook-Konto gesendet und automatisch in der App gespeichert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="email-to">An *</Label>
            <Input
              id="email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="empfaenger@beispiel.de"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="email-subject">Betreff *</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Betreff der E-Mail"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="email-body">Nachricht *</Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ihre Nachricht..."
              className="mt-1.5 h-48"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSend}
            disabled={sending || sent || !to || !subject || !body}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird gesendet...
              </>
            ) : sent ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Gesendet
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Senden
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}