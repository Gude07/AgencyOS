import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus, CheckCircle2 } from "lucide-react";

const TYPES = [
  { value: "verbesserung", label: "💡 Verbesserungsidee", color: "bg-blue-50 border-blue-300 text-blue-800" },
  { value: "fehler", label: "🐛 Fehler melden", color: "bg-red-50 border-red-300 text-red-800" },
  { value: "frage", label: "❓ Frage", color: "bg-yellow-50 border-yellow-300 text-yellow-800" },
  { value: "sonstiges", label: "💬 Sonstiges", color: "bg-slate-50 border-slate-300 text-slate-700" },
];

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("verbesserung");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.Feedback.create({
      type,
      message: message.trim(),
      page: window.location.pathname,
      user_email: user?.email || "",
      user_name: user?.full_name || "",
      status: "neu",
    });
    setLoading(false);
    setSent(true);
    setTimeout(() => {
      setOpen(false);
      setSent(false);
      setMessage("");
      setType("verbesserung");
    }, 2000);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title="Feedback geben"
        className="relative text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 dark:text-slate-400"
      >
        <MessageSquarePlus className="w-5 h-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-blue-600" />
              Feedback geben
            </DialogTitle>
          </DialogHeader>

          {sent ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-slate-900 dark:text-white">Vielen Dank für dein Feedback!</p>
              <p className="text-sm text-slate-500">Wir schauen uns das so schnell wie möglich an.</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm font-medium mb-2 block">Was möchtest du mitteilen?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                        type === t.value
                          ? t.color + " border-current shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">Deine Nachricht *</Label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={
                    type === "fehler"
                      ? "Was ist passiert? Was hast du erwartet? Wo genau ist der Fehler aufgetreten?"
                      : type === "verbesserung"
                      ? "Was könnte besser sein? Wie stellst du dir die Verbesserung vor?"
                      : "Deine Nachricht..."
                  }
                  className="h-32 resize-none"
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1">
                  Aktuelle Seite wird automatisch mitgesendet.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!message.trim() || loading}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  {loading ? "Wird gesendet..." : "Feedback senden"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}