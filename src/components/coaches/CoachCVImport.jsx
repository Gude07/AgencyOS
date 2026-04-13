import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, CheckCircle, FileText, Sparkles } from "lucide-react";

export default function CoachCVImport({ onExtracted }) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null); // null | 'success' | 'error'
  const [message, setMessage] = useState("");
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setStatus(null);
    setMessage("");

    try {
      // 1. Upload file
      setMessage("Datei wird hochgeladen...");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 2. Extract structured data via LLM
      setMessage("KI analysiert den Lebenslauf...");
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extrahiere alle relevanten Informationen aus diesem Trainer-Lebenslauf und gib sie strukturiert zurück. 
Extrahiere: Name, Geburtsdatum (Format: YYYY-MM-DD), Nationalität, Spezialisierung (nur einer von: Cheftrainer, Co-Trainer, Torwarttrainer, Athletiktrainer, Individualtrainer, Jugendtrainer, Technischer Direktor), 
bevorzugte Formation (z.B. 4-3-3), Trainerphilosophie, Lizenzen, Erfahrung in Jahren (nur Zahl), 
Erfolge/Titel, Sprachen (als Array), Gehaltsvorstellung (nur Zahl in Euro/Jahr), Vertrag bis (Format: YYYY-MM-DD), 
aktueller Verein, Telefonnummer, E-Mail, Notizen (weitere relevante Infos die nirgendwo anders passen).
Wenn eine Information nicht vorhanden ist, lass das Feld weg.`,
        file_urls: [file_url],
        model: "claude_sonnet_4_6",
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            date_of_birth: { type: "string" },
            nationality: { type: "string" },
            specialization: { type: "string" },
            preferred_formation: { type: "string" },
            coaching_philosophy: { type: "string" },
            licenses: { type: "string" },
            experience_years: { type: "number" },
            achievements: { type: "string" },
            languages: { type: "array", items: { type: "string" } },
            salary_expectation: { type: "number" },
            contract_until: { type: "string" },
            current_club: { type: "string" },
            contact_phone: { type: "string" },
            contact_email: { type: "string" },
            notes: { type: "string" }
          }
        }
      });

      const extracted = result.response || result;

      // Clean up empty values
      const cleaned = Object.fromEntries(
        Object.entries(extracted).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
      );

      onExtracted(cleaned);
      setStatus("success");
      setMessage(`${Object.keys(cleaned).length} Felder erfolgreich extrahiert und übertragen.`);
    } catch (err) {
      setStatus("error");
      setMessage("Fehler beim Verarbeiten des Lebenslaufs: " + err.message);
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-slate-900 dark:to-slate-900 dark:border-purple-900">
      <CardHeader className="border-b border-purple-100 dark:border-purple-900 pb-4">
        <CardTitle className="text-sm flex items-center gap-2 text-purple-900 dark:text-purple-300">
          <Sparkles className="w-4 h-4" />
          KI-Lebenslauf-Import
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Lebenslauf hochladen (PDF, Word, Bild) – die KI extrahiert alle Informationen automatisch.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={isLoading}
          className="w-full bg-purple-700 hover:bg-purple-800 text-white text-sm"
          size="sm"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{message || "Wird verarbeitet..."}</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" />Lebenslauf hochladen & analysieren</>
          )}
        </Button>

        {status === "success" && (
          <div className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <p className="text-xs text-green-700">{message} Bitte prüfen und speichern.</p>
          </div>
        )}
        {status === "error" && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}