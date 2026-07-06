import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Phone, Mail, Trash2, Pencil, UserCircle } from "lucide-react";

export default function ContactList({ contacts, onChange }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "" });

  const openNew = () => {
    setEditingContact(null);
    setForm({ name: "", role: "", phone: "", email: "" });
    setDialogOpen(true);
  };

  const openEdit = (contact) => {
    setEditingContact(contact);
    setForm(contact);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingContact) {
      onChange(contacts.map((c) => (c.id === editingContact.id ? { ...form, id: c.id } : c)));
    } else {
      onChange([...contacts, { ...form, id: Date.now().toString() }]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id) => {
    onChange(contacts.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">Ansprechpartner</h3>
        <Button size="sm" onClick={openNew} className="gap-1">
          <Plus className="w-4 h-4" /> Kontakt hinzufügen
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Noch keine Kontakte hinterlegt</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contacts.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <UserCircle className="w-8 h-8 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                    {c.role && <p className="text-xs text-slate-500">{c.role}</p>}
                    {c.phone && <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" />{c.phone}</p>}
                    {c.email && <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</p>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? "Kontakt bearbeiten" : "Neuer Kontakt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z.B. Max Mustermann" />
            </div>
            <div>
              <Label>Rolle / Funktion</Label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="z.B. Sportdirektor" />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="z.B. +49 123 456789" />
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="z.B. max@verein.de" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}