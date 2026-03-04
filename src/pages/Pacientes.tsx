import { useState } from 'react';
import { Patient } from '@/types';
import { usePatients } from '@/hooks/use-supabase-data';
import { useTrips } from '@/hooks/use-supabase-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const emptyPatient: Omit<Patient, 'id'> = { name: '', cpf: '', phone: '', address: '', notes: '' };

const Pacientes = () => {
  const { toast } = useToast();
  const { patients, save, update, remove } = usePatients();
  const { trips } = useTrips();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPatient);
  const [search, setSearch] = useState('');

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.cpf.includes(search)
  );

  const openNew = () => { setEditId(null); setForm(emptyPatient); setDialogOpen(true); };
  const openEdit = (p: Patient) => { setEditId(p.id); setForm(p); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.cpf) { toast({ title: 'Preencha nome e CPF', variant: 'destructive' }); return; }
    if (editId) {
      await update(editId, form);
    } else {
      await save(form);
    }
    setDialogOpen(false);
    toast({ title: editId ? 'Paciente atualizado' : 'Paciente cadastrado' });
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast({ title: 'Paciente excluído' });
  };

  const showHistory = (p: Patient) => { setHistoryPatient(p); setHistoryOpen(true); };
  const patientTrips = historyPatient ? trips.filter(t => t.passengers.some(p => p.patientId === historyPatient.id)) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Pacientes</h1><p className="text-sm text-muted-foreground">Cadastro e gestão de pacientes</p></div>
        <Button onClick={openNew} className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-1" /> Novo Paciente</Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou CPF" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead><TableHead>CPF</TableHead><TableHead className="hidden md:table-cell">Telefone</TableHead><TableHead className="hidden lg:table-cell">Obs</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.cpf}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.phone}</TableCell>
                  <TableCell className="hidden lg:table-cell max-w-[200px] truncate">{p.notes}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => showHistory(p)}><History className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum paciente encontrado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nome completo</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Endereço</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ex: cadeirante, necessita acompanhante" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Histórico — {historyPatient?.name}</DialogTitle></DialogHeader>
          {patientTrips.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma viagem registrada.</p> : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {patientTrips.map(t => (
                <div key={t.id} className="flex items-center justify-between border rounded p-2 text-sm">
                  <span>{t.date} — {t.destination}</span>
                  <Badge variant="outline">{t.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pacientes;
