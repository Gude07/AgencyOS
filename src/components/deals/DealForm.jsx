import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, 
  FileText, 
  Trash2, 
  ExternalLink,
  User,
  Building2,
  DollarSign,
  FileCheck,
  Calendar
} from "lucide-react";
import MultiUserSelect from "@/components/tasks/MultiUserSelect";

export default function DealForm({ deal, onSave, onCancel, users = [], players = [] }) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState(deal || {
    title: "",
    player_name: "",
    player_id: "",
    receiving_club: "",
    releasing_club: "",
    status: "interesse",
    transfer_type: "transfer",
    priority: "mittel",
    transfer_fee: null,
    loan_fee: null,
    contract_length: null,
    contract_start_date: "",
    contract_end_date: "",
    annual_salary: null,
    monthly_salary: null,
    signing_bonus: null,
    performance_bonuses: "",
    release_clause: null,
    agency_commission: null,
    agency_commission_type: "einmalig",
    agency_commission_percent: null,
    agency_payment_schedule: "",
    agency_payment_received: false,
    agency_payment_date: "",
    player_image_rights: "",
    other_benefits: "",
    payment_schedule: "",
    transfer_window: "",
    expected_completion_date: "",
    medical_check_date: "",
    contract_signing_date: "",
    notes: "",
    documents: [],
    assigned_to: [],
    probability: null,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newDocuments = [...(formData.documents || [])];

    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newDocuments.push({
          name: file.name,
          url: file_url,
          type: file.type
        });
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    setFormData(prev => ({ ...prev, documents: newDocuments }));
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDocument = (index) => {
    const newDocuments = formData.documents.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, documents: newDocuments }));
  };

  const handleSubmit = () => {
    // Berechne Monatsgehalt aus Jahresgehalt wenn nicht gesetzt
    let dataToSave = { ...formData };
    if (dataToSave.annual_salary && !dataToSave.monthly_salary) {
      dataToSave.monthly_salary = Math.round(dataToSave.annual_salary / 12);
    }
    if (dataToSave.monthly_salary && !dataToSave.annual_salary) {
      dataToSave.annual_salary = dataToSave.monthly_salary * 12;
    }
    onSave(dataToSave);
  };

  const getFileIcon = (type) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('image')) return '🖼️';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    if (type?.includes('excel') || type?.includes('spreadsheet')) return '📊';
    return '📎';
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="basic" className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Grunddaten</span>
          </TabsTrigger>
          <TabsTrigger value="transfer" className="flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Transfer</span>
          </TabsTrigger>
          <TabsTrigger value="contract" className="flex items-center gap-1">
            <FileCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Vertrag</span>
          </TabsTrigger>
          <TabsTrigger value="commission" className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Provision</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Dokumente</span>
          </TabsTrigger>
        </TabsList>

        {/* Grunddaten */}
        <TabsContent value="basic" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Spieler & Vereine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Deal-Titel *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="z.B. Max Mustermann zu Bayern München"
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Spielername *</Label>
                  <Input
                    value={formData.player_name}
                    onChange={(e) => handleChange('player_name', e.target.value)}
                    placeholder="Name des Spielers"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Spieler aus System</Label>
                  <Select 
                    value={formData.player_id || ""} 
                    onValueChange={(value) => {
                      handleChange('player_id', value);
                      const player = players.find(p => p.id === value);
                      if (player) {
                        handleChange('player_name', player.name);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Optional verknüpfen" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} ({player.position})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Aufnehmender Verein *</Label>
                  <Input
                    value={formData.receiving_club}
                    onChange={(e) => handleChange('receiving_club', e.target.value)}
                    placeholder="Neuer Verein"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Abgebender Verein</Label>
                  <Input
                    value={formData.releasing_club || ""}
                    onChange={(e) => handleChange('releasing_club', e.target.value)}
                    placeholder="Aktueller Verein"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Status *</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interesse">Interesse</SelectItem>
                      <SelectItem value="verhandlung">Verhandlung</SelectItem>
                      <SelectItem value="angebot_erhalten">Angebot erhalten</SelectItem>
                      <SelectItem value="medizincheck">Medizincheck</SelectItem>
                      <SelectItem value="vertragsunterzeichnung">Vertragsunterzeichnung</SelectItem>
                      <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                      <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                      <SelectItem value="pausiert">Pausiert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priorität</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="niedrig">Niedrig</SelectItem>
                      <SelectItem value="mittel">Mittel</SelectItem>
                      <SelectItem value="hoch">Hoch</SelectItem>
                      <SelectItem value="kritisch">Kritisch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Wahrscheinlichkeit (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability || ""}
                    onChange={(e) => handleChange('probability', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0-100"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label>Zuständige Personen</Label>
                <div className="mt-1.5">
                  <MultiUserSelect
                    selectedUsers={formData.assigned_to || []}
                    users={users}
                    onChange={(value) => handleChange('assigned_to', value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfer */}
        <TabsContent value="transfer" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transferdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Transferart</Label>
                  <Select value={formData.transfer_type} onValueChange={(value) => handleChange('transfer_type', value)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transfer (Ablöse)</SelectItem>
                      <SelectItem value="leihe">Leihe</SelectItem>
                      <SelectItem value="ablösefrei">Ablösefrei</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transferfenster</Label>
                  <Select value={formData.transfer_window || ""} onValueChange={(value) => handleChange('transfer_window', value)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Winter 2024/25">Winter 2024/25</SelectItem>
                      <SelectItem value="Sommer 2025">Sommer 2025</SelectItem>
                      <SelectItem value="Winter 2025/26">Winter 2025/26</SelectItem>
                      <SelectItem value="Sommer 2026">Sommer 2026</SelectItem>
                      <SelectItem value="Winter 2026/27">Winter 2026/27</SelectItem>
                      <SelectItem value="Sommer 2027">Sommer 2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.transfer_type === 'transfer' && (
                <div>
                  <Label>Ablösesumme (€)</Label>
                  <Input
                    type="number"
                    value={formData.transfer_fee || ""}
                    onChange={(e) => handleChange('transfer_fee', e.target.value ? Number(e.target.value) : null)}
                    placeholder="z.B. 5000000"
                    className="mt-1.5"
                  />
                </div>
              )}

              {formData.transfer_type === 'leihe' && (
                <div>
                  <Label>Leihgebühr (€)</Label>
                  <Input
                    type="number"
                    value={formData.loan_fee || ""}
                    onChange={(e) => handleChange('loan_fee', e.target.value ? Number(e.target.value) : null)}
                    placeholder="z.B. 500000"
                    className="mt-1.5"
                  />
                </div>
              )}

              <div>
                <Label>Zahlungsplan Ablöse</Label>
                <Textarea
                  value={formData.payment_schedule || ""}
                  onChange={(e) => handleChange('payment_schedule', e.target.value)}
                  placeholder="z.B. 50% sofort, 25% nach 6 Monaten, 25% nach 12 Monaten"
                  className="mt-1.5"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Erwartetes Abschlussdatum</Label>
                  <Input
                    type="date"
                    value={formData.expected_completion_date || ""}
                    onChange={(e) => handleChange('expected_completion_date', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Medizincheck</Label>
                  <Input
                    type="date"
                    value={formData.medical_check_date || ""}
                    onChange={(e) => handleChange('medical_check_date', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Vertragsunterzeichnung</Label>
                  <Input
                    type="date"
                    value={formData.contract_signing_date || ""}
                    onChange={(e) => handleChange('contract_signing_date', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vertrag */}
        <TabsContent value="contract" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Spielervertrag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Vertragslaufzeit (Jahre)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.contract_length || ""}
                    onChange={(e) => handleChange('contract_length', e.target.value ? Number(e.target.value) : null)}
                    placeholder="z.B. 3"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Vertragsbeginn</Label>
                  <Input
                    type="date"
                    value={formData.contract_start_date || ""}
                    onChange={(e) => handleChange('contract_start_date', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Vertragsende</Label>
                  <Input
                    type="date"
                    value={formData.contract_end_date || ""}
                    onChange={(e) => handleChange('contract_end_date', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Jahresgehalt Brutto (€)</Label>
                  <Input
                    type="number"
                    value={formData.annual_salary || ""}
                    onChange={(e) => handleChange('annual_salary', e.target.value ? Number(e.target.value) : null)}
                    placeholder="z.B. 1200000"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Monatsgehalt Brutto (€)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_salary || ""}
                    onChange={(e) => handleChange('monthly_salary', e.target.value ? Number(e.target.value) : null)}
                    placeholder="z.B. 100000"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Handgeld / Signing Bonus (€)</Label>
                  <Input
                    type="number"
                    value={formData.signing_bonus || ""}
                    onChange={(e) => handleChange('signing_bonus', e.target.value ? Number(e.target.value) : null)}
                    placeholder="z.B. 200000"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Ausstiegsklausel (€)</Label>
                  <Input
                    type="number"
                    value={formData.release_clause || ""}
                    onChange={(e) => handleChange('release_clause', e.target.value ? Number(e.target.value) : null)}
                    placeholder="z.B. 20000000"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label>Leistungsboni</Label>
                <Textarea
                  value={formData.performance_bonuses || ""}
                  onChange={(e) => handleChange('performance_bonuses', e.target.value)}
                  placeholder="z.B. 50.000€ pro 10 Einsätze, 100.000€ bei Meisterschaft..."
                  className="mt-1.5"
                  rows={3}
                />
              </div>

              <div>
                <Label>Sonstige Leistungen</Label>
                <Textarea
                  value={formData.other_benefits || ""}
                  onChange={(e) => handleChange('other_benefits', e.target.value)}
                  placeholder="z.B. Firmenwagen, Wohnung, Heimflüge..."
                  className="mt-1.5"
                  rows={2}
                />
              </div>

              <div>
                <Label>Bildrechte-Regelung</Label>
                <Textarea
                  value={formData.player_image_rights || ""}
                  onChange={(e) => handleChange('player_image_rights', e.target.value)}
                  placeholder="Regelung zu Bildrechten..."
                  className="mt-1.5"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Provision */}
        <TabsContent value="commission" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Beraterhonorar / Vermittlungsprovision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Art der Provision</Label>
                  <Select 
                    value={formData.agency_commission_type || "einmalig"} 
                    onValueChange={(value) => handleChange('agency_commission_type', value)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="einmalig">Einmalzahlung</SelectItem>
                      <SelectItem value="jährlich">Jährlich (über Vertragslaufzeit)</SelectItem>
                      <SelectItem value="prozent_gehalt">Prozent vom Gehalt</SelectItem>
                      <SelectItem value="prozent_ablöse">Prozent von Ablöse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {(formData.agency_commission_type === 'prozent_gehalt' || formData.agency_commission_type === 'prozent_ablöse') ? (
                  <div>
                    <Label>Provision in Prozent (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.agency_commission_percent || ""}
                      onChange={(e) => handleChange('agency_commission_percent', e.target.value ? Number(e.target.value) : null)}
                      placeholder="z.B. 10"
                      className="mt-1.5"
                    />
                  </div>
                ) : (
                  <div>
                    <Label>Provision (€)</Label>
                    <Input
                      type="number"
                      value={formData.agency_commission || ""}
                      onChange={(e) => handleChange('agency_commission', e.target.value ? Number(e.target.value) : null)}
                      placeholder="z.B. 500000"
                      className="mt-1.5"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Zahlungsplan Provision</Label>
                <Textarea
                  value={formData.agency_payment_schedule || ""}
                  onChange={(e) => handleChange('agency_payment_schedule', e.target.value)}
                  placeholder="z.B. 50% bei Unterschrift, 50% nach 6 Monaten"
                  className="mt-1.5"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="payment_received"
                    checked={formData.agency_payment_received || false}
                    onCheckedChange={(checked) => handleChange('agency_payment_received', checked)}
                  />
                  <Label htmlFor="payment_received" className="cursor-pointer">
                    Provision erhalten
                  </Label>
                </div>
                
                {formData.agency_payment_received && (
                  <div className="flex-1">
                    <Label>Zahlungsdatum</Label>
                    <Input
                      type="date"
                      value={formData.agency_payment_date || ""}
                      onChange={(e) => handleChange('agency_payment_date', e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dokumente */}
        <TabsContent value="documents" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dokumente & Notizen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Dokumente hochladen</Label>
                <div className="mt-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full border-dashed h-20"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {isUploading ? "Wird hochgeladen..." : "Dateien auswählen oder hierher ziehen"}
                      </span>
                    </div>
                  </Button>
                </div>
              </div>

              {formData.documents && formData.documents.length > 0 && (
                <div className="space-y-2">
                  <Label>Angehängte Dokumente</Label>
                  <div className="space-y-2">
                    {formData.documents.map((doc, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getFileIcon(doc.type)}</span>
                          <span className="text-sm font-medium text-slate-700">{doc.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(doc.url, '_blank')}
                            className="h-8 w-8"
                          >
                            <ExternalLink className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDocument(index)}
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Notizen</Label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Zusätzliche Notizen zum Deal..."
                  className="mt-1.5"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.title || !formData.player_name || !formData.receiving_club}
          className="bg-blue-900 hover:bg-blue-800"
        >
          {deal ? "Speichern" : "Deal erstellen"}
        </Button>
      </div>
    </div>
  );
}